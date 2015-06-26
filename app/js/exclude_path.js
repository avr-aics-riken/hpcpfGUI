/*jslint devel:true, node:true, nomen:true */

(function () {
	"use strict";
	var exclude_path = {},
		excludeList = {
			absolutepath : {},
			wildcard : {}
		},
		path = require('path'),
		fs = require('fs'),
		excludeListPath = path.resolve(__dirname, "../../conf/exclude_path.json");

	function toSlashPath(str) {
		var newpath = path.relative('/', str);
		newpath = '/' + newpath.split(path.sep).join("/");
		return newpath;
	}
	
	function isExcludePath(fullpath) {
		var i,
			wild1,
			wild2;
		if (excludeList.absolutepath.hasOwnProperty(fullpath)) {
			return true;
		}
		for (i in excludeList.wildcard) {
			if (excludeList.wildcard.hasOwnProperty(i)) {
				wild1 = excludeList.wildcard[i].wild1;
				wild2 = excludeList.wildcard[i].wild2;
				//console.log("fullpath:", fullpath);
				//console.log("wild1:", wild1);
				//console.log("wild2:", wild2, wild2.length);
				if (fullpath.indexOf(wild1) >= 0) {
					if (wild2.length === 0) {
						return true;
					}
					if (fullpath.slice(wild1).indexOf(wild2) >= 0) {
						return true;
					}
				}
			}
		}
		return false;
	}
	
	function loadExcludeFileList() {
		console.log("loadExcludeFileList");
		excludeList = {
			absolutepath : {},
			wildcard : {}
		};
		if (fs.existsSync(excludeListPath)) {
			fs.readFile(excludeListPath, function (err, data) {
				var listData,
					i,
					slashPath,
					pos;
				if (err) {
					console.log(err);
					return;
				}
				listData = JSON.parse(data.toString());
				// to find speedy
				for (i = 0; i < listData.length; i = i + 1) {
					slashPath = toSlashPath(listData[i]);
					if (slashPath.indexOf('*') >= 0) {
						// wild card
						excludeList.wildcard[slashPath] = {
							wild1 : slashPath.slice(0, slashPath.indexOf('*')),
							wild2 : slashPath.slice(slashPath.lastIndexOf('*') + 1)
						};
					} else {
						// absolute path
						excludeList.absolutepath[slashPath] = "1";
					}
				}
				console.log("loadexcludeFileList", excludeList);
			});
		}
	}

	module.exports = exclude_path;
	module.exports.loadExcludeFileList = loadExcludeFileList;
	module.exports.isExcludePath = isExcludePath;
}());
