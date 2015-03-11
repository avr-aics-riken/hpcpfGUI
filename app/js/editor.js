/*jslint devel:true*/
/*global $, socket, showStoppedMessage, io, FileDialog */
// depends: editor.js

var socket = io.connect();


function init() {
	"use strict";
	socket.emit('reqInit');
}

/// hidden exist warning dialog
function hiddenExistWarning(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("exist_warning_dialog").style.visibility = "hidden";
}

/// show same file/directory exists dialog
function showExistWarning(callback) {
	"use strict";
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
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("stop_message_dialog").style.visibility = "hidden";
}

/// show stop messsage dialog
function showStoppedMessage(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("stop_message_dialog").style.visibility = "visible";

	setTimeout(hiddenStoppedMessage, 1500);
}

/// hidden saved messsage
function hiddenSavedMessage(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById("save_message_area").style.visibility = "hidden";
	document.getElementById("save_message_dialog").style.visibility = "hidden";
	document.getElementById('save_message_area').className = 'fadeOut';
}

/// show saved messsage dialog
function showSavedMessage(callback) {
	"use strict";
	var ok = document.getElementById('button_ok');
	document.getElementById('save_message_area').className = 'fadeIn';
	document.getElementById("save_message_area").style.visibility = "visible";
	document.getElementById("save_message_dialog").style.visibility = "visible";

	setTimeout(hiddenSavedMessage, 800);
}

/// hidden open warning messsage
function hiddenOpenWarningMessage(callback) {
	"use strict";
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("save_message_area").style.visibility = "hidden";
	document.getElementById("open_warning_dialog").style.visibility = "hidden";
	document.getElementById('save_message_area').className = 'fadeOut';
}

/// show open warning messsage dialog
function showOpenWarningMessage(callback) {
	"use strict";
	var save = document.getElementById('button_save'),
		cancel = document.getElementById('button_cancel');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById('save_message_area').className = 'fadeIn';
	document.getElementById("save_message_area").style.visibility = "visible";
	document.getElementById("open_warning_dialog").style.visibility = "visible";

	function savefunc() {
		callback(true);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	}
	function cancelfunc() {
		callback(false);
		save.removeEventListener("click", savefunc, true);
		cancel.removeEventListener("click", cancelfunc, true);
	}
	save.addEventListener("click", savefunc, true);
	cancel.addEventListener("click", cancelfunc, true);
}

/// change directory
/// @param fd file dialog instance
/// @param path dir path of upper input box
function changeDir(fd, path) {
	"use strict";
	document.getElementById('dirpath').value = path;
}

window.onload = init;

