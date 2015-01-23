var socket = io.connect();

socket.on('connect', function () {
	"use strict";
	setupWorkingPath();
	console.log('connected');
	socket.on('event', function (data) {
		console.log(data);
	});
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
