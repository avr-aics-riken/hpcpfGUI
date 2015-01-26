// depends: editor.js

var editor = ace.edit("editor");
editor.setTheme("ace/theme/tomorrow_night_bright");
editor.setReadOnly(true);
editor.on('change',	function changeInput() {
	if (editor.session.getUndoManager().isClean())
		ChangeEditor(false);
	else
		ChangeEditor(true);
});

document.addEventListener('keypress', function(e){
	//console.log(e.keyCode);
	// window.navigator.platform.match("Mac") ==> e.metaKey is commandKey
	
	if (e.keyCode == 18 && e.ctrlKey){ // R + ctrl
		saveFile();
		procRun();
		return false;
	}
	if (e.keyCode == 17 && e.ctrlKey){ // Q + ctrl
		procStop();
		return false;
	}
	if (e.keyCode == 19 && e.ctrlKey){ // S + ctrl
		saveFile();
		return false;
	}
});

document.addEventListener('keydown', function(e) {
	if (window.navigator.platform.match("Win")) {
		if (e.keyCode == 82 && e.ctrlKey){ // R + ctrl
			saveFile();
			procRun();
			e.preventDefault();
			return false;
		}
		if (e.keyCode == 81 && e.ctrlKey){ // Q + ctrl
			procStop();
			e.preventDefault();
			return false;
		}
		if (e.keyCode == 83 && e.ctrlKey){ // S + ctrl
			saveFile();
			e.preventDefault();
			return false;
		}
	}
});

function modeXcode() {
	editor.setTheme("ace/theme/tomorrow_night_bright");
	editor.setKeyboardHandler("");
}

function modeVim() {
	editor.setTheme("ace/theme/vibrant_ink");
	editor.setKeyboardHandler("ace/keyboard/vim");
}

function modeChange(modename){
	if (modename == "vim"){
		modeVim();
		$('button_editmode').value = "xcode";
		$('button_editmode').innerHTML = "Xcode Mode";
	}else{
		modeXcode();
		$('button_editmode').value = "vim";
		$('button_editmode').innerHTML = "Vim Mode";
	}
}

//-------------------------------

var openedfile = null;
var edited = false;

function ChangeEditor(state){
	edited = state;
	if (openedfile === null)
		$('filename').innerHTML = '-';
	else
		$('filename').innerHTML = openedfile + (state == true ? " *" : "" ) ;
}

function fileopen(filename, forceEdit){
	editor.setReadOnly(false);
	saveFile();
	
	if (!forceEdit) {
		if (openedfile == filename) {
			console.log("fileopen : same file");
			return;
		}
	}
	
	openedfile = filename;
	console.log("Open:"+filename);
	editor.setValue("");// clear
	ChangeEditor(false);
	socket.emit('reqFileOpen', filename);
}

function fileselect(path) {
	"use strict";
	console.log("fileselect : " + path);
	socket.emit('reqSelectFile', path);
}

function launchApp(name, file) {
	"use strict";
	socket.emit('ptl_launchapp', {appname : name, file : file});
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

socket.on('showfile', function (data) {
	//console.log(data.str, data.type);
	if (data.type != "")
		editor.getSession().setMode("ace/mode/"+data.type.toString());
	
	editor.session.setValue(data.str.toString(),-1);// set cursor the start
	editor.session.getUndoManager().reset(true);
	editor.session.getUndoManager().markClean();
	ChangeEditor(false);
	$('imageArea').className = 'fadeOut';
	$('imageView').src = "";
	$('launchButtonArea').className = 'fadeOut';
	$('launchButtonView').src = "";
});

socket.on('showfile_image', function (data) {
	editor.setReadOnly(true);
	ChangeEditor(false);
	console.log("show_image");
	hideEditArea();
	$('imageArea').className = 'fadeIn';
	$('imageView').src = data;
});

socket.on('showfile_launchbutton', function (appnames, dir, filename) {
	var apparea,
		name,
		button,
		i;
	console.log('showfile_launchbutton');
	editor.setReadOnly(true);
	ChangeEditor(false);
	$('launchButtonArea').className = 'fadeIn';
	
	// create launch app buttons
	apparea = $("launchButtonView");
	while (apparea.firstChild) {
		apparea.removeChild(apparea.firstChild);
	}
	for (i in appnames) {
		name = appnames[i];
		button = document.createElement("button");
		button.setAttribute('type', 'button');
		button.setAttribute('class', 'button_editor_launchapp');
		button.onclick = function() {
			launchApp(name, dir+filename);
		}
		button.innerHTML = "<span class='text_button_launchapp'>Open " + name + "</span>";
		apparea.appendChild(button);
	}
	// create edit button
	button = document.createElement("button");
	button.setAttribute('type', 'button');
	button.setAttribute('class', 'button_editor_launchapp');
	button.onclick = function() {
		fileopen(filename, true);
	}
	button.innerHTML = "<span class='text_button_launchapp'>Edit text</span>";
	apparea.appendChild(button);
	openedfile = filename;
	ChangeEditor(false);
});

socket.on('fileopen', function(data) {
	console.log("fileopen : " + data);
	fileopen(data);
});

function procRun() {
	clearOutput();
	//showOutputArea(true);
	// run client side
	//var src = editor.getValue();
	//Lua.execute(src);
	//---
	// run server side
	if (!openedfile)
		return;
	socket.emit('run',{file:openedfile});
}
function procStop() {
	console.log("STOP");
	socket.emit('stop');
}

function getFileList()
{
	socket.emit('reqFileList');
}
