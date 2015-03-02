/*jslint devel:true*/
/*global $, socket, showStoppedMessage*/
// depends: editor.js

(function () {
	"use strict";
	
	var playButtonURL = "url(../image/button_bg_action_play.png)",
		playButtonTitle = "Run (CTRL+R)",
		stopButtonTitle = "Stop (CTRL+Q)",
		stopButtonURL = "url(../image/button_bg_action_stop.png)",
		executeButton = $('button_execute_');

	socket.on('connect', function () {
	});

	socket.on('stdout', function (data) {
		var s = $('exe_log');
		s.innerHTML += data.toString() + '</br>';
		s.scrollTop = s.scrollHeight;
	});

	socket.on('stderr', function (data) {
		var s = $('exe_log');
		s.innerHTML += data.toString();
		s.scrollTop = s.scrollHeight;
	});

	function clearOutput() {
		$('exe_log').innerHTML = '';
	}
	
	socket.on('exit', function () {
		executeButton.style.backgroundImage = playButtonURL;
		executeButton.title = playButtonTitle;
		executeButton.onclick = executeProject;
	});
	
	function runWorkflow() {
		var targetFile = "pwf.lua";

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

	function executeProject() {
		showExeView();
		runWorkflow();
		executeButton.onclick = stopProject;
		executeButton.style.backgroundImage = stopButtonURL;
		executeButton.title = stopButtonTitle;
	}

	function stopProject() {
		showExeView();
		stopWorkflow();
	}
	
	socket.on('init', function () {
		executeButton.onclick = executeProject;
		//$('button_stop_').onclick = stopProject;
	});
	
}());
