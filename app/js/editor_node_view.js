/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor) {
	"use strict";
	var nui, // node ui
		nodeListTable,
		instance_no = 1,
		edit_view = {};
	
	function $(id) {
		return document.getElementById(id);
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	function addNode(nodename, nodeName, nx, ny) {
		var node = nodeListTable[nodename],
			instNode,
			nodeData;
		if (!node) {
			return;
		}
		node.name = nodeName;
		node.varname = nodeName;
		nodeData = nui.getNodeData();
		instNode = clone(node);
		//console.log(instNode);
		nodeData.nodeData.push(instNode);
		instNode.varname = instNode.varname + instance_no;
		instance_no += 1;
		if (nx !== undefined && ny !== undefined) {
			instNode.pos[0] = nx;
			instNode.pos[1] = ny;
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function deleteNode(node) {
		console.log('DELETE:', node);
		
		var nodeData = nui.getNodeData(),
			data = nodeData.nodeData,
			i;
		for (i = 0; i < data.length; i = i + 1) {
			if (data[i].varname === node.varname) {
				data.splice(i, 1);
			}
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function clearNode() {
		var nodeData;
		nui.clearNodes();
		nodeData = nui.getNodeData();
		document.getElementById("property").innerHTML = '';
	}
	
	function updateNode() {
		var nodeData = nui.getNodeData();
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function colorFunction(type) {
		if (type === "string") {
			return "#14a271";
		} else if (type === "float") {
			return "#139aa5";
		} else if (type === "vec4") {
			return "#1b6ad6";
		} else if (type === "vec3") {
			return "#566f9f";
		} else if (type === "vec2") {
			return "#8222a7";
		} else if (type === "initial_data") {
			return "#ad3b78";
		} else if (type === "geometry") {
			return "#b19e14";
		} else if (type === "Any") {
			return "#be1656";
		} else if (type === "volume") {
			return "#e023e0";
		} else if (type === "target_machine") {
			return "#20cae0";
		} else if (type === "geometory") {
			return "#17d042";
		} else if (type === "Any") {
			return "#ef8815";
		} else { // Object
			return "#c12417";
		}
	}
	
	function storeNodeList(nodes, callback) {
		var i;
		nodes.sort(
			function (a, b) {
				return a.name > b.name;
			}
		);

		// create nodelist table
		nodeListTable = {};
		for (i = 0; i < nodes.length; i = i + 1) {
			nodeListTable[nodes[i].varname] = nodes[i];
		}

		console.log(nodeListTable);
		
		if (callback) {
			callback(nodes);
		}
	}
	
	function updateProperty(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			div,
			divkey,
			divval,
			iokey,
			ioval,
			diviokey,
			divioval,
			iokey2,
			ioval2,
			hr;
		//console.log(nodeData);
		property.innerHTML = "";
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				value = nodeData[key];
				div = document.createElement('div');
				divkey = document.createElement('div');
				divkey.innerHTML = key;
				divkey.className = 'nodeKey';
				divval = document.createElement('div');
				divval.className = 'nodeValue';
				
				if (key === 'input' || key === 'output') {
					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									ioval2 = ioval[iokey2];
									diviokey = document.createElement('div');
									diviokey.innerHTML = iokey2;
									diviokey.className = 'nodeKey2';
									divioval = document.createElement('div');
									divioval.innerHTML = ioval2;
									divioval.className = 'nodeValue';
									divval.appendChild(diviokey);
									divval.appendChild(divioval);
								}
							}
							hr = document.createElement('hr');
							hr.className = "innerHr";
							divval.appendChild(hr);
						}
					}
				} else {
					divval.innerHTML = value;
				}
				div.appendChild(divkey);
				div.appendChild(divval);
				property.appendChild(div);
				property.appendChild(document.createElement('hr'));
			}
		}
	}
	
	editor.socket.on('connect', function () {
	});
	
	function test_lua() {
		console.log("test_lua:", nui.exportLua());
	}
	
	editor.socket.on('init', function () {
		var draw = SVG('nodecanvas'),
			propertyTab,
			pos = { x : 0, y : 0 },
			onMiddleButtonDown = false;
		
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.nodeClickEvent(function (nodeData) {
			console.log("node cliecked");
			updateProperty(nodeData);
		});
		nui.nodeDeleteEvent(function (data) {
			var node = nui.getNode(data.varname);
			node.erase();
		});
		
		editor.socket.emit('reqReloadNodeList');
		editor.socket.on('reloadNodeList', function (systemNodeList, caseNodeList) {
			storeNodeList(JSON.parse(systemNodeList), function (nodes) {
				addNode("Render", "hrender", 100, 100);
				addNode("Render", "hrender", 100, 100);
				addNode("File", "File", 200, 100);
				addNode("File", "File", 200, 100);
			});
			storeNodeList(JSON.parse(caseNodeList), function (nodes) {
				var headerNode = null,
					footerNode = null,
					i;
				
				console.log(nodes);
				for (i = 0; i < nodes.length; i = i + 1) {
					console.log(nodes[i].varname);
					addNode(nodes[i].varname, nodes[i].name, 300, 100);
				}
				
				if (nodeListTable.hasOwnProperty('headerNode')) {
					nui.setHeaderCode(headerNode.customfunc);
				}
				if (nodeListTable.hasOwnProperty('footerNode')) {
					nui.setFooterCode(footerNode.customfunc);
				}
				
				//test_lua();
				//clearProperty()
			});
		});
		
		propertyTab = window.animtab.create('right', {
			'rightTab' : { min : '0px', max : 'auto' }
		}, {
			'nodePropertyTab' : { min : '0px', max : '200px' }
		}, 'property');
		propertyTab(false);
		
		
		document.getElementById('node_area').onmousedown = function (evt) {
			onMiddleButtonDown = (evt.button === 1);
			if (onMiddleButtonDown) {
				evt.preventDefault();
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmousemove = function (evt) {
			var mx, my;
			if (onMiddleButtonDown) {
				evt.preventDefault();
				mx = evt.pageX - pos.x;
				my = evt.pageY - pos.y;
				nui.moveAll(mx, my);
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmouseup = function (evt) {
			onMiddleButtonDown = false;
		};
		
	});
	
	window.node_edit_view = edit_view;
	window.node_edit_view.test_lua = test_lua;
	
}(window.editor));
