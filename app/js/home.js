var socket = io.connect(),
	filedialog = new FileDialog('homedlg', true, true);

socket.on('connect', function () { // 2
	"use strict";
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
	filedialog.registerSocketEvent(socket);
});

//-------------
// project history

socket.on('updateProjectHistory', function (data) {
	console.log(data);
	
	function readProjectHistory(data) {
		var proj = JSON.parse(data),
			plist,
			newitem,
			projectname,
			projectpath,
			label,
			i;
		var plist = document.getElementById("projectHistoryList");
		var hitem = document.getElementById("historyitem");

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

socket.on('openProjectDialog', function (data) {
	if (data) {
		openfileDialog(data);
	} else {
		openfileDialog('/');
	}
});

socket.on('createNewProject', function (path) {
	if (path) {
		console.log("createNewProject:" + path);
		closeNewProjectDialog();
		document.getElementById('newprojectname').value = "";
		openProject(path);
	}
});

function updateProjectList() {
	socket.emit('reqUpdateProjectHistory','');
}

function bootstrap() {
	"use strict";
	updateProjectList();
}

function newProject(name) {
	"use strict";
	var filteredName = name.split('/').join('');
	filteredName = filteredName.split('\\').join('');
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
	socket.emit('ptl_launchapp', {appname : name, args:[]});
}

function showNewProjectDialog() {
	"use strict";
	var display = document.getElementById("new_project").style.display;
	if (display == "block") {
		closeNewProjectDialog();
	} else {
		document.getElementById("new_project").style.display = "block";
	}
}

function closeNewProjectDialog() {
	"use strict";
	document.getElementById("new_project").style.display = "none";
}

function showProjectArchiveDialog() {
	"use strict";
	socket.emit('reqOpenProjectDialog');
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

function openfileDialog(path) {
	"use strict";
	document.getElementById("file_dialog").style.display = "block";
	document.getElementById('projdir_path').value = path;
	document.getElementById('popup_background').style.visibility = "visible";
	filedialog.FileList(path);
}

function closefileDialog() {
	"use strict";
	document.getElementById("file_dialog").style.display = "none";
	document.getElementById('popup_background').style.visibility = "hidden";
}

function open_selectedFile() {
	"use strict";
	var tarPath = document.getElementById('projdir_path').value;
	console.log("OPENPATH:" + tarPath);
	closefileDialog();
	registerProjectHistory(tarPath);
	openProject(tarPath);
}
