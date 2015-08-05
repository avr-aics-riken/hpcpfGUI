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
		cleanButton = $('button_clean'),
		executeProject,
		dryrunProject,
		cleanProject;
	
	
	function clearOutput() {
		$('exe_log').innerHTML = '';
	}
	
	function runWorkflow() {
		var targetFile = "pwf.lua";
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
			runFunc(function (script) {
				if (editor.getCurrentViewType() !== editor.ViewTypes.node) {
					editor.showExeView();
				}
				window.editor_edit_view.openedfile = "";
				window.editor_edit_view.clickedfile = "";
				console.log("procRun");
				clearOutput();
				
				editor.socket.emit('runWorkflow', script);
				executeButton.onclick = stopProject;
				executeButton.style.backgroundImage = stopButtonURL;
				executeButton.title = stopButtonTitle;
			});
		};
		
		if (editor.getCurrentViewType() === editor.ViewTypes.edit) {
			editor.saveFile(function () {
				exec(window.node_edit_view.executeWorkflow);
			});
		} else {
			exec(window.node_edit_view.executeWorkflow);
		}
	};
	
	dryrunProject = function () {
		var exec = function (runFunc) {
			runFunc(function (script) {
				if (editor.getCurrentViewType() !== editor.ViewTypes.node) {
					editor.showExeView();
				}
				window.editor_edit_view.openedfile = "";
				window.editor_edit_view.clickedfile = "";
				console.log("procRun");
				clearOutput();
				
				editor.socket.emit('runWorkflow', script);
				executeButton.onclick = stopProject;
				executeButton.style.backgroundImage = stopButtonURL;
				executeButton.title = stopButtonTitle;
			});
		};
		
		if (editor.getCurrentViewType() === editor.ViewTypes.edit) {
			editor.saveFile(function () {
				exec(window.node_edit_view.dryrunWorkflow);
			});
		} else {
			exec(window.node_edit_view.dryrunWorkflow);
		}
		
	};
	
	cleanProject = function () {
		window.node_edit_view.cleanWorkflow(function () {
			editor.closeDirectoryFunc();
		});
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
		cleanButton.onclick = cleanProject;
		//$('button_stop_').onclick = stopProject;
	});
	
	window.node_exe_view = {};
	window.node_exe_view.isExecuting = function () {
		return executeButton.style.backgroundImage === stopButtonURL;
	};
	
}(window.editor));
