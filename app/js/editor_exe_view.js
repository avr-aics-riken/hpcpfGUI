/*jslint devel:true, node:true, nomen:true */
/*global $, socket, showStoppedMessage*/
// depends: editor.js

(function () {
	"use strict";
	
	var playButtonURL = "url(../image/button_bg_action_play.png)",
		playButtonTitle = "Run (CTRL+R)",
		stopButtonTitle = "Stop (CTRL+Q)",
		stopButtonURL = "url(../image/button_bg_action_stop.png)",
		executeButton = $('button_execute_');
	
	function clearOutput() {
		$('exe_log').innerHTML = '';
	}
	
	function runWorkflow() {
		var targetFile = "pwf.lua";

		window.editor_edit_view.openedfile = "";
		window.editor_edit_view.clickedfile = "";
		console.log("procRun");

		clearOutput();
		socket.emit('run', {file: targetFile});
	}

	function stopWorkflow() {
		console.log("stop");
		socket.emit('stop');
		socket.once('stopdone', function (success) {
			console.log("stopdone");
			showStoppedMessage();
			executeButton.style.backgroundImage = playButtonURL;
			executeButton.title = playButtonTitle;
			executeButton.onclick = executeProject;
		});
	}

	function stopProject() {
		showExeView();
		stopWorkflow();
	}
	
	function executeProject() {
		var exec = function () {
			showExeView();
			runWorkflow();
			executeButton.onclick = stopProject;
			executeButton.style.backgroundImage = stopButtonURL;
			executeButton.title = stopButtonTitle;
		};
		if (window.editor_edit_view.edited) {
			saveFile(function () {
				exec();
			});
		} else {
			exec();
		}
	}

	socket.on('connect', function () {
	});

	socket.on('stdout', function (data) {
		var s = $('exe_log'),
			area = $('exe_log_area');
		s.innerHTML += data.toString() + '</br>';
		//s.scrollTop = s.scrollHeight;
		area.scrollTop = area.scrollHeight;
	});

	socket.on('stderr', function (data) {
		var s = $('exe_log'),
			area = $('exe_log_area');
		s.innerHTML += data.toString();
		
		//s.scrollTop = s.scrollHeight;
		area.scrollTop = area.scrollHeight;
	});

	socket.on('exit', function () {
		executeButton.style.backgroundImage = playButtonURL;
		executeButton.title = playButtonTitle;
		executeButton.onclick = executeProject;
	});
	
	socket.on('init', function () {
		executeButton.onclick = executeProject;
		//$('button_stop_').onclick = stopProject;
	});
	
}());
