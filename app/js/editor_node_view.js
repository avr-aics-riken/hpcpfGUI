/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor) {
	"use strict";
	var nui, // node ui
		nodeListTable,
		instance_no = 1;
	
	function $(id) {
		return document.getElementById(id);
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	function addNode(nodename, nx, ny) {
		var node = nodeListTable[nodename],
			instNode,
			nodeData;
		if (!node) {
			return;
		}
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
	
	editor.socket.on('connect', function () {
	});
	
	editor.socket.on('init', function () {
		var draw = SVG('nodecanvas');
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.nodeClickEvent(function () {
			console.log("node cliecked");
		});
		nui.nodeDeleteEvent(function () {
			console.log("node deleted");
		});
		
		nodeListTable = {
			CreateCamera : {
				"name": "CreateCamera",
				"funcname": "CreateCamera",
				"info": "カメラをつくるためのノード",
				"pos": [100, 100],
				"varname": "instCreateCamera",
				"customfuncfile": "createcamera.lua",
				"input": [
					{"name": "position", "type": "vec3", "value": [0, 0, 300]},
					{"name": "target", "type": "vec3", "value": [0, 0, 0]},
					{"name": "up", "type": "vec3", "value": [0, 1, 0]},
					{"name": "fov", "type": "float", "value": 60},
					{"name": "screensize", "type": "vec2", "value": [512, 512]},
					{"name": "filename", "type": "string", "value": "output.jpg"}
				],
				"output": [
					{"name": "camera", "type": "RenderObject"}
				]
			}
		};
		
		addNode("CreateCamera", 500, 500);
	});
	
}(window.editor));
