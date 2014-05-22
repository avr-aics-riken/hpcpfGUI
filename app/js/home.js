var console, io, FileDialog,
	socket = io.connect(),
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

var xrequet = function (url, callback_online, callback_offline) {
	"use strict";
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "project_history.json", true);
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) { // online
			if (callback_online) {
				callback_online(this.responseText);
			}
		}
		if (xhr.readyState === 4 && xhr.status === 0) { // offline
			if (callback_offline) {
				callback_offline(this.responseText);
			}
		}
	};
	xhr.send(null);
};

function updateProjectList() {
	"use strict";
	function readProjectHistory(data) {
		var proj = JSON.parse(data),
			plist,
			newitem,
			projectname,
			projectpath,
			label,
			i;
		for (i = 0; i < proj.length; i += 1) {
			plist = document.getElementById("projectHistoryList");
			newitem = document.getElementById("projectHistoryList_itemtemplate").cloneNode(true);
			newitem.id = "";
		
			// setting new item
			projectname = proj[i].name;//"PROJECT:01";
			projectpath = proj[i].path;//"/Users/username/project01/";
		
			label = newitem.firstChild.nextSibling;
			label.innerHTML = projectname;
			newitem.path = projectpath;
			plist.appendChild(newitem);
		}
	}
	xrequet("project_history.json", readProjectHistory, readProjectHistory);
}

function bootstrap() {
	"use strict";
	updateProjectList();
}

function openProject(path) {
	"use strict";
	updateProjectList();
	console.log(path);
	window.open("editor.html?" + path, "_blank");
}

function launchApp_FXgen() {
	"use strict";
	socket.emit('ptl_launchapp', {appname : 'FXgen'});
}
function launchApp_PDI() {
	"use strict";
	socket.emit('ptl_launchapp', {appname : 'PDI'});
}
function launchApp_KVTools() {
	"use strict";
	//window.open(location.hostname + ":8082", "_blank");// KVTools
	socket.emit('ptl_launchapp', {appname : 'KVTools'});
}

function newProject() {
	"use strict";
	// TODO
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

//----------------------------------

function registerProjectHistory(path) {
	"use strict";
	socket.emit("registerProjectHistory", path);
}

//-----------------------------------
var tarPath;
function openfileDialog(path) {
	"use strict";
	tarPath = path;
	var i, c;
	i = document.getElementsByClassName("popup_center")[0];
	i.style.display = "block";

	c = document.getElementById('projdir_path');
	c.value = path;
	filedialog.FileList(path);
}
function closefileDialog() {
	"use strict";
	var i = document.getElementsByClassName("popup_center")[0];
	i.style.display = "none";
}

function open_selectedFile() {
	"use strict";
	console.log("OPENPATH:" + tarPath);
	closefileDialog();
	registerProjectHistory(tarPath);
	openProject(tarPath);
}

