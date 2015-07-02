/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor) {
	"use strict";
	var nui, // node ui
		nodeList,
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
			nodeList = nodeData.nodeData,
			i;
		for (i = 0; i < nodeList.length; i = i + 1) {
			if (nodeList[i].varname === node.varname) {
				nodeList.splice(i, 1);
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
		} else if (type === "RenderObject") {
			return "#ad3b78";
		} else if (type === "Uniform") {
			return "#b19e14";
		} else if (type === "BufferMeshData") {
			return "#be1656";
		} else if (type === "BufferPointData") {
			return "#e023e0";
		} else if (type === "BufferLineData") {
			return "#20cae0";
		} else if (type === "BufferVolumeData") {
			return "#17d042";
		} else if (type === "Any") {
			return "#ef8815";
		} else { // Object
			return "#c12417";
		}
	}
	
	function storeNodeList(nodes, callback) {
		var i;
		// store node list
		nodeList = nodes;
		
		console.log("nodeList", nodes);
		// sort list
		if (!nodeList) {
			console.log("Not found node list");
			return;
		}
		nodeList.sort(
			function (a, b) {
				return a.name > b.name;
			}
		);

		// create nodelist table
		nodeListTable = {};
		for (i = 0; i < nodeList.length; i = i + 1) {
			nodeListTable[nodeList[i].varname] = nodeList[i];
		}

		console.log(nodeListTable);
		
		if (callback) {
			callback();
		}
	}
	
	function reloadNodeList(url, callback) {
		var req = new XMLHttpRequest(),
			now = new Date();
		req.open('GET', url + "?&timestamp=" + now.getTime());
		
		req.send();
		req.addEventListener("load", (function (req, callback) {
			return function (ev) {
				var resp = req.responseText;
				storeNodeList(resp, callback);
			};
		}(req, callback)));
	}
	
	editor.socket.on('connect', function () {
	});
	
	function test_lua() {
		console.log("test_lua:", nui.exportLua());
	}
	
	editor.socket.on('init', function () {
		var draw = SVG('nodecanvas'),
			propertyTab;
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.nodeClickEvent(function () {
			console.log("node cliecked");
		});
		nui.nodeDeleteEvent(function (data) {
			var node = nui.getNode(data.varname);
			node.erase();
		});
		
		editor.socket.emit('reqReloadNodeList');
		editor.socket.on('reloadNodeList', function (data) {
			storeNodeList(JSON.parse(data), function () {
				var headerNode = null,
					footerNode = null;
				
				addNode("Case", "Case01", 500, 100);
				addNode("Case", "Case02", 500, 200);
				addNode("Case", "ffv_cyl_new", 500, 100);
				addNode("krenderCASE", "krenderCASE1", 500, 100);
				addNode("krenderCASE", "krenderCASE2", 500, 150);
				addNode("RemoteSetting", "RemoteSetting", 500, 100);
				
				if (nodeListTable.hasOwnProperty('headerNode')) {
					nui.setHeaderCode(headerNode.customfunc);
				}
				if (nodeListTable.hasOwnProperty('footerNode')) {
					nui.setFooterCode(footerNode.customfunc);
				}
				
				test_lua();
				//clearProperty()
			});
		});
		
		propertyTab = window.animtab.create('right', {
			'rightTab' : { min : '0px', max : 'auto' }
		}, {
			'nodePropertyTab' : { min : '0px', max : '200px' }
		}, 'property');
		propertyTab(false);
		
		
	});
	
	window.node_edit_view = edit_view;
	window.node_edit_view.test_lua = test_lua;
	
}(window.editor));
