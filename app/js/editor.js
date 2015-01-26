var socket = io.connect();

socket.on('connect', function () {
	"use strict";
	setupWorkingPath();
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
	setupSeparator();
	setupFileDialog();
});

function getWorkingPath() {
	var url = location.href;
	console.log(url);
	var addrs = url.split("?");
	if (addrs) {
		if (addrs.length>1) {
			var argstr = addrs[1];
			var args = argstr.split("&");
			console.log(args.length);
			if (args.length > 0) {
				args = args[0].split("#");
				if (args.length > 0) {
					return args[0];
				}
			}
		}
	}
	return "/Users/Public/";
}

function $(id){ return document.getElementById(id); }

function setupWorkingPath() {
	"use strict";
	var path = getWorkingPath();
	socket.emit('setWorkingPath',{path:path});
}

function hideNewNameArea() {
	var i = 0,
		ids = ['newfileArea', 'newdirArea', 'renameArea'];
	for (i = 0; i < ids.length; ++i) {
		var classNames = $(ids[i]).className.split(' ');
		classNames[1] = 'fadeOut';
		$(ids[i]).className = classNames.join(' ');
	}
}

function hideEditArea() {
	$('imageArea').className = 'fadeOut';
	$('imageView').src = "";
	$('launchButtonArea').className = 'fadeOut';
	$('launchButtonView').src = "";
}

function showInfoView() {
	"use strict";
	$("info_mode").style.display = "block";
	$("exe_mode").style.display = "none";
	$("edit_mode").style.display = "none";
	hideEditArea();
	hideNewNameArea();
	socket.emit('reqUpdateInformation');
}

function showExeView() {
	"use strict";
	$("info_mode").style.display = "none";
	$("exe_mode").style.display = "block";
	$("edit_mode").style.display = "none";
	hideEditArea();
	hideNewNameArea();
}

function showEditView() {
	"use strict";
	$("info_mode").style.display = "none";
	$("exe_mode").style.display = "none";
	$("edit_mode").style.display = "block";
	hideNewNameArea();
}

function executeProject() {
	"use strict";
	showExeView();
	runWorkflow();
}

function setProjectName(name) {
	"use strict";
	$('info_project_title_text').innerHTML = name;
	$('exe_project_title_text').innerHTML = name;
}

function showNewNameArea(id) {
	var classNames = $(id).className.split(' ');
	console.log("showNewNameArea:" + $(id).className);
	if (classNames[1] === 'fadeIn') {
		classNames[1] = 'fadeOut';
		$(id).className = classNames.join(' ');
	} else {
		classNames = $(id).className.split(' ');
		classNames[1] = 'fadeIn';
		$(id).className = classNames.join(' ');
	}
}

/// save file
function saveFile(){
	if (!openedfile)
		return;
	if (!edited)
		return;
	console.log("Save:"+openedfile);
	socket.emit('reqFileSave',{file: openedfile, data:editor.getValue()});
	ChangeEditor(false);
}

/// make new file
/// @param fd file dialog instance
/// @param fname new filename
function newFile(fd, basedir, fname){
	console.log("newfile:" + fname);
	if (fname == "")
		return;
	console.log(fname);
	$('newfilename').value = ''
	
	socket.emit('reqFileSave', JSON.stringify({basedir: basedir, file: fname, data:''}));
	fd.FileList('/');
	
	socket.on("filesaved", function() {
		// new file saved
		hideNewNameArea();
		fd.FileList('/');
	});
}

/// make new directory
/// @param fd file dialog instance
/// @param dirname new directory name
function newDirectory(fd, basedir, dirname) {
	if (dirname == "")
		return;
	console.log(dirname);
	$('newdirname').value = '';
	
	console.log({dir: dirname, data:''});
	socket.emit('reqDirSave', JSON.stringify({basedir: basedir, dir: dirname}));
	fd.FileList('/');
	
	socket.on("dirsaved", function() {
		// new directory saved
		hideNewNameArea();
		fd.FileList('/');
	});
}

/// rename file or directory
/// @param fd file dialog instance
/// @param name new name of the file or dir
function renameFileOrDirectory(fd, name) {
	var target = "";
	console.log("renameFileOrDirectory:" + name);
	if (name == "")
		return;
	
	target = $('dirpath').value + $('filename').value;
	socket.emit('reqRename', JSON.stringify({file: target, data:name}));
	
	socket.on("renamed", function() {
		// file or directory was renamed
		hideNewNameArea();
		fd.FileList('/');
	});
}

/// change directory
/// @param fd file dialog instance
/// @param path dir path of upper input box
function changeDir(fd, path) {
	document.getElementById('dirpath').value = path;
}

/// callback of dir clicked on file dialog
function clickDir(fd, parentDir, path) {
	console.log(path);
	changeDir(fd, '/' + path + '/');
	hideNewNameArea();
}

/// callback of file clicked on file dialog
/// @param fd file dialog instance
/// @param parentDir parent directory of path
/// @param path relative path from project dir
function clickFile(fd, parentDir, path) {
	var fl;
	console.log("file clicked");
	if (parentDir === '') {
		changeDir(fd, '/');
	} else {
		changeDir(fd, '/' + parentDir + '/');
	}
	fileselect(path);
	fl = path.split("/");
	document.getElementById('filename').value = fl[fl.length - 1];
	showEditView();
}

/// initialize dialog and set callbacks 
function setupFileDialog() {
	"use strict";
	var errormsg = document.getElementById('errormsg');
	
	var fd = new FileDialog('opendlg', document.getElementById("filelist"), true, false);
	fd.registerSocketEvent(socket);
	fd.setFileClickCallback(clickFile);
	fd.setDirClickCallback(clickDir);
	
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
	
	fd.FileList('/');
	
	$('button_newfile_done').onclick = function() {
		newFile(fd, $('dirpath').value, $('newfilename').value);
	};
	$('button_newdir_done').onclick = function() {
		newDirectory(fd, $('dirpath').value, $('newdirname').value);
	};
	$('button_rename_done').onclick = function() {
		renameFileOrDirectory(fd, $('renamefilename').value);
	};
}

/// initialize dialog and set separator 
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
			launchButtonArea,
			imageArea,
			exeArea,
			infoArea,
			left = window.pageXOffset || document.documentElement.scrollLeft,
			pos;
		if (dragging) {
			filelist = document.getElementById('filelist');
			filelistArea = document.getElementById('filelistArea');
			exeArea = document.getElementById('exe_area');
			infoArea = document.getElementById('info_area');
			editor = document.getElementById('editor');
			launchButtonArea = document.getElementById('launchButtonArea');
			imageArea = document.getElementById('imageArea');
			pos = left + e.clientX;
			if (pos > 170 && pos < (document.documentElement.clientWidth  - 50)) {
				separator.style.left = pos + 'px';
				filelist.style.width = (pos - 18) + 'px';
				filelistArea.style.width = filelist.style.width;
				editor.style.left = (pos + 8) + 'px';
				launchButtonArea.style.left = editor.style.left;
				imageArea.style.left = editor.style.left;
				exeArea.style.left = editor.style.left;
				infoArea.style.left = editor.style.left;
			}
		}
	};
}
