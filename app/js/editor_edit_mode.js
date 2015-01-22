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
	socket.emit('reqFileOpen',"./"+filename);
}

function fileselect(filename) {
	"use strict";
	console.log("fileselect : " + filename);
	socket.emit('reqSelectFile', "./"+filename);
}

function diropen(dirname)
{
	editor.setReadOnly(true);
	saveFile();
	openedfile = null;
	
	editor.setValue("");// clear
	ChangeEditor(false);
	console.log("Open Dir:"+dirname);
	
	//redirect
	window.open("editor.html?"+dirname);// new dir
	//document.location = "editor.html?"+dirname;
}

function saveFile(){
	if (!openedfile)
		return;
	if (!edited)
		return;
	console.log("Save:"+openedfile);
	socket.emit('reqFileSave',{file:"./"+openedfile, data:editor.getValue()});
	ChangeEditor(false);
}

function newFile(fname){
	if (fname == "")
		return;
	console.log(fname);
	$('newfilename').value = ''
	socket.emit('reqFileSave',{file:"./"+fname, data:''});
	getFileList();
}

var sfilearea = false;

function showNewFileArea(){
	if (!sfilearea)
		$('newfileArea').className = 'fadeIn';
	else
		$('newfileArea').className = 'fadeOut';
	sfilearea = !sfilearea;
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

socket.on('connect', function() {
	"use strict";
	setupSeparator();
	setupFileDialog();
	//getFileList();
});

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
	$('imageArea').className = 'fadeIn';
	$('imageView').src = data;
	$('launchButtonArea').className = 'fadeOut';
	$('launchButtonView').src = "";
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
		button.setAttribute('onclick', 'launchApp("' +name+ '","' + dir+filename.substr(2) +'")');
		button.innerHTML = "<span class='text_button_launchapp'>Open " + name + "</span>";
		apparea.appendChild(button);
	}
	// create edit button
	button = document.createElement("button");
	button.setAttribute('type', 'button');
	button.setAttribute('class', 'button_editor_launchapp');
	button.setAttribute('onclick', 'fileopen("'+filename.substr(2)+'", true);');
	button.innerHTML = "<span class='text_button_launchapp'>Edit text</span>";
	apparea.appendChild(button);
	openedfile = filename.substr(2);
	ChangeEditor(false);
});

/*
socket.on('updatefilelist', function(jsonlist){
	var ls = $('filelist');
	console.log("update filelist");
	ls.innerHTML = ''; // clear
	var list = JSON.parse(jsonlist);
	for(var i in list) {
		//console.log(list[i]);
		//var newbtn = document.createElement('button');
		//newbtn.setAttribute('class','btn btn-info btn-wide btnsize');
		//newbtn.setAttribute('onclick','fileopen("'+list[i]+'")');
		//newbtn.innerHTML = list[i];
		
		var newbtn = document.createElement('div');
		newbtn.setAttribute('class', "fileitem");
		newbtn.setAttribute('draggable', "false");
		var fileicon = document.createElement('div');
		if (list[i].type != "file" && list[i].type != "dir"){
			console.log("Unknown file type -> "+list[i].type);
			continue;
		}
		
		fileicon.setAttribute('class', list[i].type);
		newbtn.appendChild(fileicon);
		var filelabel = document.createElement('p');
		filelabel.setAttribute('class', "filelabel_short");
		filelabel.innerHTML = list[i].name;
		newbtn.appendChild(filelabel);
		if (list[i].type == "file")
			newbtn.setAttribute('onclick','fileselect("'+list[i].name+'")');
		else // dir
			newbtn.setAttribute('onclick','diropen("'+list[i].path+'")');
		//<div class="fileitem" id="dir2" draggable="false"><div class="dir"></div><p class="filelabel_short">dir2</p></div>
		//<div class="fileitem" id="file1" draggable="false"><div class="file"></div><p class="filelabel_short">file1aaaaaaaaaaaaaaa</p></div>
		
		ls.appendChild (newbtn);
		ls.appendChild(document.createElement('br'));
	}
});
*/

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

function setupSeparator() {
	var separator = document.getElementById('separator'),
		dragging = false;
	separator.onmousedown = function(e) {
		dragging = true;
	};
	document.onmouseup = function(e) {
		dragging = false;
	};
	document.onmousemove = function(e) {
		var filelist,
			editor,
			left = window.pageXOffset || document.documentElement.scrollLeft,
			pos;
		if (dragging) {
			filelist = document.getElementById('filelist');
			editor = document.getElementById('editor');
			console.log(left + e.clientX);
			pos = left + e.clientX;
			if (pos > 50 && pos < (document.documentElement.clientWidth  - 50)) {
				separator.style.left = pos + 'px';
				filelist.style.width = (pos - 18) + 'px';
				editor.style.left = (pos + 8) + 'px';
			}
		}
	};
}

function setupFileDialog() {
	"use strict";
	var openbtn = document.getElementById('openbtn'),
		errormsg = document.getElementById('errormsg');
	
	var fd = new FileDialog('opendlg', document.getElementById("filelist"), true, false);
	fd.registerSocketEvent(socket);
	
	socket.on('connect', function () {
		console.log('connected');
		socket.on('event', function (data) {
			console.log(data);
		});
		socket.on('showError', function (data) {
			//console.log('Err:', data)
			errormsg.innerHTML = data;
		});
	});

	openbtn.onclick = function () {
		fd.FileList('/Users/Public/');
	};
}

function clickDir(fd, path) {
	document.getElementById('dirpath').value = path;
	fd.FileList(path);
}

function clickFile(fd, path) {
	var fl = path.split("/");
	document.getElementById('filename').value = fl[fl.length - 1];
}
