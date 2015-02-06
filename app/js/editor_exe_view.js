/*jslint devel:true*/
/*global $, socket, clearOutput, showStoppedMessage*/
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

	function clearOutput() {
		$('exe_log').innerHTML = '';
	}

}());