/*jslint devel:true*/
/*global $, socket, showStoppedMessage*/
// depends: editor.js

(function () {
	"use strict";

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
			if (success) {
				showStoppedMessage();
			}
		});
	}

	function executeProject() {
		showExeView();
		runWorkflow();
	}

	function stopProject() {
		showExeView();
		stopWorkflow();
	}
	
	socket.on('init', function () {
		$('button_execute_').onclick = executeProject;
		$('button_stop_').onclick = stopProject;
	});
	
}());
