/*jslint devel:true, node:true, nomen:true */
/*global io */

(function () {
	"use strict";
	var socket = io.connect(),
		resumeproject = {};
	
	
	function clear() {
		var resumeList = document.getElementById('resumeList');
		resumeList.innerHTML = "";
	}
	
	function addRow(name, status) {
		var list = document.getElementById('resumeList'),
			row = document.createElement('div');

		row.innerHTML = "status:" + status + "   name:" + name;
		list.appendChild(row);
	}
	
	function init() {
		var list = document.createElement('div'),
			projectList = document.getElementById('projectlist');
	
		socket.emit('reqGetProjectList');
		list.id = "resumeList";
		list.className = "resumeList";
		projectList.appendChild(list);
		addRow("hogehoge", "test");
	}
	
	socket.on('getProjectList', function (datastr) {
		var data,
			i,
			name,
			status;
		
		try {
			clear();
			data = JSON.parse(datastr);
			for (i in data) {
				if (data.hasOwnProperty(i)) {
					name = i;
					status = data[i];
					addRow(name, status);
				}
			}
		} catch (e) {
			console.error(e);
		}
	});
	
	window.resumeproject = resumeproject;
	window.resumeproject.init = init;
}());
