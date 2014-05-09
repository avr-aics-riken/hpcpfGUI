"use strict";
var socket;
socket = io.connect();
var filedialog = new FileDialog('homedlg',true,true);

socket.on('connect', function() { // 2
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
	filedialog.registerSocketEvent(socket);
});

function bootstrap()
{
	updateProjectList();
}

function updateProjectList()
{
	function readProjectHistory(data) {
		var proj = JSON.parse(data);
		for (var i = 0; i<proj.length; ++i){
			var plist = document.getElementById("projectHistoryList");
			var newitem = document.getElementById("projectHistoryList_itemtemplate").cloneNode(true);
			newitem.id = "";
		
			// setting new item
			var projectname = proj[i].name;//"PROJECT:01";
			var projectpath = proj[i].path;//"/Users/username/project01/";
		
			var label = newitem.firstChild.nextSibling;
			label.innerHTML = projectname;
			newitem.path = projectpath;
			plist.appendChild(newitem);
		}
	}
	xrequet("project_history.json", readProjectHistory, readProjectHistory);
}

function openProject(path)
{
	console.log(path);
	window.open("editor.html?"+path,"_blank");// KVTools
}

function launchApp_FXgen()
{
	socket.emit('ptl_launchapp',{appname:'FXgen'});
}
function launchApp_PDI()
{
	socket.emit('ptl_launchapp',{appname:'PDI'});
}
function launchApp_KVTools()
{
	window.open(location.hostname+":8082","_blank");// KVTools
}

function newProject()
{
	// TODO
}

function registerRemoteHost()
{
	var s = window.open("remotehost.html","remotehost");
	s.focus(); // TODO: for firefox
}

function openFileBrowser()
{
	var s = window.open("filebrowser.html","filebrowser");
	s.focus(); // TODO: for firefox
}

function openKDB()
{
	window.open("http://www.cenav.org/kdb/","_blank");
}

//----------------------------------

function registerProjectHistory(path)
{
	socket.emit("registerProjectHistory",path);
}

//-----------------------------------
function openfileDialog(path)
{
	tarPath = path;
	var i = document.getElementsByClassName("popup_center")[0];
	i.style.display="block";

	var c = document.getElementById('projdir_path');
	c.value = path;
	filedialog.FileList(path);
}
function closefileDialog()
{
	var i = document.getElementsByClassName("popup_center")[0];
	i.style.display="none";
}

function open_selectedFile()
{
	console.log("OPENPATH:"+tarPath);
	closefileDialog();
	registerProjectHistory(tarPath);
	openProject(tarPath);
}

//-------------
// project history

function xrequet(url, callback_online, callback_offline)
{
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "project_history.json", true);
	xhr.onreadystatechange = function(){
		if (xhr.readyState === 4 && xhr.status === 200){ // online
			if (callback_online)
				callback_online(this.responseText);
		}
		if (xhr.readyState === 4 && xhr.status === 0){ // offline
			if (callback_offline)
				callback_offline(this.responseText);
		}
	}
	xhr.send(null);
}
