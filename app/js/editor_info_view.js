/*jslint devel:true, node:true, nomen:true */
// depends: editor.js

(function (editor) {
	"use strict";
	
	function $(id) {
		return document.getElementById(id);
	}
	
	function createInfoLink(str, isURL, isCase) {
		if (isURL) {
			return "<div><a class='info_link' href='" + str + "' target='_blank'>" + str + "</a></div>";
		} else if (isCase) {
			if (str.length > 0 && str[str.length - 1] !== '/') {
				return "<div><a class='info_link' href='#' onclick=\"window.editor_info_view.showFile('" + str + "/cmd.json');\">" + str + "</a></div>";
			} else {
				return "<div><a class='info_link' href='#' onclick=\"window.editor_info_view.showFile('" + str + "cmd.json');\">" + str + "</a></div>";
			}
		} else {
			return "<div><a class='info_link' href='#' onclick=\"window.editor_info_view.showFile('" + str + "');\">" + str + "</a></div>";
		}
	}

	function showFile(file) {
		editor.setFileName(file);
		console.log("showFile:" + file);
		editor.socket.emit('reqOpenFile', file);
	}

	function backToInfo() {
		$('info_back_button_area').style.display = "none";
		editor.socket.emit('reqUpdateInformation');
	}
	

	editor.socket.on('updateInformation', function (pmdStr, cmdStr) {
		var pmdData = JSON.parse(pmdStr),
			cmdData = JSON.parse(cmdStr),
			elem,
			elemKdb,
			i;
		//console.log("PMDDATA", pmdData);
		//console.log("CMDDATA", cmdData);
		$('info_text_area').style.display = "block";
		$('info_opened_text_area').style.display = "none";
		if (pmdData) {
			if (pmdData.hasOwnProperty("hpcpf")) {
				elem = pmdData.hpcpf;
				if (elem.hasOwnProperty('project_meta_data')) {
					elem = elem.project_meta_data;
					if (elem.hasOwnProperty("name_hr")) {
						editor.setProjectName(elem.name_hr); // editor.js
					}
					if (elem.hasOwnProperty("description_hr")) {
						$('info_description').innerHTML = elem.description_hr;
					}
					/*
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
					*/
				}
			}
		}
		$('info_case').innerHTML = "";
		for (i = 0; i < cmdData.length; i = i + 1) {
			if (cmdData[i].hasOwnProperty('name_hr')) {
				$('info_case').innerHTML += createInfoLink(cmdData[i].name_hr, false, true);
			}
		}
	});

	editor.socket.on('openFile', function (data) {
		$('info_back_button_area').style.display = "block";
		$('info_text_area').style.display = "none";
		$('info_opened_text_area').style.display = "block";
		$('info_opened_text_area').innerHTML =
			"<pre class='info_text_file'>"
			+ data
			+ "</pre>";
		console.log($('info_opened_text_area').innerHTML);
	});

	function convertJSONtoTable(parentKey, json) {
		var key,
			result = "";
		for (key in json) {
			if (json.hasOwnProperty(key)) {
				if (typeof json[key] === 'object') {
					if (parentKey) {
						result += convertJSONtoTable(parentKey + " - " + key, json[key]);
					} else {
						result += convertJSONtoTable(key, json[key]);
					}
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

	editor.socket.on('openJSON', function (data) {
		var textArea = $('info_opened_text_area'),
			json;
		$('info_back_button_area').style.display = "block";
		$('info_text_area').style.display = "none";
		$('info_opened_text_area').style.display = "block";
		try {
			json = JSON.parse(data);
			textArea.innerHTML = convertJSONtoTable("", json);
		} catch (e) {
			textArea.innerHTML +=
				"<p style='background:red'>JSON Parse Error:" + e + "</p>"
				+ "<pre class='info_text_file'>"
				+ data
				+ "</pre>";
		}
		//console.log(json);
		//$('info_opened_text_area').innerHTML = "<pre>"+data+"</pre>";
	});
	
	editor.socket.on('connect', function () {
		editor.socket.emit('reqUpdateInformation');
	});

	window.editor_info_view = {};
	window.editor_info_view.showFile = showFile;
	window.editor_info_view.backToInfo = backToInfo;
}(window.editor));

