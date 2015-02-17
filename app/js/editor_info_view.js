// depends: editor.js
/*global $, console, socket, setProjectName */

socket.on('connect', function () {
	"use strict";
	socket.emit('reqUpdateInformation');
});

function createInfoLink(str, isURL, isCase) {
	"use strict";
	if (isURL) {
		return "<div><a class='info_link' href='" + str + "' target='_blank'>" + str + "</a></div>";
	} else if (isCase) {
		if (str.length > 0 && str[str.length - 1] !== '/') {
			return "<div><a class='info_link' href='#' onclick=\"showFile('" + str + "/cif.json');\">" + str + "</a></div>";
		} else {
			return "<div><a class='info_link' href='#' onclick=\"showFile('" + str + "cif.json');\">" + str + "</a></div>";
		}
	} else {
		return "<div><a class='info_link' href='#' onclick=\"showFile('" + str + "');\">" + str + "</a></div>";
	}
}

socket.on('updateInformation', function (data) {
	"use strict";
	var info = JSON.parse(data),
		elem,
		elemKdb,
		i;
	//console.log(info);
	$('info_text_area').style.display = "block";
	$('info_opened_text_area').style.display = "none";
	if (info.hasOwnProperty("hpcpf")) {
		elem = info.hpcpf;
		if (elem.hasOwnProperty("project_info")) {
			elem = elem.project_info;
			if (elem.hasOwnProperty("name_hr")) {
				setProjectName(elem.name_hr); // editor.js
			}
			if (elem.hasOwnProperty("description_hr")) {
				$('info_description').innerHTML = elem.description_hr;
			}
			if (elem.hasOwnProperty("workflow")) {
				$('info_workflow').innerHTML = "";
				for (i = 0; i < elem.workflow.length; i = i + 1) {
					$('info_workflow').innerHTML += createInfoLink(elem.workflow[i], false);
				}
			}
			if (elem.hasOwnProperty("case")) {
				$('info_case').innerHTML = "";
				for (i = 0; i < elem["case"].length; i = i + 1) {
					$('info_case').innerHTML += createInfoLink(elem["case"][i], false, true);
				}
			}
			if (elem.hasOwnProperty("kdb")) {
				elemKdb = elem.kdb;
				if (elemKdb.hasOwnProperty("base")) {
					$('info_kdb_url').innerHTML = createInfoLink(elemKdb.base, true);
				}
				if (elemKdb.hasOwnProperty("changed")) {
					$('info_kdb_change').innerHTML = elemKdb.changed.toString();
				}
				if (elemKdb.hasOwnProperty("details_of_changes")) {
					$('info_kdb_detail_of_change').innerHTML = elemKdb.details_of_changes;
				}
			}
			if (elem.hasOwnProperty("log")) {
				if (elem.log.hasOwnProperty("conf")) {
					$('info_log').innerHTML = createInfoLink(elem.log.conf, false);
				}
			}
		}
	}
});

socket.on('openFile', function (data) {
	"use strict";
	$('info_back_button_area').style.display = "block";
	$('info_text_area').style.display = "none";
	$('info_opened_text_area').style.display = "block";
	$('info_opened_text_area').innerHTML =
		"<pre class='info_text_file'>"
		+ data
		+ "</pre>";
	console.log($('info_opened_text_area').innerHTML);
});

function convertJSONtoTable(table, parentKey, json) {
	"use strict";
	var key,
		result = table;
	for (key in json) {
		if (json.hasOwnProperty(key)) {
			if (typeof json[key] === 'object') {
				return convertJSONtoTable(result, key, json[key]);
			} else {
				result += "<div class='row'>";
				result += "<div class='json_title'>";
				if (parentKey) {
					result += parentKey + " - ";
				}
				result += key;
				result += "</div>";
				result += "<div class='json_text'>";
				result += json[key];
				result += "</div>";
				result += "</div>";
			}
		}
	}
	return result;
}

socket.on('openJSON', function (data) {
	"use strict";
	var textArea = $('info_opened_text_area'),
		json;
	$('info_back_button_area').style.display = "block";
	$('info_text_area').style.display = "none";
	$('info_opened_text_area').style.display = "block";
	json = JSON.parse(data);
	textArea.innerHTML = convertJSONtoTable("", "", json);
	//console.log(json);
	//$('info_opened_text_area').innerHTML = "<pre>"+data+"</pre>";
});

function showFile(file) {
	"use strict";
	console.log("showFile:" + file);
	socket.emit('reqOpenFile', file);
}

function backToInfo() {
	"use strict";
	$('info_back_button_area').style.display = "none";
	socket.emit('reqUpdateInformation');
}
