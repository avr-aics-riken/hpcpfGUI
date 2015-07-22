/*jslint devel:true, node:true, nomen:true */
// depends: editor.js

(function (editor) {
	"use strict";
	
	function $(id) {
		return document.getElementById(id);
	}
	
	var playButtonURL = "url(../image/button_bg_action_play.png)",
		playButtonTitle = "Run (CTRL+R)",
		stopButtonTitle = "Stop (CTRL+Q)",
		stopButtonURL = "url(../image/button_bg_action_stop.png)",
		executeButton = $('button_execute_'),
		dryrunButton = $('button_dryrun'),
		executeProject,
		dryrunProject;
	
	
	function clearOutput() {
		$('exe_log').innerHTML = '';
	}
	
	function runWorkflow() {
		var targetFile = "pwf.lua";

		window.editor_edit_view.openedfile = "";
		window.editor_edit_view.clickedfile = "";
		console.log("procRun");

		clearOutput();
		editor.socket.emit('run', {file: targetFile});
	}

	function stopWorkflow() {
		console.log("stop");
		editor.socket.emit('stop');
		editor.socket.once('stopdone', function (success) {
			console.log("stopdone");
			editor.showStoppedMessage();
			executeButton.style.backgroundImage = playButtonURL;
			executeButton.title = playButtonTitle;
			executeButton.onclick = executeProject;
		});
	}

	function stopProject() {
		editor.showExeView();
		stopWorkflow();
	}
	
	executeProject = function () {
		var exec = function (runFunc) {
			editor.showExeView();
			runFunc(function (script) {
				editor.socket.emit('runWorkflow', script);
				executeButton.onclick = stopProject;
				executeButton.style.backgroundImage = stopButtonURL;
				executeButton.title = stopButtonTitle;
			});
		};
		if (window.editor_edit_view.edited) {
			editor.saveFile(function () {
				if (editor.getCurrentViewType() !== editor.ViewTypes.node) {
					exec(runWorkflow);
				} else {
					exec(window.node_edit_view.executeWorkflow);
				}
			});
		} else {
			if (editor.getCurrentViewType() !== editor.ViewTypes.node) {
				exec(runWorkflow);
			} else {
				exec(window.node_edit_view.executeWorkflow);
			}
		}
	};
	
	dryrunProject = function () {
		var exec = function (runFunc) {
			editor.showExeView();
			runFunc(function (script) {
				editor.socket.emit('runWorkflow', script);
				executeButton.onclick = stopProject;
				executeButton.style.backgroundImage = stopButtonURL;
				executeButton.title = stopButtonTitle;
			});
		};
		exec(window.node_edit_view.dryrunWorkflow);
	};

	editor.socket.on('connect', function () {
	});

	editor.socket.on('stdout', function (data) {
		var s = $('exe_log'),
			area = $('exe_log_area');
		s.innerHTML += data.toString() + '</br>';
		//s.scrollTop = s.scrollHeight;
		area.scrollTop = area.scrollHeight;
	});

	editor.socket.on('stderr', function (data) {
		var s = $('exe_log'),
			area = $('exe_log_area');
		s.innerHTML += data.toString();
		
		//s.scrollTop = s.scrollHeight;
		area.scrollTop = area.scrollHeight;
	});

	editor.socket.on('exit', function () {
		executeButton.style.backgroundImage = playButtonURL;
		executeButton.title = playButtonTitle;
		executeButton.onclick = executeProject;
	});
	
	editor.socket.on('init', function () {
		executeButton.onclick = executeProject;
		dryrunButton.onclick = dryrunProject;
		//$('button_stop_').onclick = stopProject;
	});
	
}(window.editor));