function getWorkingPath() {
	"use strict";
	var url = location.href,
		addrs = url.split("?"),
		argstr,
		args;
	console.log(url);
	if (addrs) {
		if (addrs.length > 1) {
			argstr = addrs[1];
			args = argstr.split("&");
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

function $(id) {
	"use strict";
	return document.getElementById(id);
}

function setupWorkingPath(fd) {
	"use strict";
	var path = getWorkingPath();
	fd.setWorkingPath(path);
	changeDir(fd, path + "/");
	socket.emit('setWorkingPath', JSON.stringify({path: path})); // pass to editor_event.js
}

function validateModeChangeButton(enable) {
	"use strict";
	if (enable) {
		$('button_vimmode').style.opacity = 1.0;
		$('button_vimmode').disabled = false;
	} else {
		$('button_vimmode').style.opacity = 0.6;
		$('button_vimmode').disabled = true;
	}
}

function hideNewNameArea() {
	"use strict";
	var i = 0,
		ids = ['newfileArea', 'newdirArea', 'renameArea', 'deleteArea'],
		classNames;
	for (i = 0; i < ids.length; i = i + 1) {
		classNames = $(ids[i]).className.split(' ');
		classNames[1] = 'fadeOut';
		$(ids[i]).className = classNames.join(' ');
	}
}

function hideEditArea() {
	"use strict";
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
	"use strict";
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
function saveFile(endCallback) {
	"use strict";
	var basedir = $('dirpath').value,
		filename = $('filename').value;
	if (!openedfile) {
		return;
	}
	if (!edited) {
		return;
	}
	console.log("Save:" + openedfile);
	socket.emit('reqFileSave', JSON.stringify({file : openedfile, data : editor.getValue()}));
	socket.once('filesavedone', function (success) {
		if (success) {
			showSavedMessage();
		}
		if (endCallback) {
			console.log("savefileendCallback");
			endCallback();
		}
	});
	ChangeEditor(false);
}

/// make new file
/// @param fd file dialog instance
/// @param basedir relatative dir path from project dir
/// @param fname new filename
function newFile(fd, basedir, fname) {
	"use strict";
	var targetFile =  basedir + fname;
	console.log("newfile:" + targetFile);
	if (fname === "") {
		return;
	}
	console.log(fname);
	$('newfilename').value = '';
	
	socket.emit('reqNewFile', JSON.stringify({target: targetFile, basedir: basedir}));// JSON.stringify({basedir: basedir, file: fname, data:''}));
//	fd.FileList('/');
	
	socket.once("newfiledone", function (success) {
		if (success) {
			// new file saved
			hideNewNameArea();
//			fd.FileList('/'); // to use fs.watch
		} else {
			// exists same path
			showExistWarning(function () {
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
	"use strict";
	var targetname = basedir + dirname;
	console.log('newDirectory:', targetname);
	if (dirname === "") {
		return;
	}
	console.log(dirname);
	$('newdirname').value = '';
	
	console.log({dir : dirname, data : ''});
	socket.emit('reqNewDir', JSON.stringify({basedir: basedir, target: targetname}));
//	fd.FileList('/');
	
	socket.once("newdirdone", function (success) {
		if (success) {
			// new directory saved
			hideNewNameArea();
//			fd.FileList('/');
		} else {
			// exists same path
			showExistWarning(function () {
				hiddenExistWarning();
			});
		}
	});
}

/// rename file or directory
/// @param fd file dialog instance
/// @param name new name of the file or dir
function renameFileOrDirectory(fd, name) {
	"use strict";
	var renamedPath = "",
		target = "",
		i = 0;
	console.log("renameFileOrDirectory:" + name);
	if (name === "") {
		return;
	}
	
	target = $('dirpath').value + $('filename').value;
	socket.emit('reqRename', JSON.stringify({target : target, name : name}));
	socket.once("renamedone", function (success) {
		if (success) {
			// file or directory was renamed
			hideNewNameArea();
//			fd.FileList('/');
		} else {
			// exists same path
			showExistWarning(function () {
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
	"use strict";
	var target = basedir + filename;
	console.log("deleteFileOrDirectory: " + basedir);
	console.log("deleteFileOrDirectory: " + filename);
	
	if (filename === "") {
		fd.UnwatchDir(basedir.split(getWorkingPath() + '/').join(''));
	}

	socket.emit('reqDelete', JSON.stringify({target: target}));
	socket.once('deleted', function () {
		console.log("deleted");
		if (filename === "") {
			changeDir(fd, getWorkingPath() + '/');
		}
		// file or directory was deleted
		hideNewNameArea();
//		fd.FileList('/');
	});
}

/// change color for selecting file or directory element
function changeColor(element) {
	"use strict";
	var items = document.getElementsByClassName("fileitem"),
		i;
	for (i = 0; i < items.length; i += 1) {
		items[i].style.backgroundColor  = "";
	}
	element.style.backgroundColor  = "gray";
	
	console.log("changeColor", element);
}

/// callback of dir clicked on file dialog
/// @param fd file dialog instance
/// @param element clicked element
/// @param parentDir parent directory of path
/// @param path relative path from project dir
function clickDir(fd, element, parentDir, path) {
	"use strict";
	console.log("directory clicked");
	changeColor(element);
	changeDir(fd, getWorkingPath() + '/' + path + '/');
	//document.getElementById('filename').value = "";
	hideNewNameArea();
}

function openFile(fd, element, parentDir, path) {
	"use strict";
	
	// directory, path setting
	if (parentDir === '/') {
		changeDir(fd, getWorkingPath() + '/');
	} else {
		changeDir(fd, getWorkingPath() + parentDir);
	}
	fileselect(path);
	document.getElementById('filename').value = path.split("/").pop();
	showEditView();
	changeColor(element);
}

/// callback of file clicked on file dialog
/// @param fd file dialog instance
/// @param parentDir parent directory of path
/// @param path relative path from project dir
function clickFile(fd, element, parentDir, path) {
	"use strict";
	var preClickedFile = clickedfile;
	clickedfile = getWorkingPath() + parentDir + path;
	
	if (path !== openedfile) {
		if (edited) {
			showOpenWarningMessage(function (isOK) {
					console.log(isOK);
					if (isOK) {
						hiddenOpenWarningMessage();
						editor.setReadOnly(false);
						saveFile(function () {
							openFile(fd, element, parentDir, path);
							dirStatusChanged(fd, getWorkingPath() + parentDir);
						});
					} else {
						hiddenOpenWarningMessage();
						//openFile(fd, element, parentDir, path);
						clickedfile = preClickedFile;
					}
				}
			);
		} else {
			openFile(fd, element, parentDir, path);
			dirStatusChanged(fd, getWorkingPath() + parentDir);
		}
	} else {
		changeColor(element);
	}
}

function dirStatusChanged(fd, dirpath) {
	var elem = null;
	console.log("dirChanged", clickedfile, dirpath);
	if (clickedfile && clickedfile.indexOf(dirpath) >= 0) {
		console.log("dirchanged:", clickedfile);
		elem = fd.findElement(dirpath, clickedfile);
		console.log("dirchangeelem", elem);
		if (elem) {
			changeColor(elem);
		}
	}
}

/// initialize dialog and set callbacks 
function setupFileDialog() {
	"use strict";
	var errormsg = document.getElementById('errormsg'),
		fd = new FileDialog('opendlg', document.getElementById("filelist"), true, false);
	fd.registerSocketEvent(socket);
	fd.setFileClickCallback(clickFile);
	fd.setDirClickCallback(clickDir);
	fd.setDirStatusChangeCallback(dirStatusChanged);
	
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
	
	//fd.FileList('/');
	
	$('button_newfile_done').onclick = function () {
		newFile(fd, $('dirpath').value, $('newfilename').value);
	};
	$('button_newdir_done').onclick = function () {
		newDirectory(fd, $('dirpath').value, $('newdirname').value);
	};
	$('button_rename_done').onclick = function () {
		renameFileOrDirectory(fd, $('renameitem').value);
	};
	$('button_delete_done').onclick = function () {
		deleteFileOrDirectory(fd, $('dirpath').value, $('filename').value);
	};
	return fd;
}

/// initialize dialog and set separator 
function setupSeparator() {
	"use strict";
	var separator = document.getElementById('separator'),
		separator_image = document.getElementById('separator_image'),
		dragging = false;
	separator_image.onmousedown = function (e) {
		dragging = true;
	};
	document.onmouseup = function (e) {
		dragging = false;
	};
	document.onmousemove = function (e) {
		var filelist,
			editor,
			launchButtonArea,
			imageArea,
			exeArea,
			infoArea,
			backButtonArea,
			filelistArea,
			buttonBack,
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


socket.on('connect', function () {
	"use strict";
	var fd;
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
	setupSeparator();
	fd = setupFileDialog();
	setupWorkingPath(fd);

});