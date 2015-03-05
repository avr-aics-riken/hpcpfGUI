/*jslint devel:true*/
/*global $, socket, showStoppedMessage, io, FileDialog */

var socket = io.connect(),
	filedialog = new FileDialog('homedlg', true, true);

function updateLaunchButtons() {
	"use strict";
	socket.emit('reqUpdateLaunchButtons', '');
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
		ok.removeEventListener("click", okfunc, true);
	}
	ok.addEventListener("click", okfunc, true);
}

/// hidden new project name dialog
function hiddenNewProjectName(callback) {
	"use strict";
	var ok = document.getElementById('newproject_name_button_ok');
	document.getElementById("confirm_area").style.visibility = "hidden";
	document.getElementById("newproject_name_dialog").style.visibility = "hidden";
}

/// show new project name dialog
function showNewProjectName(callback) {
	"use strict";
	var ok = document.getElementById('newproject_name_button_ok');
	document.getElementById("confirm_area").style.visibility = "visible";
	document.getElementById("newproject_name_dialog").style.visibility = "visible";
	function okfunc() {
		callback();
		ok.removeEventListener("click", okfunc, true);
	}
	ok.addEventListener("click", okfunc, true);
}

function updateProjectList() {
	"use strict";
	socket.emit('reqUpdateProjectHistory', '');
}

function bootstrap() {
	"use strict";
	updateProjectList();
}

function newProject(name) {
	"use strict";
	var prohibit = ['/', '\\', '|', ',', '*', '<', '>', '?', '"',  ':'],
		filteredName = name,
		i = 0;
	for (i = 0; i < prohibit.length; i = i + 1) {
		filteredName = filteredName.split(prohibit[i]).join('');
	}
	socket.emit('reqCreateNewProject', filteredName);
}

function openProject(path) {
	"use strict";
	updateProjectList();
	console.log(path);
	window.open("editor.html?" + path, "_blank");
}

function launchApp(name) {
	"use strict";
	socket.emit('ptl_launchapp', {appname : name, args : []});
}

function closeNewProjectDialog() {
	"use strict";
	document.getElementById("new_project").style.display = "none";
	document.getElementById('popup_background').style.visibility = "hidden";
	document.getElementById('popup_background').removeEventListener('click', closeNewProjectDialog);
}

function showNewProjectDialog() {
	"use strict";
	var display = document.getElementById("new_project").style.display,
		background = document.getElementById('popup_background');
	if (display === "block") {
		closeNewProjectDialog();
	} else {
		document.getElementById("new_project").style.display = "block";
		background = document.getElementById('popup_background');
		background.style.visibility = "visible";
		background.addEventListener('click', closeNewProjectDialog);
	}
}

function showProjectArchiveDialog() {
	"use strict";
	socket.emit('reqOpenProjectArchiveDialog');
}

function showProjectDialog() {
	"use strict";
	socket.emit('reqOpenProjectDialog');
}

function showRecentProjectDialog() {
	"use strict";
	document.getElementById("recent_project").style.display = "block";
	document.getElementById('popup_background').style.visibility = "visible";
}

function closeRecentProjectDialog() {
	"use strict";
	document.getElementById("recent_project").style.display = "none";
	document.getElementById('popup_background').style.visibility = "hidden";
}

function registerRemoteHost() {
	"use strict";
	var s = window.open("remotehost.html", "remotehost");
	s.focus(); // TODO: for firefox
}

function openFileBrowser() {
	"use strict";
	var s = window.open("filebrowser.html", "filebrowser");
	s.focus(); // TODO: for firefox
}

function openKDB() {
	"use strict";
	window.open("http://www.cenav.org/kdb/", "_blank");
}

function registerProjectHistory(path) {
	"use strict";
	socket.emit("registerProjectHistory", path);
}

function openFileDialog(path) {
	"use strict";
	console.log("openFileDialog");
	filedialog.dir_only = false;
	console.log("path:" + path);
	document.getElementById("file_dialog").style.display = "block";
	document.getElementById('projdir_path').value = path;
	document.getElementById('popup_background').style.visibility = "visible";
	filedialog.FileList(path);
}

