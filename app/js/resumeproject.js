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
	
	function openProject(projectPath) {
		return function (evt) {
			var encoded = encodeURIComponent(projectPath);
			window.open("editor.html?" + encoded, "_blank");
		};
	}
	
	function addRow(name, path, status) {
		var list = document.getElementById('resumeList'),
			row = document.createElement('div'),
			button = document.createElement('button'),
			text = document.createElement('span'),
			text2 = document.createElement('span'),
			openButton = document.createElement('button'),
			openButtonLabel = document.createElement('span');
		
		if (status === "Running" || status === "Running(Dry)") {
			button.className = "button_status_running";
			button.id = "button_status_running";
		} else if (status === "Ready" || status === "Ready(Dry)") {
			button.className = "button_status_ready";
			button.id = "button_status_ready";
		} else if (status === "Finished" || status === "Finished(Dry)") {
			button.className = "button_status_finished";
			button.id = "button_status_finished";
		} else if (status === "Failed" || status === "Failed(Dry)") {
			button.className = "button_status_failed";
			button.id = "button_status_failed";
		}
		openButton.className = "button_resume_open";
		openButton.onclick = openProject(path);
		openButtonLabel.innerHTML = "Open";
		openButtonLabel.className = "button_resume_open_label";
		openButton.appendChild(openButtonLabel);
		
		text.innerHTML =  ":" + status;
		text2.innerHTML = "Name:" + name;
		text2.className = "projectDirName";
		row.appendChild(button);
		row.appendChild(text);
		row.appendChild(openButton);
		row.appendChild(text2);
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
			path,
			status;
		
		try {
			clear();
			data = JSON.parse(datastr);
			for (i in data) {
				if (data.hasOwnProperty(i)) {
					name = i;
					status = data[i].status;
					path = data[i].path;
					if (path[path.length - 1] === "/") {
						path = path.substr(0, (path.length - 1));
					}
					addRow(name, path, status);
				}
			}
		} catch (e) {
			console.error(e);
		}
	});
	
	window.resumeproject = resumeproject;
	window.resumeproject.init = init;
}());
