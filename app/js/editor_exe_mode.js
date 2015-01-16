// depends: editor.js

socket.on('connect', function () {
	"use strict";
});

function procRun() {
	"use strict";
	var targetFile = "";
	
	console.log("procRun");
	
	if (!targetFile) return;
	
	$('exe_log').innerHTML = "";
	socket.emit('run',{file:targetFile});
}

function stopProject() {
	"use strict";
	console.log("stop");
	socket.emit('stop');
}
