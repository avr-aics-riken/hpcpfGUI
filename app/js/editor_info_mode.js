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
					$('info_workflow').innerHTML +=
						"<div><a class='info_link' href='#'>"+elem.workflow[i]+"</a></div>";
				}
			}
			if ("case" in elem) {
				$('info_case').innerHTML = ""
				for (i = 0; i < elem.workflow.length; ++i) {
					$('info_case').innerHTML +=
						"<div><a class='info_link' href='#'>"+elem.case[i]+"</a></div>";
				}
			}
			if ("kdb" in elem) {
				elemKdb = elem.kdb;
				if ("base" in elemKdb) {
					$('info_kdb_url').innerHTML = 
						"<div><a class='info_link' href='#'>"+elemKdb.base+"</a></div>";
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
					$('info_log').innerHTML =
						"<div><a class='info_link' href='#'>"+elem.log.conf+"</a></div>";
				}
			}
		}
	}
});
