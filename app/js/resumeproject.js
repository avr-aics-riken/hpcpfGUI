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
	
	function resumeExecute(projectPath) {
		return function (evt) {
			var encoded = encodeURIComponent(projectPath);
			//updateProjectList();
			console.log("resumeExecute");
			window.open("editor.html?" + encoded, "_blank");
		}
	}
	
	function resumeStop(projectName) {
		return function (evt) {
			
		}
	}
	
	function addRow(name, status) {
		var list = document.getElementById('resumeList'),
			row = document.createElement('div'),
			button = document.createElement('button'),
			text = document.createElement('span');
		
		if (status === "Running") {
			button.className = "button_resume_stop";
			button.id = "button_resume_stop";
			button.onclick = resumeStop(name);
		} else {
			button.className = "button_resume_execute";
			button.id = "button_resume_execute";
			button.onclick = resumeExecute(name);
		}
		
		text.innerHTML = "status:" + status + "   name:" + name;
		row.appendChild(button);
		row.appendChild(text);
		list.appendChild(row);
	}
	
	function init() {
		var list = document.createElement('div'),
			projectList = document.getElementById('projectlist');
	
		socket.emit('reqGetProjectList');
		list.id = "resumeList";
		list.className = "resumeList";
		projectList.appendChild(list);
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
