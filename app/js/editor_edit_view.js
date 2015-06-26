/*jslint devel:true, node:true, nomen:true */
/*global ace */
// depends: editor.js

(function (editor) {
	"use strict";
	var edit_view = {},
		ace_editor = ace.edit("editor");
	
	ace_editor.setTheme("ace/theme/hpcpf");
	ace_editor.setReadOnly(true);

	/*
	ace_editor.on('change', function changeInput() {
		"use strict";
		if (ace_editor.session.getUndoManager().isClean()) {
			changeEditor(false);
		} else {
			changeEditor(true);
		}
	});
	*/

	function $(id) {
		return document.getElementById(id);
	}
	
	function changeEditor(state) {
		editor.edited = state;
		if (editor.openedfile === null) {
			$('filename').innerHTML = '-';
		} else {
			$('filename').innerHTML = editor.openedfile + (state === true ? " *" : "");
		}
	}
	
	ace_editor.on('input', function changeInput() {
		if (ace_editor.session.getUndoManager().isClean()) {
			changeEditor(false);
		} else {
			changeEditor(true);
		}
	});

	function executeProject() {
		$('button_execute_').onclick();
	}

	function stopProject() {
		$('button_stop_').onclick();
	}

	document.addEventListener('keypress', function (e) {
		//console.log(e.keyCode);
		// window.navigator.platform.match("Mac") ==> e.metaKey is commandKey

		if (e.keyCode === 18 && e.ctrlKey) { // R + ctrl
			editor.saveFile();
			executeProject();
			return false;
		}
		if (e.keyCode === 17 && e.ctrlKey) { // Q + ctrl
			stopProject();
			return false;
		}
		if (e.keyCode === 19 && e.ctrlKey) { // S + ctrl
			editor.saveFile();
			return false;
		}
	});

	document.addEventListener('keydown', function (e) {
		if (window.navigator.platform.match("Win")) {
			if (e.keyCode === 82 && e.ctrlKey) { // R + ctrl
				editor.saveFile();
				executeProject();
				e.preventDefault();
				return false;
			}
			if (e.keyCode === 81 && e.ctrlKey) { // Q + ctrl
				stopProject();
				e.preventDefault();
				return false;
			}
			if (e.keyCode === 83 && e.ctrlKey) { // S + ctrl
				editor.saveFile();
				e.preventDefault();
				return false;
			}
		}
	});

	function modeDefault() {
		ace_editor.setTheme("ace/theme/hpcpf");
		ace_editor.setKeyboardHandler("");
	}

	function modeVim() {
		ace_editor.setTheme("ace/theme/tomorrow_night_bright");
		ace_editor.setKeyboardHandler("ace/keyboard/vim");
	}

	function modeChange(modename) {
		if (modename === "vim") {
			modeVim();
			$('button_vimmode').value = "default";
			$('button_vimmode').innerHTML = "<span class='default_mode_text'>Default</span>";
		} else {
			modeDefault();
			$('button_vimmode').value = "vim";
			$('button_vimmode').innerHTML = "<span class='vim_mode_text'>Vim</span>";
		}
	}

	//-------------------------------


	function fileopen(filename, forceEdit) {
		ace_editor.setReadOnly(false);

		if (!forceEdit) {
			if (editor.openedfile === filename) {
				console.log("fileopen : same file");
				return;
			}
		}

		editor.openedfile = filename;
		console.log("Open:" + filename);
		ace_editor.setValue("");// clear
		changeEditor(false);
		editor.socket.emit('reqFileOpen', filename);
	}

	function fileselect(path) {
		console.log("fileselect : " + path);
		editor.socket.emit('reqSelectFile', path);
	}

	function launchApp(name, file) {
		editor.socket.emit('ptl_launchapp', {appname : name, file : file});
	}

	/*
	var soutputarea = false;
	function showOutputArea(forceshow){
		if (forceshow || !soutputarea) {
			$('outputArea').className = 'fadeIn';
			soutputarea = true;
		}else{
			$('outputArea').className = 'fadeOut';
			soutputarea = false;
		}
	}
	*/

	editor.socket.on('showfile', function (data) {
		//console.log(data.str, data.type);
		if (data.type !== "") {
			ace_editor.getSession().setMode("ace/mode/" + data.type.toString());
		}
		ace_editor.session.setValue(data.str.toString(), -1);// set cursor the start
		ace_editor.session.getUndoManager().reset(true);
		ace_editor.session.getUndoManager().markClean();
		changeEditor(false);
		$('imageArea').className = 'fadeOut';
		$('imageView').src = "";
		$('launchButtonArea').className = 'fadeOut';
		$('launchButtonView').src = "";
	});

	editor.socket.on('showfile_image', function (data) {
		ace_editor.setReadOnly(true);
		changeEditor(false);
		console.log("show_image");
		editor.hideEditArea();
		ace_editor.session.getUndoManager().reset(true);
		ace_editor.session.getUndoManager().markClean();
		$('imageArea').className = 'fadeIn';
		$('imageView').src = data;
		editor.openedfile = null;
		editor.clickedfile = null;
	});

	editor.socket.on('showfile_launchbutton', function (appnames, dir, filename) {
		var apparea,
			name,
			button,
			i;
		console.log('showfile_launchbutton');
		ace_editor.setReadOnly(true);
		changeEditor(false);
		$('launchButtonArea').className = 'fadeIn';

		// create launch app buttons
		apparea = $("launchButtonView");
		while (apparea.firstChild) {
			apparea.removeChild(apparea.firstChild);
		}
		function buttonClick() {
			launchApp(name, dir + filename);
		}
		for (i in appnames) {
			if (appnames.hasOwnProperty(i)) {
				name = appnames[i];
				button = document.createElement("button");
				button.setAttribute('type', 'button');
				button.setAttribute('class', 'button_editor_launchapp');
				button.onclick = buttonClick;
				button.innerHTML = "<span class='text_button_launchapp'>Open " + name + "</span>";
				apparea.appendChild(button);
			}
		}
		// create edit button
		button = document.createElement("button");
		button.setAttribute('type', 'button');
		button.setAttribute('class', 'button_editor_launchapp');
		button.onclick = function () {
			fileopen(filename, true);
		};
		button.innerHTML = "<span class='text_button_launchapp'>Edit text</span>";
		apparea.appendChild(button);
		editor.openedfile = filename;
		changeEditor(false);
	});

	editor.socket.on('fileopen', function (data) {
		console.log("fileopen : " + data);
		fileopen(data);
	});

	function getFileList() {
		editor.socket.emit('reqFileList');
	}
	
	window.editor_edit_view = edit_view;
	window.editor_edit_view.ace_editor = ace_editor;
	window.editor_edit_view.fileselect = fileselect;
	window.editor_edit_view.changeEditor = changeEditor;
	window.editor_edit_view.modeChange = modeChange;
}(window.editor));