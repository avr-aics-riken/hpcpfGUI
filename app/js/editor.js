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

function showInfoMode() {
	"use strict";
	$("info_mode").style.display = "block";
	$("exe_mode").style.display = "none";
	$("edit_mode").style.display = "none";
	socket.emit('reqUpdateInformation');
}

function showExeMode() {
	"use strict";
	$("info_mode").style.display = "none";
	$("exe_mode").style.display = "block";
	$("edit_mode").style.display = "none";
}

function showEditMode() {
	"use strict";
	$("info_mode").style.display = "none";
	$("exe_mode").style.display = "none";
	$("edit_mode").style.display = "block";
}

function executeProject() {
	"use strict";
	showExeMode();
	runWorkflow();
}

function setProjectName(name) {
	"use strict";
	$('info_project_title_text').innerHTML = name;
	$('exe_project_title_text').innerHTML = name;
}
