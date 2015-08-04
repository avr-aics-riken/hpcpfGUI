/*jslint devel:true, node:true, nomen:true */
/*global io, FileDialog */

(function () {
	"use strict";
	var socket = io.connect(),
		isFolderSelected = false;
	
	function getEditView() {
		return window.editor_edit_view;
	}
	
	function init() {
		socket.emit('reqInit');
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

		setTimeout(hiddenStoppedMessage, 1500);
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

		setTimeout(hiddenSavedMessage, 800);
	}

	/// hidden open warning messsage
	function hiddenOpenWarningMessage(callback) {
		document.getElementById("confirm_area").style.visibility = "hidden";
		document.getElementById("save_message_area").style.visibility = "hidden";
		document.getElementById("open_warning_dialog").style.visibility = "hidden";
		document.getElementById('save_message_area').className = 'fadeOut';
	}

	/// show open warning messsage dialog
	function showOpenWarningMessage(callback) {
		var save = document.getElementById('button_save'),
			cancel = document.getElementById('button_cancel'),
			savefunc,
			cancelfunc;
		document.getElementById("confirm_area").style.visibility = "visible";
		document.getElementById('save_message_area').className = 'fadeIn';
		document.getElementById("save_message_area").style.visibility = "visible";
		document.getElementById("open_warning_dialog").style.visibility = "visible";

		savefunc = function () {
			callback(true);
			save.removeEventListener("click", savefunc, true);
			cancel.removeEventListener("click", cancelfunc, true);
		};
		cancelfunc = function () {
			callback(false);
			save.removeEventListener("click", savefunc, true);
			cancel.removeEventListener("click", cancelfunc, true);
		};
		save.addEventListener("click", savefunc, true);
		cancel.addEventListener("click", cancelfunc, true);
	}

	function isFileItemDisabled(element) {
		if (element && element.className) {
			return element.className.indexOf('disabled') >= 0;
		}
		return true;
	}
	/// change directory
	/// @param fd file dialog instance
	/// @param path dir path of upper input box
	function changeDir(fd, path) {
		document.getElementById('dirpath').value = path;
	}

	function getWorkingPath() {
		var url = location.href,
			addrs = decodeURIComponent(url).split("?"),
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
		return document.getElementById(id);
	}

	function setupWorkingPath(fd) {
		var path = getWorkingPath();
		fd.setWorkingPath(path);
		changeDir(fd, path + "/");
		socket.emit('setWorkingPath', JSON.stringify({path: path})); // pass to editor_event.js
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
			ids = ['newfileArea', 'newdirArea', 'renameArea', 'deleteArea'],
			classNames;
		for (i = 0; i < ids.length; i = i + 1) {
			classNames = $(ids[i]).className.split(' ');
			classNames[1] = 'fadeOut';
			$(ids[i]).className = classNames.join(' ');
		}
		$('newfilename').value = "";
		$('newdirname').value = "";
		$('renameitem').value = "";
		getEditView().ace_editor.setReadOnly(false);
	}

	function hideEditArea() {
		$('imageArea').className = 'fadeOut';
		$('imageView').src = "";
		$('launchButtonArea').className = 'fadeOut';
		$('launchButtonView').src = "";
		validateModeChangeButton(false);
	}
	
	function changeView(viewtype) {
		$("info_mode").style.display = "none";
		$("exe_mode").style.display = "none";
		$("edit_mode").style.display = "none";
		$("node_mode").style.display = "none";
		$("rightTab").style.display = "none";
		$("nodePropertyTab").style.display = "none";
		hideNewNameArea();
		if (viewtype !== window.editor.ViewTypes.edit) {
			hideEditArea();
			window.editor.openedfile = "";
			window.editor.clickedfile = "";
			isFolderSelected = false;
		}
		if (viewtype === window.editor.ViewTypes.info) {
			$("info_mode").style.display = "block";
			socket.emit('reqUpdateInformation');
		} else if (viewtype === window.editor.ViewTypes.log) {
			$("exe_mode").style.display = "block";
			$("info_back_button_area").style.display = "none";
		} else if (viewtype === window.editor.ViewTypes.edit) {
			$("edit_mode").style.display = "block";
			$("info_back_button_area").style.display = "none";
			validateModeChangeButton(true);
		} else if (viewtype === window.editor.ViewTypes.node) {
			$("node_mode").style.display = "block";
			$("rightTab").style.display = "block";
			$("nodePropertyTab").style.display = "block";
			$("info_back_button_area").style.display = "none";
		}
	}
	
	function getCurrentViewType() {
		if ($("info_mode").style.display !== "none") {
			return window.editor.ViewTypes.info;
		} else if ($("exe_mode").style.display !== "none") {
			return window.editor.ViewTypes.log;
		} else if ($("edit_mode").style.display !== "none") {
			return window.editor.ViewTypes.edit;
		} else if ($("node_mode").style.display !== "none") {
			return window.editor.ViewTypes.node;
		}
		return "unknown";
	}

	function showInfoView() {
		changeView(window.editor.ViewTypes.info);
	}

	function showExeView() {
		changeView(window.editor.ViewTypes.log);
	}

	function showEditView() {
		changeView(window.editor.ViewTypes.edit);
	}
	
	function showNodeView() {
		changeView(window.editor.ViewTypes.node);
	}
	
	function showRegisterHost() {
		var s = window.open("remotehost.html", "remotehost");
		s.focus(); // TODO: for firefox
	}
	

	function setProjectName(name) {
		document.title = name;
		$('info_project_title').innerHTML = "Project Name:";
		$('node_title_text').innerHTML = name;
		$('info_title_text').innerHTML = name;
		$('exe_project_title_text').innerHTML = name;
	}

	function setFileName(name) {
		document.title = name;
		$('info_project_title').innerHTML = "File Name:";
		$('info_title_text').innerHTML = name;
	}

	function disableFileEdit() {
		$('button_rename').disabled = true;
		$('button_delete').disabled = true;
		getEditView().ace_editor.setReadOnly(true);
	}
	
	function enableFileEdit() {
		$('button_rename').disabled = false;
		$('button_delete').disabled = false;
		getEditView().ace_editor.setReadOnly(false);
	}

	function disableDirEdit() {
		$('button_newdir').disabled = true;
		$('button_newfile').disabled = true;
		$('button_rename').disabled = true;
		$('button_delete').disabled = true;
	}
	
	function enableDirEdit() {
		$('button_newdir').disabled = false;
		$('button_newfile').disabled = false;
		$('button_rename').disabled = false;
		$('button_delete').disabled = false;
	}

	/// save file
	function saveFile(endCallback) {
		var basedir = $('dirpath').value,
			filename = $('filename').value;
		if (!window.editor.openedfile) {
			return;
		}
		if (!window.editor.edited) {
			if (endCallback) {
				endCallback();
			}
			return;
		}
		console.log("Save:" + window.editor.openedfile);
		socket.emit('reqFileSave', JSON.stringify({file : window.editor.openedfile, data : getEditView().ace_editor.getValue()}));
		socket.once('filesavedone', function (success) {
			if (success) {
				showSavedMessage();
			}
			if (endCallback) {
				console.log("savefileendCallback");
				endCallback();
			}
		});
		window.editor.edited = false;
		getEditView().changeEditor(false);
	}

	function showNewNameArea(id) {
		var classNames = $(id).className.split(' ');
		hideNewNameArea();

		function showNewNameAreaInternal() {
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

		if (window.editor.edited && (id === 'renameArea' || id === 'deleteArea')) {
			showOpenWarningMessage(function (isOK) {
				if (isOK) {
					hiddenOpenWarningMessage();
					getEditView().ace_editor.setReadOnly(true);
					saveFile(function () {
						showNewNameAreaInternal();
					});
				} else {
					hiddenOpenWarningMessage();
				}
			});
		} else {
			showNewNameAreaInternal();
		}
	}


	/// make new file
	/// @param fd file dialog instance
	/// @param basedir relatative dir path from project dir
	/// @param fname new filename
	function newFile(fd, basedir, fname) {
		var targetFile =  basedir + fname;
		console.log("newfile:" + targetFile);
		if (fname === "") {
			return;
		}
		console.log(fname);
		$('newfilename').value = '';

		socket.emit('reqNewFile', JSON.stringify({target : targetFile, basedir : basedir, data : ''}));// JSON.stringify({basedir: basedir, file: fname, data:''}));
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

	function isColorItemExists() {
		var items = document.getElementsByClassName("fileitem"),
			i;
		for (i = 0; i < items.length; i += 1) {
			if (items[i].style.backgroundColor !== "") {
				return true;
			}
		}
		return false;
	}

	/// rename file or directory
	/// @param fd file dialog instance
	/// @param name new name of the file or dir
	function renameFileOrDirectory(fd, name) {
		var renamedPath = "",
			target = "",
			i = 0;
		console.log("renameFileOrDirectory:" + name);
		if (name === "") {
			return;
		}
		if (!isColorItemExists()) {
			return;
		}

		target = $('dirpath').value + $('filename').value;
		if (isFolderSelected) {
			target = $('dirpath').value;
			fd.UnwatchDir(target.split(getWorkingPath() + '/').join(''));
			console.log("isFolderSelected:" + target);
		}

		socket.emit('reqRename', JSON.stringify({target : target, name : name}));
		socket.once("renamedone", function (success) {
			if (success) {
				if (isFolderSelected) {
					changeDir(fd, getWorkingPath() + '/');
				}
				$('filename').value = "";
				// file or directory was renamed
				hideNewNameArea();
				showInfoView();
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
		var target = basedir + filename;
		console.log("deleteFileOrDirectory: " + basedir);
		console.log("deleteFileOrDirectory: " + filename);

		if (filename === "") {
			fd.UnwatchDir(basedir.split(getWorkingPath() + '/').join(''));
		}

		console.log("deletefile:" + window.editor.openedfile);
		socket.emit('reqDelete', JSON.stringify({target: target}));
		socket.once('deleted', function () {
			console.log("deleted");
			if (filename === "") {
				changeDir(fd, getWorkingPath() + '/');
			}
			// file or directory was deleted
			hideNewNameArea();
			showInfoView();
	//		fd.FileList('/');
		});
		$('filename').value = "";
	}

	/// change color for selecting file or directory element
	function changeColor(element) {
		var items = document.getElementsByClassName("fileitem"),
			i;
		for (i = 0; i < items.length; i += 1) {
			items[i].style.backgroundColor  = "";
		}
		element.style.backgroundColor  = "gray";

		console.log("changeColor", element.className);
	}

	/// callback of dir clicked on file dialog
	/// @param fd file dialog instance
	/// @param element clicked element
	/// @param parentDir parent directory of path
	/// @param path relative path from project dir
	function clickDir(fd, element, parentDir, path) {
		console.log("directory clicked");
		changeColor(element);
		changeDir(fd, getWorkingPath() + '/' + path + '/');
		//document.getElementById('filename').value = "";
		hideNewNameArea();
		isFolderSelected = true;
	}

	function openFile(fd, element, parentDir, path) {
		// directory, path setting
		if (parentDir === '/') {
			changeDir(fd, getWorkingPath() + '/');
		} else {
			changeDir(fd, getWorkingPath() + parentDir);
		}
		
		getEditView().fileselect(path);
		document.getElementById('filename').value = path.split("/").pop();
		showEditView();
		changeColor(element);
		
		// disable edit for excluding file item
		getEditView().onFileOpened = function () {
			enableFileEdit();
			if (isFileItemDisabled(element)) {
				disableFileEdit();
			}
		};
	}


	function dirStatusChanged(fd, dirpath) {
		var elem = null;
		console.log(getEditView());
		
		if (window.editor.clickedfile && window.editor.clickedfile.indexOf(dirpath) >= 0) {
			console.log("dirchanged:", window.editor.clickedfile);
			elem = fd.findFileElement(dirpath, window.editor.clickedfile);
			if (elem) {
				enableDirEdit();
				if (elem && elem.parentNode && elem.parentNode.parentDom) {
					if (isFileItemDisabled(elem.parentNode.parentDom)) {
						disableDirEdit();
					}
				}
				changeColor(elem);
			}
			enableFileEdit();
			if (isFileItemDisabled(elem)) {
				disableFileEdit();
			}
		}
		
	}
	
	/// callback of file clicked on file dialog
	/// @param fd file dialog instance
	/// @param parentDir parent directory of path
	/// @param path relative path from project dir
	function clickFile(fd, element, parentDir, path) {
		var preClickedFile = window.editor.clickedfile,
			elem;
		window.editor.clickedfile = getWorkingPath() + parentDir + path;

		elem = fd.findFileElement(parentDir, path);
		enableDirEdit();
		if (elem && elem.parentNode && elem.parentNode.parentDom) {
			if (isFileItemDisabled(elem.parentNode.parentDom)) {
				disableDirEdit();
			}
		}
		
		isFolderSelected = false;
		console.log("openedfile" + window.editor.openedfile);
		console.log("path" + path);
		
		if (path !== window.editor.openedfile) {
			if (window.editor.edited) {
				showOpenWarningMessage(
					function (isOK) {
						console.log(isOK);
						if (isOK) {
							hiddenOpenWarningMessage();
							getEditView().ace_editor.setReadOnly(false);
							saveFile(function () {
								openFile(fd, element, parentDir, path);
								dirStatusChanged(fd, getWorkingPath() + parentDir);
							});
						} else {
							hiddenOpenWarningMessage();
							//openFile(fd, element, parentDir, path);
							window.editor.clickedfile = preClickedFile;
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

	/// initialize dialog and set callbacks 
	function setupFileDialog() {
		var errormsg = document.getElementById('errormsg'),
			fd = new FileDialog('opendlg', document.getElementById("filelist"), true, false);
		fd.registerSocketEvent(socket);
		fd.setFileClickCallback(clickFile);
		fd.setDirClickCallback(clickDir);
		fd.setDirStatusChangeCallback(dirStatusChanged);
		fd.setCeiJSONChangeCallback(window.editor.ceiJSONChanged);

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
			if (isColorItemExists()) {
				if (isFolderSelected) {
					deleteFileOrDirectory(fd, $('dirpath').value, "");
				} else {
					deleteFileOrDirectory(fd, $('dirpath').value, $('filename').value);
				}
			}
		};
		return fd;
	}

	/// initialize dialog and set separator 
	function setupSeparator() {
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
				nodeArea,
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
				nodeArea = document.getElementById('node_area');
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
					nodeArea.style.left = editor.style.left;
					buttonBack.style.left = (pos + 20) + "px";
				}
			}
		};
	}

	function initButton(fd) {
		var infoButton = document.getElementById('show_info_button'),
			logButton = document.getElementById('show_log_button'),
			nodeButton = document.getElementById('show_node_button'),
			registerhostButton = document.getElementById('show_register_button'),
			modeChangeFunc = function (endCallback) {
				return function (evt) {
					if (window.editor.edited) {
						showOpenWarningMessage(function (isOK) {
							console.log(isOK);
							if (isOK) {
								hiddenOpenWarningMessage();
								getEditView().ace_editor.setReadOnly(false);
								saveFile(function () {
									window.editor.openedfile = "";
									window.editor.clickedfile = "";
									endCallback();
								});
							} else {
								hiddenOpenWarningMessage();
							}
						});
					} else {
						endCallback();
					}
				};
			};
		
		infoButton.onclick = modeChangeFunc(showInfoView);
		logButton.onclick = modeChangeFunc(showExeView);
		nodeButton.onclick = modeChangeFunc(showNodeView);
		registerhostButton.onclick = showRegisterHost;
	}

	socket.on('connect', function () {
		var fd;
		console.log('connected');
		socket.on('event', function (data) {
			console.log(data);
		});
		setupSeparator();
		fd = setupFileDialog();
		setupWorkingPath(fd);
		initButton(fd);
	});

	window.onload = init;
	
	window.editor = {};
	window.editor.ViewTypes = { node : 'node', info : 'info', log : 'log', edit : 'edit' };
	window.editor.getCurrentViewType = getCurrentViewType;
	window.editor.showStoppedMessage = showStoppedMessage;
	window.editor.hideEditArea = hideEditArea;
	window.editor.showExeView = showExeView;
	window.editor.setProjectName = setProjectName;
	window.editor.setFileName = setFileName;
	window.editor.saveFile = saveFile;
	window.editor.socket = socket;
	window.editor.openedfile = null;
	window.editor.edited = false;
	window.editor.clickedfile = null;
	window.editor.ceiJSONChanged = function (fd, dirpath) {};
	window.editor.showNewNameArea = showNewNameArea;
}());