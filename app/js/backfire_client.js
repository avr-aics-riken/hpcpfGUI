/*jslint devel:true*/
/*global io*/

var fd;
window.onload = function () {
	'use strict';
	var socket = io.connect(),
		openbtn = document.getElementById('openbtn'),
		errormsg = document.getElementById('errormsg');
	
	fd = new FileDialog('opendlg', document.getElementById("filelist"), true, false);
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
};

function clickDir(path) {
	document.getElementById('dirpath').value = path;
	fd.FileList(path);
}

function clickFile(path) {
	var fl = path.split("/");
	document.getElementById('filename').value = fl[fl.length - 1];
}
