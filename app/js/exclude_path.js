/*jslint devel:true, node:true, nomen:true */

(function () {
	"use strict";
	var exclude_path = {},
		excludeListOnBrowser = {
			absolutepath : {},
			wildcard : {}
		},
		excludeListOnWorkSpace = {
			relativepath : {},
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
	
	function toSlashPathRelative(str) {
		return str.split(path.sep).join("/");
	}
	
	function isExcludePath(type, pathstr) {
		var i,
			wild1,
			wild2,
			excludeList;
		
		if (type === module.exports.TypeBrowser) {
			excludeList = excludeListOnBrowser;
		} else {
			excludeList = excludeListOnWorkSpace;
		}
		
		if (excludeList.hasOwnProperty('absolutepath')) {
			if (excludeList.absolutepath.hasOwnProperty(pathstr)) {
				return true;
			}
		}
		if (excludeList.hasOwnProperty('relativepath')) {
			if (excludeList.relativepath.hasOwnProperty(pathstr)) {
				return true;
			}
		}
		
		
		for (i in excludeList.wildcard) {
			if (excludeList.wildcard.hasOwnProperty(i)) {
				wild1 = excludeList.wildcard[i].wild1;
				wild2 = excludeList.wildcard[i].wild2;
				//console.log("pathstr:", pathstr);
				//console.log("wild1:", wild1);
				//console.log("wild2:", wild2, wild2.length);
				if (pathstr.indexOf(wild1) >= 0) {
					if (wild2.length === 0) {
						return true;
					}
					if (pathstr.slice(wild1).indexOf(wild2) >= 0) {
						return true;
					}
				}
			}
		}
		return false;
	}
	
	function loadExcludeFileList() {
		console.log("loadExcludeFileList");
		var excludeList;
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
				if (listData.hasOwnProperty('browser')) {
					excludeList = {
						absolutepath : {},
						wildcard : {}
					};
					// to find speedy
					for (i = 0; i < listData.browser.length; i = i + 1) {
						slashPath = toSlashPath(listData.browser[i]);
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
					excludeListOnBrowser = excludeList;
				}
				if (listData.hasOwnProperty('workspace')) {
					excludeList = {
						relativepath : {},
						wildcard : {}
					};
					// to find speedy
					for (i = 0; i < listData.workspace.length; i = i + 1) {
						slashPath = toSlashPathRelative(listData.workspace[i]);
						if (slashPath.indexOf('*') >= 0) {
							// wild card
							excludeList.wildcard[slashPath] = {
								wild1 : slashPath.slice(0, slashPath.indexOf('*')),
								wild2 : slashPath.slice(slashPath.lastIndexOf('*') + 1)
							};
						} else {
							// absolute path
							excludeList.relativepath[slashPath] = "1";
						}
					}
					console.log("loadexcludeFileList", excludeList);
					excludeListOnWorkSpace = excludeList;
				}
			});
		}
	}

	module.exports = exclude_path;
	module.exports.loadExcludeFileList = loadExcludeFileList;
	module.exports.TypeBrowser = "browser";
	module.exports.TypeWorkSpace = "workspace";

	module.exports.isExcludePath = isExcludePath;
}());
