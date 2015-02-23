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

function init() {
	socket.emit('reqInit');
}

window.onload = init;

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

function validateModeChangeButton(enable) {
	if (enable) {
		$('button_vimmode').style.opacity = 1.0;
		$('button_vimmode').disabled = false;
	} else {
		$('button_vimmode').style.opacity = 0.6;
		$('button_vimmode').disabled = true;
	}
}

function hideNewNameArea() {
	var i = 0,
		ids = ['newfileArea', 'newdirArea', 'renameArea', 'deleteArea'];
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
	validateModeChangeButton(false);
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
	$("info_back_button_area").style.display = "none";
	hideEditArea();
	hideNewNameArea();
}

function showEditView() {
	"use strict";
	$("info_mode").style.display = "none";
	$("exe_mode").style.display = "none";
	$("edit_mode").style.display = "block";
	$("info_back_button_area").style.display = "none";
	hideNewNameArea();
	validateModeChangeButton(true);
}

function setProjectName(name) {
	"use strict";
	document.title = name;
	$('info_project_title').innerHTML = "Project Name:";
	$('info_title_text').innerHTML = name;
	$('exe_project_title_text').innerHTML = name;
}

function setFileName(name) {
	"use strict";
	document.title = name;
	$('info_project_title').innerHTML = "File Name:";
	$('info_title_text').innerHTML = name;
}

function showNewNameArea(id) {
	var classNames = $(id).className.split(' ');
	hideNewNameArea();
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
	var basedir = $('dirpath').value,
		filename = $('filename').value;
	if (!openedfile)
		return;
	if (!edited)
		return;
	console.log("Save:"+openedfile);
	socket.emit('reqFileSave',JSON.stringify({file: openedfile, data:editor.getValue()}));
	socket.once('filesavedone', function(success) {
		if (success) {
			showSavedMessage();
		}
	});
	ChangeEditor(false);
}

/// make new file
/// @param fd file dialog instance
/// @param basedir relatative dir path from project dir
/// @param fname new filename
function newFile(fd, basedir, fname){
	console.log("newfile:" + fname);
	if (fname == "")
		return;
	console.log(fname);
	$('newfilename').value = ''
	
	socket.emit('reqNewFile', JSON.stringify({basedir: basedir, file: fname, data:''}));
	fd.FileList('/');
	
	socket.once("newfiledone", function(success) {
		if (success) {
			// new file saved
			hideNewNameArea();
			fd.FileList('/');
		} else {
			// exists same path
			showExistWarning(function() {
				hiddenExistWarning();
			});
		}
	});
}

/// make new directory
/// @param fd file dialog instance
/// @param basedir relatative dir path from project dir
/// @param dirname new directory name
function newDirectory(fd, basedir, dirname) {
	if (dirname == "")
		return;
	console.log(dirname);
	$('newdirname').value = '';
	
	console.log({dir: dirname, data:''});
	socket.emit('reqNewDir', JSON.stringify({basedir: basedir, dir: dirname}));
	fd.FileList('/');
	
	socket.once("newdirdone", function(success) {
		if (success) {
			// new directory saved
			hideNewNameArea();
			fd.FileList('/');
		} else {
			// exists same path
			showExistWarning(function() {
				hiddenExistWarning();
			});
		}
	});
}

/// rename file or directory
/// @param fd file dialog instance
/// @param name new name of the file or dir
function renameFileOrDirectory(fd, name) {
	var renamedPath = "",
		target = "",
		i = 0;
	console.log("renameFileOrDirectory:" + name);
	if (name == "")
		return;
	
	target = $('dirpath').value + $('filename').value;
	socket.emit('reqRename', JSON.stringify({target: target, name:name}));
	socket.once("renamedone", function(success) {
		if (success) {
			// file or directory was renamed
			hideNewNameArea();
			fd.FileList('/');
		} else {
			// exists same path
			showExistWarning(function() {
				hiddenExistWarning();
			});
		}
	});
}

