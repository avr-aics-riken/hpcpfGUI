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
function $(id){ return document.getElementById(id); }
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

function boot(){
	var url = location.href;
	console.log(url);
	var addrs = url.split("?");
	if (addrs) {
		if (addrs.length>1) {
			var argstr = addrs[1];
			var args = argstr.split("&");
			console.log(args.length);
			if (args.length > 0)
				setWorkingPath(args[0]);
		}
	}
	
	getFileList();
}

var openedfile = null;
var edited = false;
function ChangeEditor(state){
	edited = state;
	if (openedfile === null)
		$('filename').innerHTML = '-';
	else
		$('filename').innerHTML = openedfile + (state == true ? " *" : "" ) ;
}
function fileopen(filename){
	editor.setReadOnly(false);
	saveFile();
	if (openedfile == filename)
		return;
	
	openedfile = filename;
	console.log("Open:"+filename);
	editor.setValue("");// clear
	ChangeEditor(false);
	socket.emit('reqFileOpen',"./"+filename);
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

var socket = io.connect();
socket.on('showfile', function (data) {
	console.log(data.str, data.type);
	if (data.type != "")
		editor.getSession().setMode("ace/mode/"+data.type.toString());
	
	editor.setValue(data.str.toString(),-1);// set cursor the start
	editor.session.getUndoManager().reset(true);
	editor.session.getUndoManager().markClean();
	ChangeEditor(false);
	$('imageArea').className = 'fadeOut';
	$('imageView').src = "";
});
socket.on('showfile_image', function (data) {
	editor.setReadOnly(true);
	ChangeEditor(false);
	console.log("show_image");
	$('imageArea').className = 'fadeIn';
	$('imageView').src = data;
});
socket.on('stdout', function (data) {
	var s = $('stdout')
	s.innerHTML += data.toString();
	s.scrollTop = s.scrollHeight;
});

socket.on('stderr', function (data) {
	var s = $('stdout')
	s.innerHTML += data.toString();
	s.scrollTop = s.scrollHeight;
});

socket.on('updatefilelist', function(jsonlist){
	var ls = $('filelist');
	console.log("update filelist");
	ls.innerHTML = ''; // clear
	var list = JSON.parse(jsonlist);
	for(var i in list) {
		console.log(list[i]);
		/*var newbtn = document.createElement('button');
		newbtn.setAttribute('class','btn btn-info btn-wide btnsize');
		newbtn.setAttribute('onclick','fileopen("'+list[i]+'")');
		newbtn.innerHTML = list[i];*/
		
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
			newbtn.setAttribute('onclick','fileopen("'+list[i].name+'")');
		else // dir
			newbtn.setAttribute('onclick','diropen("'+list[i].path+'")');
		/*<div class="fileitem" id="dir2" draggable="false"><div class="dir"></div><p class="filelabel_short">dir2</p></div>
		<div class="fileitem" id="file1" draggable="false"><div class="file"></div><p class="filelabel_short">file1aaaaaaaaaaaaaaa</p></div>*/
		
		ls.appendChild (newbtn);
		ls.appendChild(document.createElement('br'));
	}
});
function clearOutput() {
	//$('stderr').innerHTML = '';
	$('stdout').innerHTML = '';
}
function procRun() {
	clearOutput();
	showOutputArea(true);
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

function setWorkingPath(path)
{
	socket.emit('setWorkingPath',{path:path});
}