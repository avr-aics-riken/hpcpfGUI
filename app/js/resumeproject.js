/*jslint devel:true, node:true, nomen:true */
/*global io */

(function () {
	"use strict";
	var socket = io.connect(),
		resumeproject = {};
	
	function init() {
		var list = document.createElement('div'),
			row = document.createElement('div');
		
		row.innerHTML = "hogehoge"
		list.appendChild(row);
		regiterlist.appendChild(list);
	}
	
	window.resumeproject = resumeproject;
	window.resumeproject.init = init;
}());