/// delete file or directory
/// @param fd file dialog instance
/// @param basedir relatative dir path from project dir
/// @param filename filename
function deleteFileOrDirectory(fd, basedir, filename) {
	var target = basedir + filename;
	console.log("deleteFileOrDirectory: " + basedir);
	console.log("deleteFileOrDirectory: " + filename);
	
	socket.emit('reqDelete', JSON.stringify({target: target}));
	socket.once('deleted', function() {
		console.log("deleted");
		// file or directory was deleted
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

/// change color for selecting file or directory element
function changeColor(element) {
	"use strict";
	var items = document.getElementsByClassName("fileitem"),
		i;
	for (i = 0; i < items.length; ++i) {
		items[i].style.backgroundColor  = "";
	}
	element.style.backgroundColor  = "gray";
}

/// callback of dir clicked on file dialog
/// @param fd file dialog instance
/// @param element clicked element
/// @param parentDir parent directory of path
/// @param path relative path from project dir
function clickDir(fd, element, parentDir, path) {
	console.log("directory clicked");
	// changeColor(element);
	changeDir(fd, getWorkingPath() + '/' + path + '/');
	hideNewNameArea();
}

/// callback of file clicked on file dialog
/// @param fd file dialog instance
/// @param parentDir parent directory of path
/// @param path relative path from project dir
function clickFile(fd, element, parentDir, path) {
	console.log("file clicked");
	changeColor(element);
	
	// directory, path setting
	if (parentDir === '') {
		changeDir(fd, getWorkingPath() + '/');
	} else {
		changeDir(fd, getWorkingPath() + '/' + parentDir + '/');
	}
	fileselect(path);
	document.getElementById('filename').value = path.split("/").pop();
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
		renameFileOrDirectory(fd, $('renameitem').value);
	};
	$('button_delete_done').onclick = function() {
		deleteFileOrDirectory(fd, $('dirpath').value, $('filename').value);
	};
}

/// initialize dialog and set separator 
function setupSeparator() {
	var separator = document.getElementById('separator'),
		separator_image = document.getElementById('separator_image'),
		dragging = false;
	separator_image.onmousedown = function(e) {
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
			backButtonArea,
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
			buttonBack = document.getElementById('button_back');
			pos = left + e.clientX;
			if (pos > 295 && pos < (document.documentElement.clientWidth  - 50)) {
				separator.style.left = pos + 'px';
				filelist.style.width = (pos - 18) + 'px';
				filelistArea.style.width = filelist.style.width;
				editor.style.left = (pos + 8) + 'px';
				launchButtonArea.style.left = editor.style.left;
				imageArea.style.left = editor.style.left;
				exeArea.style.left = editor.style.left;
				infoArea.style.left = editor.style.left;
				buttonBack.style.left = (pos + 20) + "px";
			}
		}
	};
}


/// hidden exist warning dialog
function hiddenExistWarning(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("exist_warning_dialog").style.visibility = "hidden";
}

/// show same file/directory exists dialog
function showExistWarning(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("exist_warning_dialog").style.visibility = "visible";

	function okfunc() {
		callback();
	}
	ok.addEventListener("click", okfunc, true);
}


/// hidden stop messsage
function hiddenStoppedMessage(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("stop_message_dialog").style.visibility = "hidden";
}

/// show stop messsage dialog
function showStoppedMessage(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("stop_message_dialog").style.visibility = "visible";

	setTimeout('hiddenStoppedMessage()', 1500);
}

/// hidden saved messsage
function hiddenSavedMessage(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById("save_message_area").style.visibility = "hidden";
	document.getElementById("save_message_dialog").style.visibility = "hidden";
	document.getElementById('save_message_area').className = 'fadeOut';
}

/// show saved messsage dialog
function showSavedMessage(callback) {
	var ok = document.getElementById('button_ok');
	document.getElementById('save_message_area').className = 'fadeIn';
	document.getElementById("save_message_area").style.visibility = "visible";
	document.getElementById("save_message_dialog").style.visibility = "visible";

	setTimeout('hiddenSavedMessage()', 800);
}