function openFolderDialog(path) {
	"use strict";
	console.log("openFolderDialog");
	filedialog.dir_only = true;
	console.log("path:" + path);
	document.getElementById("file_dialog").style.display = "block";
	document.getElementById('projdir_path').value = path;
	document.getElementById('popup_background').style.visibility = "visible";
	filedialog.FileList(path);
}

function closeFileDialog() {
	"use strict";
	document.getElementById("file_dialog").style.display = "none";
	document.getElementById('popup_background').style.visibility = "hidden";
}

function openProjectArchive(tarPath) {
	"use strict";
	socket.emit('reqOpenProjectArchive', tarPath);
}

function openSelectedFile() {
	"use strict";
	var tarPath = document.getElementById('projdir_path').value;
	console.log("OPENPATH:" + tarPath);
	
	if (filedialog.dir_only === true) {
		closeFileDialog();
		registerProjectHistory(tarPath);
		openProject(tarPath);
	} else {
		openProjectArchive(tarPath);
	}
}

// ------ app launch ----------------------------------------------------
socket.on('updateLaunchButtons', function (appnames) {
	"use strict";
	var paneleft = document.getElementById("button_menus"),
		toolarea = document.createElement("div"),
		line = document.createElement("div"),
		i,
		name,
		button;
	
	toolarea.setAttribute('class', 'toolarea');
	line.setAttribute('class', 'launcherline_home');
	toolarea.appendChild(line);

	for (i in appnames) {
		if (appnames.hasOwnProperty(i)) {
			name = appnames[i];
			button = document.createElement("button");
			button.setAttribute('type', 'button');
			button.setAttribute('class', 'button_tool');
			button.setAttribute('onclick', 'launchApp("' + name + '")');
			button.innerHTML = '<span class="text_button_tool">' + name + '</span>';
			toolarea.appendChild(button);
		}
	}
	paneleft.appendChild(toolarea);
});

socket.on('showNewProjectNameExists', function (newname, newpath) {
	"use strict";
	var nametag = document.getElementById('confirm_projectname');
	nametag.innerHTML = newname;
	showExistWarning(function () {
		hiddenExistWarning();
		openProject(newpath);
	});
});

socket.on('showNewProjectName', function (newname, newpath) {
	"use strict";
	var nametag = document.getElementById('new_projectname');
	nametag.innerHTML = newname;
	showNewProjectName(function () {
		hiddenNewProjectName();
		openProject(newpath);
	});
});

// ---------------------------------------------------------------------

socket.on('connect', function () { // 2
	"use strict";
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
	filedialog.registerSocketEvent(socket);
	
	// no use in current version
	// updateLaunchButtons();
});

//-------------
// project history

socket.on('updateProjectHistory', function (data) {
	"use strict";
	//console.log(data);
	
	function readProjectHistory(data) {
		var proj = JSON.parse(data),
			newitem,
			projectname,
			projectpath,
			label,
			i,
			plist = document.getElementById("projectHistoryList"),
			hitem = document.getElementById("historyitem");

		// remove list items
		while (hitem) {
			plist.removeChild(hitem);
			hitem = document.getElementById("historyitem");
		}
		
		for (i = 0; i < proj.length; i += 1) {
			newitem = document.getElementById("projectHistoryList_itemtemplate").cloneNode(true);
			newitem.id = "historyitem";

			// setting new item
			projectname = proj[i].name;//"PROJECT:01";
			projectpath = proj[i].path;//"/Users/username/project01/";

			label = newitem.firstChild.nextSibling;
			label.innerHTML = projectname;
			newitem.path = projectpath;
			plist.appendChild(newitem);
		}
	}
	readProjectHistory(data);
});

socket.on('openProjectArchiveDialog', function (data) {
	"use strict";
	if (data) {
		openFileDialog(data);
	} else {
		openFileDialog('/');
	}
});

socket.on('openProjectDialog', function (data) {
	"use strict";
	if (data) {
		openFolderDialog(data);
	} else {
		openFolderDialog('/');
	}
});

socket.on('createNewProject', function (path) {
	"use strict";
	if (path) {
		console.log("createNewProject:" + path);
		closeNewProjectDialog();
		document.getElementById('newprojectname').value = "";
	}
});
