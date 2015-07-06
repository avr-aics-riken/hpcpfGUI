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
	
	function makeItemNode(name, text, top) {
		var itemNode = document.createElement('div'),
			nameNode = document.createElement('div'),
			textNode = document.createElement('div');

		itemNode.classList.add('nodePropertyRow');
		nameNode.innerHTML = name;
		textNode.innerHTML = text;
		nameNode.classList.add('nodePropertyName');
		textNode.classList.add('nodePropertyConst');
		if (top) {
			nameNode.classList.add('nodePropertyTop');
			textNode.classList.add('nodePropertyTop');
		}
		itemNode.appendChild(nameNode);
		itemNode.appendChild(textNode);
		return itemNode;
	}
	
	function makeItemTextNode(name, text, node, type) {
		var itemNode = document.createElement('div'),
			nameNode = document.createElement('div'),
			textNode = document.createElement('input');
		if (type) {
			textNode.setAttribute('type', type);
		} else {
			textNode.setAttribute('type', 'text');
		}
		itemNode.classList.add('nodePropertyRow');
		nameNode.innerHTML = '[' + name + ']';
		textNode.value = text;
		nameNode.classList.add('nodePropertyName');
		textNode.classList.add('nodePropertyText');
		itemNode.appendChild(nameNode);
		itemNode.appendChild(textNode);
		
		/*
		textNode.addEventListener('keyup', (function (nodeData, txt) {
			return function (e) {
				nodeData.value = txt.value;
			};
		}(node, textNode)));
		*/
		return itemNode;
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

	function updateNodeList(lst, txtval) {
		var i, name, visible, item;
		lst.innerHTML = ''; // clear
		for (i in nodeListTable) {
			if (nodeListTable.hasOwnProperty(i)) {
				//console.log(nodeListTable[i]);
				name = nodeListTable[i].name;
				visible = nodeListTable[i].visible;
				
				if ((txtval === '' || name.toLowerCase().indexOf(txtval.toLocaleLowerCase()) >= 0) && visible !== false) {
					item = document.createElement('option');
					item.setAttribute('value', name);
					item.appendChild(document.createTextNode(name));
					lst.appendChild(item);
				}
			}
		}
	}
	
	function createNodeList() {
		var tray = document.createElement('div'),
			addbtn = document.createElement('div'),
			txt = document.createElement('input'),
			lst = document.createElement('select'),
			item,
			name,
			i,
			width = '100%';
		
		//addbtn.addEventListener('click', buttonAdd(lst, addcallback, mx, my));
		addbtn.classList.add('menuButtonClass');
		addbtn.classList.add('noneselect');
		addbtn.classList.add('AddButton');
		addbtn.innerHTML = 'Add';
		tray.appendChild(addbtn);
		tray.appendChild(txt);
		tray.appendChild(document.createElement('div'));
		tray.appendChild(lst);
		txt.setAttribute('type', 'input');
		txt.setAttribute('placeholder', 'filter...');
		txt.style.width = width;
		lst.style.width = width;
		lst.setAttribute('size', 15);
		lst.setAttribute('name', 'NodeList');
		
		txt.timer    = null;
		txt.prev_val = txt.value;
		txt.new_val  = '';
		txt.addEventListener("blur", (function (lst, txt) {
			return function () {
				window.clearInterval(txt.timer);
			};
		}(lst, txt)), false);
		
		updateNodeList(lst, '');
		
		return tray;
	}
	
	function updatePropertyDebug(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr;

		property.innerHTML = "";
		
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				value = nodeData[key];
				
				property.appendChild(makeItemNode(key, "", true));
				
				if (key === 'input' || key === 'output') {
					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									ioval2 = ioval[iokey2];
									property.appendChild(makeItemNode(iokey2, ioval2));
								}
							}
						}
					}
				} else {
					property.appendChild(makeItemNode(key, value));
				}
			}
		}
	}
	
	function updateProperty(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr;

		property.innerHTML = "";
		property.appendChild(makeItemNode('Property Name', 'Value', true));
		
		if (nodeData.hasOwnProperty('name')) {
			value = nodeData['name'];
			property.appendChild(makeItemNode('name', value));
		}
		if (nodeData.hasOwnProperty('varname')) {
			value = nodeData['varname'];
			property.appendChild(makeItemNode('varname', value));
		}
		
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				if (key === 'input') {
					value = nodeData[key];

					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							if (ioval.hasOwnProperty('name')) {
								iokey2 = 'Input';
								ioval2 = ioval['name'];
								property.appendChild(makeItemNode(iokey2, ioval2, true));
							}
							for (iokey2 in ioval) {
								if (iokey2 !== 'name') {
									if (ioval.hasOwnProperty(iokey2)) {
										ioval2 = ioval[iokey2];
										property.appendChild(makeItemNode(iokey2, ioval2));
									}
								}
							}
						}
					}
				}
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
			//updatePropertyDebug(nodeData);
			updateProperty(nodeData);
		});
		nui.nodeDeleteEvent(function (data) {
			var node = nui.getNode(data.varname);
			node.erase();
		});
		
		document.getElementById('nodeList').appendChild(createNodeList());
		
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
