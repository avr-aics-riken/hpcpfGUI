// depends: editor.js

socket.on('connect', function () {
	"use strict";
	socket.emit('reqUpdateInformation');
});

socket.on('updateInformation', function(data) {
	"use strict";
	var info = JSON.parse(data),
		elem,
		elemKdb,
		i;
	//console.log(info);
	if ("hpcpf" in info) {
		elem = info.hpcpf;
		if ("project_info" in elem) {
			elem = elem.project_info;
			if ("name_hr" in elem) {
				setProjectName(elem.name_hr); // editor.js
			}
			if ("description_hr" in elem) {
				$('info_description').innerHTML = elem.description_hr;
			}
			if ("workflow" in elem) {
				$('info_workflow').innerHTML = ""
				for (i = 0; i < elem.workflow.length; ++i) {
					$('info_workflow').innerHTML += createInfoLink(elem.workflow[i], false);
				}
			}
			if ("case" in elem) {
				$('info_case').innerHTML = ""
				for (i = 0; i < elem.case.length; ++i) {
					$('info_case').innerHTML += createInfoLink(elem.case[i], false, true);
				}
			}
			if ("kdb" in elem) {
				elemKdb = elem.kdb;
				if ("base" in elemKdb) {
					$('info_kdb_url').innerHTML = createInfoLink(elemKdb.base, true);
				}
				if ("changed" in elemKdb) {
					$('info_kdb_change').innerHTML = ""+elemKdb.changed;
				}
				if ("details_of_changes" in elemKdb) {
					$('info_kdb_detail_of_change').innerHTML = elemKdb.details_of_changes;
				}
			}
			if ("log" in elem) {
				if ("conf" in elem.log) {
					$('info_log').innerHTML = createInfoLink(elem.log.conf, false);
				}
			}
		}
	}
});

socket.on('openFile', function (data) {
	"use strict";
	$('info_text_area').innerHTML = "<pre>"+data+"</pre>";
});

function showFile(file) {
	"use strict";
	console.log("showFile:" + file);
	socket.emit('reqOpenFile', file);
}

function createInfoLink(str, isURL, isCase) {
	"use strict";
	if (isURL) {
		return "<div><a class='info_link' href='"+str+"' target='_blank'>"+str+"</a></div>";
	} else if (isCase) {
		if (str.length > 0 && str[str.length-1] !== '/') {
			return "<div><a class='info_link' href='#' onclick=\"showFile('"+str+"/cwf.lua');\">"+str+"</a></div>";
		} else {
			return "<div><a class='info_link' href='#' onclick=\"showFile('"+str+"cwf.lua');\">"+str+"</a></div>";
		}
	} else {
		return "<div><a class='info_link' href='#' onclick=\"showFile('"+str+"');\">"+str+"</a></div>";
	}
}
