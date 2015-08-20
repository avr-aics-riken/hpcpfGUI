/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor, password_input) {
	"use strict";
	var nui, // node ui
		nodeListTable = {},
		systemNodeListTable = {},
		//instance_no = 1,
		edit_view = {},
		popupNodeList = null,
		str_rowclass = 'nodePropertyRow',
		str_nameclass = 'nodePropertyName',
		str_textclass = 'nodePropertyText',
		str_constclass = 'nodePropertyConst',
		prePropertyNodeName = null,
		propertyTabFunc;
	
	function defaultLocalHost() {
		return {
			type : "local",
			server : 'localhost',
			workpath : "~/",
			userid : "",
			name_hr : ""
		};
	}
	
	function $(id) {
		return document.getElementById(id);
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	/// hidden open warning messsage
	function hiddenOKCancelDialog(callback) {
		document.getElementById("confirm_area").style.visibility = "hidden";
		document.getElementById("save_message_area").style.visibility = "hidden";
		document.getElementById("ok_cancel_dialog").style.visibility = "hidden";
		document.getElementById('save_message_area').className = 'fadeOut';
	}

	/// show open warning messsage dialog
	function showOKCancelDialog(callback, message) {
		var ok = document.getElementById('button_clean_ok'),
			cancel = document.getElementById('button_clean_cancel'),
			okfunc,
			cancelfunc;
		document.getElementById("confirm_area").style.visibility = "visible";
		document.getElementById('save_message_area').className = 'fadeIn';
		document.getElementById("save_message_area").style.visibility = "visible";
		document.getElementById("ok_cancel_dialog").style.visibility = "visible";
		document.getElementById('ok_cancel_message').innerHTML = message;

		okfunc = function () {
			callback(true);
			ok.removeEventListener("click", okfunc, true);
			cancel.removeEventListener("click", cancelfunc, true);
		};
		cancelfunc = function () {
			callback(false);
			ok.removeEventListener("click", okfunc, true);
			cancel.removeEventListener("click", cancelfunc, true);
		};
		ok.addEventListener("click",  okfunc, true);
		cancel.addEventListener("click", cancelfunc, true);
	}
	
	function makeItemNode(name, text, top) {
		var itemRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			textProp = document.createElement('div');

		itemRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		textProp.innerHTML = text;
		nameProp.classList.add(str_nameclass);
		textProp.classList.add(str_constclass);
		if (top) {
			nameProp.classList.add('nodePropertyTop');
			textProp.classList.add('nodePropertyTop');
		}
		itemRow.appendChild(nameProp);
		itemRow.appendChild(textProp);
		return itemRow;
	}
	
	function makeItemTextNode(name, text, node, type) {
		var itemRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			textProp = document.createElement('input');
		if (type) {
			textProp.setAttribute('type', type);
		} else {
			textProp.setAttribute('type', 'text');
		}
		itemRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		textProp.value = text;
		nameProp.classList.add(str_nameclass);
		textProp.classList.add(str_textclass);
		itemRow.appendChild(nameProp);
		itemRow.appendChild(textProp);
		
		textProp.addEventListener('keyup', (function (nodeData, txt) {
			return function (e) {
				nodeData[name] = txt.value;
			};
		}(node, textProp)));
		
		textProp.onchange = function (evt) {
			save();
		};
		
		return itemRow;
	}
	
	function makeTargetMachineNode(name, value, nodeData, node, targetMachineList) {
		var valueRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			valueProp = document.createElement('div'),
			valueSelect = document.createElement('select'),
			optionElem,
			target,
			targets,
			initialIndex = 0,
			i;
		
		valueRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		nameProp.classList.add(str_nameclass);
		valueRow.appendChild(nameProp);
		valueProp.className = str_constclass;
		valueRow.appendChild(valueProp);
		
		// select box
		targets = targetMachineList.hpcpf.targets;
		valueSelect.className = "nodePropertyTargetMachine";
		for (i = 0; i < targets.length; i = i + 1) {
			target = targets[i];
			optionElem = document.createElement('option');
			
			if (target.server === 'localhost') {
				optionElem.innerHTML = 'localhost';
			} else {
				optionElem.innerHTML = target.name_hr;
			}
			valueSelect.appendChild(optionElem);
			
			if (node.machine && node.machine.hasOwnProperty('type')) {
				if (node.machine.type === target.type) {
					initialIndex = i;
				}
			}
		}
		valueSelect.options[initialIndex].selected = "true";
		node.machine = targets[initialIndex];
		valueSelect.onchange = (function (nodeData, node, targets) {
			return function (e) {
				node.machine = targets[this.selectedIndex];
				console.log(nodeData.name, node.machine);
				nodeListTable[nodeData.name] = nodeData;
				save();
			};
		}(nodeData, node, targets));
		valueProp.appendChild(valueSelect);
		return [valueRow];
	}

	function makeBoolNode(name, value, nodeData, node) {
		var valueRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			valueProp = document.createElement('div'),
			valueSelect = document.createElement('select'),
			optionElem,
			target,
			targets,
			initialIndex = 0,
			i;
		
		valueRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		nameProp.classList.add(str_nameclass);
		valueRow.appendChild(nameProp);
		valueProp.className = str_constclass;
		valueRow.appendChild(valueProp);
		
		// select box
		targets = [false, true];
		valueSelect.className = "nodePropertyTargetMachine";
		for (i = 0; i < targets.length; i = i + 1) {
			target = targets[i];
			optionElem = document.createElement('option');
			optionElem.innerHTML = target;

			valueSelect.appendChild(optionElem);
			
			if (node.hasOwnProperty('cleanup')) {
				if (node.cleanup) {
					initialIndex = 1;
				}
			}
		}
		valueSelect.options[initialIndex].selected = "true";
		node.cleanup = targets[initialIndex];
		valueSelect.onchange = (function (nodeData, node, targets) {
			return function (e) {
				node.cleanup = targets[this.selectedIndex];
				nodeListTable[nodeData.name] = nodeData;
				save();
			};
		}(nodeData, node, targets));
		valueProp.appendChild(valueSelect);
		return [valueRow];
	}

	function addNode(nodename, nx, ny, canErase) {
		var node = nodeListTable[nodename],
			instNode,
			nodeData;
		if (!node) {
			return;
		}
		nodeData = nui.getNodeData();
		instNode = clone(node);
		//console.log(instNode);
		instNode.canErase = canErase;
		nodeData.nodeData.push(instNode);
		//instNode.varname = instNode.varname + instance_no;
		//instance_no += 1;
		if (nx !== undefined && ny !== undefined) {
			instNode.pos[0] = nx;
			instNode.pos[1] = ny;
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function deleteNode(node) {
		var nodeData = nui.getNodeData(),
			data = nodeData.nodeData,
			i;
		
		console.log('DELETE:', node, data);
		
		for (i = 0; i < data.length; i = i + 1) {
			if (data[i].varname === node.varname) {
				data.splice(i, 1);
				console.log('DELETED:', node);
			}
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function clearNode() {
		var nodeData;
		nui.clearNodes();
		nodeData = nui.getNodeData();
		document.getElementById("property").innerHTML = '';
	}
	
	function colorFunction(type) {
		if (type === "string") {
			return "#14a271";
		} else if (type === "float") {
			return "#139aa5";
		} else if (type === "vec4") {
			return "#1b6ad6";
		} else if (type === "vec3") {
			return "#566f9f";
		} else if (type === "DFI" || type === "dfi") {
			return "#20cae0";
		} else if (type === "vec2") {
			return "#8222a7";
		} else if (type === "initial_data") {
			return "#ad3b78";
		} else if (type === "geometry") {
			return "#b19e14";
		} else if (type === "Any") {
			return "#be1656";
		} else if (type === "volume") {
			return "#e023e0";
		} else if (type === "target_machine") {
			return "#ad3b78";
		} else if (type === "geometory") {
			return "#17d042";
		} else if (type === "Any") {
			return "#ef8815";
		} else { // Object
			return "#c12417";
		}
	}
	
	function updateSelectNodeList(listElement, txtval) {
		var i,
			name,
			visible,
			item,
			nodelist = systemNodeListTable;
		
		if (!listElement) { return; }
		
		listElement.innerHTML = ''; // clear
		for (i in nodelist) {
			if (nodelist.hasOwnProperty(i)) {
				//console.log(nodeListTable[i]);
				name = nodelist[i].name;
				visible = nodelist[i].visible;
				
				if ((txtval === '' || name.toLowerCase().indexOf(txtval.toLocaleLowerCase()) >= 0) && visible !== false) {
					item = document.createElement('option');
					item.setAttribute('value', name);
					item.appendChild(document.createTextNode(name));
					listElement.appendChild(item);
				}
			}
		}
	}

	function updatePropertyDebug(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr;

		property.innerHTML = "";
		
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				value = nodeData[key];
				
				property.appendChild(makeItemNode(key, "", true));
				
				if (key === 'input' || key === 'output') {
					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									ioval2 = ioval[iokey2];
									property.appendChild(makeItemNode(iokey2, ioval2));
								}
							}
						}
					}
				} else {
					property.appendChild(makeItemNode(key, value));
				}
			}
		}
	}
	
	function makePropertyInputRow(nodeData, type, key, val, inputNode, targetMachineList) {
		//console.log("type key val", type, key, val);
		if (key === 'machine') {
			if (type === 'target_machine') {
				return makeTargetMachineNode(key, val, nodeData, inputNode, targetMachineList);
			}
		} else if (key === 'value') {
			return [makeItemNode(key, val)];
		} else if (key === 'cores') {
			if (type === 'target_machine') {
				return [makeItemTextNode(key, val, inputNode)];
			}
		} else if (key === 'nodes') {
			if (type === 'target_machine') {
				return [makeItemTextNode(key, val, inputNode)];
			}
		} else if (key === 'cleanup') {
			if (type === 'target_machine') {
				return makeBoolNode(key, val, nodeData, inputNode);
			}
		} else if (key === 'file') {
			return [makeItemTextNode(key, val, inputNode)];
		} else {
			return [makeItemNode(key, val)];
		}
	}
	
	function makePropertyOutputRow(type, key, val, inputNode, targetMachineList) {
		return [makeItemNode(key, val)];
	}
	
	function addCleanButton(nodeData) {
		var property = document.getElementById('nodeProperty'),
			button = document.createElement('button'),
			label1 = document.createElement('div'),
			label2 = document.createElement('div');
		label1.innerHTML = "Clean";
		label1.className = "button_clean_case_label1";
		label2.innerHTML = "Case";
		label2.className = "button_clean_case_label2";
		button.appendChild(label1);
		button.appendChild(label2);
		button.className = "button_clean_case";
		button.id = "button_clean_case";
		button.onclick = (function (caseName) {
			return function (evt) {
				showOKCancelDialog(function (isOK) {
					if (isOK) {
						hiddenOKCancelDialog();
						editor.socket.emit('cleanCase', caseName);
						editor.socket.once('doneCleanCase', function (success) {
							if (success) {
								editor.closeDirectoryFunc();
								console.log('doneCleanCase');
							} else {
								console.error('CleanCase Failed');
							}
						});
					} else {
						hiddenOKCancelDialog();
					}
				}, "Are you sure you want to clean case ?");
			};
		}(nodeData.varname));
		property.appendChild(button);
	}
	
	function updateProperty(nodeData, endCallback) {
		var property = document.getElementById('nodeProperty'),
			value,
			ioval,
			ioval2,
			hr,
			inputtype,
			outputtype,
			propertyRows,
			i;

		property.innerHTML = "";
		if (!nodeData) {
			prePropertyNodeName = null;
			return;
		}
		
		addCleanButton(nodeData);
		
		prePropertyNodeName = nodeData.name;
		property.appendChild(makeItemNode('Property', 'Value', true));
		
		if (nodeData.hasOwnProperty('name')) {
			value = nodeData.name;
			property.appendChild(makeItemNode('name', value));
		}
		if (nodeData.hasOwnProperty('name_hr')) {
			value = nodeData.name_hr;
			property.appendChild(makeItemNode('name_hr', value));
		}
		if (nodeData.hasOwnProperty('varname')) {
			value = nodeData.varname;
			property.appendChild(makeItemNode('casename', value));
		}
		if (nodeData.hasOwnProperty('status')) {
			value = nodeData.status;
			property.appendChild(makeItemNode('status', value));
		}
		
		editor.socket.emit('reqGetTargetMachineList');
		editor.socket.once('doneGetTargetMachineList', function (data) {
			var key,
				iokey,
				iokey2,
				targets,
				targetMachineList = JSON.parse(data);
			//console.log(targetMachineList);
			for (key in nodeData) {
				if (nodeData.hasOwnProperty(key)) {
					if (key === 'input') {
						value = nodeData[key];

						for (iokey in value) {
							if (value.hasOwnProperty(iokey)) {
								ioval = value[iokey];
								if (ioval.hasOwnProperty('name')) {
									iokey2 = 'Input';
									ioval2 = ioval.name;
									property.appendChild(makeItemNode(iokey2, "", true));
								}
								if (ioval.hasOwnProperty('type')) {
									inputtype = ioval.type;
								}
								if (inputtype === 'target_machine' && !ioval.hasOwnProperty('machine')) {
									if (targetMachineList.hasOwnProperty("hpcpf") && targetMachineList.hpcpf.hasOwnProperty("targets")) {
										targets = targetMachineList.hpcpf.targets;
										if (targets.length > 0) {
											ioval.machine = targets[0];
										}
									}
									if (!ioval.machine) {
										ioval.machine = defaultLocalHost();
									}
								}
								if (inputtype === 'target_machine' && !ioval.hasOwnProperty('cores')) {
									ioval.cores = 1;
								}
								if (inputtype === 'target_machine' && !ioval.hasOwnProperty('nodes')) {
									ioval.nodes = 1;
								}
								if (inputtype === 'target_machine' && !ioval.hasOwnProperty('cleanup')) {
									ioval.cleanup = false;
								}
								for (iokey2 in ioval) {
									if (ioval.hasOwnProperty(iokey2)) {
										if (iokey2 !== 'name') {
											if (ioval.hasOwnProperty(iokey2)) {
												ioval2 = ioval[iokey2];
												propertyRows = makePropertyInputRow(nodeData, inputtype, iokey2, ioval2, ioval, targetMachineList);
												for (i = 0; i < propertyRows.length; i = i + 1) {
													property.appendChild(propertyRows[i]);
												}
											}
										}
									}
								}
							}
						}
					} else if (key === 'output') {
						value = nodeData[key];
						for (iokey in value) {
							if (value.hasOwnProperty(iokey)) {
								ioval = value[iokey];
								if (ioval.hasOwnProperty('name')) {
									iokey2 = 'Output';
									ioval2 = ioval.name;
									property.appendChild(makeItemNode(iokey2, "", true));
								}
								if (ioval.hasOwnProperty('type')) {
									outputtype = ioval.type;
								}
								for (iokey2 in ioval) {
									if (ioval.hasOwnProperty(iokey2)) {
										if (iokey2 !== 'name') {
											if (ioval.hasOwnProperty(iokey2)) {
												ioval2 = ioval[iokey2];
												propertyRows = makePropertyOutputRow(outputtype, iokey2, ioval2, ioval, targetMachineList);
												for (i = 0; i < propertyRows.length; i = i + 1) {
													property.appendChild(propertyRows[i]);
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			if (endCallback) {
				endCallback();
			}
		});
	}
	
	editor.socket.on('connect', function () {
	});
	
	function to_lua_json(json) {
		var res = "{ \n",
			i,
			index = 0,
			jsonLength = Object.keys(json).length;
		
		if (!json) {
			return "''";
		}
		
		for (i in json) {
			if (json.hasOwnProperty(i)) {
				if (i === 'userid') {
					console.log("userid", json[i]);
				}
				if (i === 'sshkey') {
					if (index === (jsonLength - 1)) {
						res = res + "\t" + i + ' = ' + 'toNativePath([[' + json[i] + ']])\n';
					} else {
						res = res + "\t" + i + ' = ' + 'toNativePath([[' + json[i] + ']]),\n';
					}
				} else {
					if (typeof json[i] === "object") {
						if (json[i]) {
							res = res + "\t" + i + ' = ' + to_lua_json(json[i]);
						} else {
							res = res + "\t" + i + ' = ""';
						}
						if (index === (jsonLength - 1)) {
							res = res + '\n';
						} else {
							res = res + ',\n';
						}
					} else {
						if (json[i] === true) {
							res = res + "\t" + i + ' = "true';
						} else if (json[i] === false) {
							res = res + "\t" + i + ' = "false';
						} else if (json[i]) {
							res = res + "\t" + i + ' = "' + json[i];
						} else {
							res = res + "\t" + i + ' = "';
						}
						if (index === (jsonLength - 1)) {
							res = res + '"\n';
						} else {
							res = res + '",\n';
						}
					}
				}
				index = index + 1;
			}
		}
		res = res + " }";
		return res;
	}
	
	function to_lua_list(json) {
		var res = "{ \n",
			i,
			index = 0,
			jsonLength = Object.keys(json).length;
		
		for (i in json) {
			if (json.hasOwnProperty(i)) {
				if (typeof json[i] === "object") {
					res = res + "\t" + to_lua_json(json[i]);
					if (index === (jsonLength - 1)) {
						res = res + '\n';
					} else {
						res = res + ',\n';
					}
				} else {
					res = res + "\t" + json[i];
					if (index === (jsonLength - 1)) {
						res = res + '\n';
					} else {
						res = res + ',\n';
					}
				}
				index = index + 1;
			}
		}
		res = res + " }";
		return res;
	}

	// local luajson_0 = { target_machine };
	function exportTargetMachine(id, inputIDs, nodeData, targetMachineList) {
		var i,
			k,
			innode,
			target_machine = {},
			hasTargetMachine = false,
			targets = targetMachineList;
				
		for (i = 0; i < nodeData.input.length; i = i + 1) {
			innode = nodeData.input[i];
			if (innode.type === 'target_machine') {
				if (innode.hasOwnProperty('machine') && innode.machine) {
					for (k = 0; k < targets.length; k = k + 1) {
						if (innode.machine.type === targets[k].type) {
							target_machine.machine = targets[k];
						}
					}
				}
				if (innode.hasOwnProperty('cores') && innode.cores) {
					target_machine.cores = innode.cores;
				} else {
					target_machine.cores = "1";
				}
				if (innode.hasOwnProperty('nodes') && innode.nodes) {
					target_machine.nodes = innode.nodes;
				} else {
					target_machine.nodes = "1";
				}
				if (innode.hasOwnProperty('cleanup') && innode.cleanup) {
					target_machine.cleanup = innode.cleanup;
				} else {
					target_machine.cleanup = false;
				}
				hasTargetMachine = true;
			}
		}
		if (!hasTargetMachine) {
			target_machine.machine = defaultLocalHost();
			target_machine.cores = 1;
			target_machine.nodes = 1;
			target_machine.cleanup = false;
		}
		return "local luajson_" + id.toString() + " = " + to_lua_json(target_machine) + ";\n";
	}
	
	function getValueFromNode(id, nodeParam) {
		var res = {},
			i;
		if (nodeParam.hasOwnProperty('type')) {
			if (nodeParam.type === 'target_machine') {
				return "luajson_" + id.toString();
			} else if (nodeParam.type === 'DFI') {
				return nodeParam;//"'" + nodeParam.file + "'";
			} else {
				return nodeParam;//"'" + nodeParam.value + "'";
			}
		}
		return null;
	}

	// local result_0 = executeCASE(name, luajson_0, isDryRun);
	// result_0 is a table of { node_varname : value, node_varname : value ... }
	function exportOneNode(id, inputIDs, nodeData, isDryRun) {
		var i,
			innode,
			strid = id.toString(),
			strdryrun = isDryRun.toString(),
			inputVar = null,
			inputVars = {},
			nodeVal,
			input,
			exec,
			inputPrefix = "luainput_",
			resultPrefix = "luaresult_";

		//console.log(nodeData.varname, inputIDs, nodeData);
		// create input scripts
		if (inputIDs) {
			for (i = 0; i < inputIDs.length; i = i + 1) {
				if (inputIDs[i] !== null) {
					inputVar = resultPrefix + (inputIDs[i]).toString();
					inputVars[inputPrefix + (parseInt(i, 10) + 1)] = inputVar + "[" + (i + 1).toString() + "]";
				} else {
					nodeVal = getValueFromNode(id, nodeData.input[i]);
					if (nodeVal) {
						inputVars[inputPrefix + (parseInt(i, 10) + 1)] = nodeVal;
					}
				}
			}
		}
		//console.log("inputIDs", inputIDs);
		//console.log("inputVars", inputVars);
		input = "local " + inputPrefix + strid + " = " + to_lua_list(inputVars) + ";\n";
		exec = "local " + resultPrefix + strid + " = executeCASE('" + nodeData.name + "', luajson_" + strid + ", " + strdryrun + ", " + inputPrefix + strid + ")\n";
		return input + exec;
	}
	
	// gather password,passphrase machine
	function gatherPasswordNeedMachine(id, parents, nodeData, password_need_machines) {
		var i,
			k,
			hasSameMachine,
			innode,
			target_name_to_machine = {};
		for (i = 0; i < nodeData.input.length; i = i + 1) {
			innode = nodeData.input[i];
			if (innode.type === 'target_machine') {
				if (innode.hasOwnProperty('machine') && innode.machine) {
					target_name_to_machine[innode.name_hr] = innode.machine;
				}
			}
		}
		for (i in target_name_to_machine) {
			if (target_name_to_machine.hasOwnProperty(i)) {
				
				hasSameMachine = false;
				for (k = 0; k < password_need_machines.length; k = k + 1) {
					if (password_need_machines[k].type === target_name_to_machine[i].type) {
						hasSameMachine = true;
						break;
					}
				}
				
				if (!hasSameMachine) {
					password_need_machines.push(target_name_to_machine[i]);
				}
			}
		}
	}
	
	// callback of connect changed
	function connectChangedFunction() {
		console.log("connect changed");
		save();
	}
	
	// callback of node moved
	function nodeMovedFunction() {
		console.log("node moved");
		save();
	}
	
	function initNode() {
		var draw = SVG('nodecanvas'),
			nodecanvas   = document.getElementById('nodecanvas');
		nodecanvas.innerHTML = "";
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.setConnectChangedFunction(connectChangedFunction);
		nui.setNodeMovedFunction(nodeMovedFunction);
		nui.nodeClickEvent(function (nodeData) {
			console.log("node cliecked");
			save();
			//updatePropertyDebug(nodeData);
			updateProperty(nodeData);
			
			if (propertyTabFunc) {
				propertyTabFunc(true);
			}
		});
		nui.nodeDeleteEvent(deleteNode);
	}
	
	function init() {
		var pos = { x : 0, y : 0 },
			onMiddleButtonDown = false,
			nodecanvas   = document.getElementById('nodecanvas'),
			selectNodeList;
		
		propertyTabFunc = window.animtab.create('right', {
			'rightTab' : { min : '0px', max : 'auto' }
		}, {
			'nodePropertyTab' : { min : '0px', max : '330px' }
		}, 'property');
		propertyTabFunc(false);
		
		initNode();
		
		document.getElementById('node_area').onmousedown = function (evt) {
			onMiddleButtonDown = (evt.button === 1);
			if (onMiddleButtonDown) {
				evt.preventDefault();
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmousemove = function (evt) {
			var mx, my;
			if (onMiddleButtonDown) {
				evt.preventDefault();
				mx = evt.pageX - pos.x;
				my = evt.pageY - pos.y;
				nui.moveAll(mx, my);
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmouseup = function (evt) {
			if (onMiddleButtonDown) {
				console.log("middle button up. saving node");
				save();
			}
			onMiddleButtonDown = false;
		};
	}
	
	function updateStatus() {
		editor.socket.emit('reqReloadNodeList');
		editor.socket.once('reloadNodeList', function (caseNodeList) {
			var i,
				k,
				node,
				nodes,
				caseNodes = JSON.parse(caseNodeList);
			
			if (!nui) { return; }
			nodes = nui.getNodeData();
			
			//console.log(caseNodeList);
			for (i = 0; i < caseNodes.length; i = i + 1) {
				if (nodeListTable.hasOwnProperty(caseNodes[i].name)) {
					node = nodeListTable[caseNodes[i].name];
					node.status = caseNodes[i].status;
				}
				if (node !== undefined) {
					if (node.hasOwnProperty('type')) {
						for (k = 0; k < nodes.nodeData.length; k = k + 1) {
							if (nodes.nodeData[k].type === node.type) {
								nodes.nodeData[k].status = node.status;
							}
						}
					}
					if (nui.getNode(caseNodes[i].varname) !== undefined) {
						nui.getNode(caseNodes[i].varname).changeStatusLabel(node.status);
					}
				}
			}
		});
	}
	
	function insertInitialParam(nodeData, targetMachineList) {
		var i,
			key,
			value,
			iokey,
			ioval,
			inputtype,
			targets;
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				if (key === 'input') {
					value = nodeData[key];

					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							if (ioval.hasOwnProperty('type')) {
								inputtype = ioval.type;
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('machine')) {
								if (targetMachineList.hasOwnProperty("hpcpf") && targetMachineList.hpcpf.hasOwnProperty("targets")) {
									targets = targetMachineList.hpcpf.targets;
									if (targets.length > 0) {
										ioval.machine = targets[0];
									}
								}
								if (!ioval.machine) {
									ioval.machine = defaultLocalHost();
								}
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('cores')) {
								ioval.cores = 1;
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('nodes')) {
								ioval.nodes = 1;
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('cleanup')) {
								ioval.cleanup = false;
							}
						}
					}
				}
			}
		}
	}
	
	function save(endCallback) {
		var data = nui.getNodeData(),
			strData,
			prettyprintFunc = function (key, val) { return val;	};
		
		try {
			// detect modified data
			strData = JSON.stringify(data, prettyprintFunc, '    ');
			editor.socket.emit('reqSaveNode', strData);
			editor.socket.once('doneSaveNode', function (result) {
				console.log("doneSaveNode", result);
				if (endCallback) {
					endCallback();
				}
			});
		} catch (e) {
			console.log(e);
		}
	}
	
	function load() {
		editor.socket.emit('reqLoadNode');
		editor.socket.once('doneLoadNode', function (nodeData) {
			var isloaded = false,
				nodes,
				i;
			try {
				if (nodeData) {
					nodes = JSON.parse(nodeData);
					if (Object.keys(nodes).length > 0) {
						for (i = 0; i < nodes.nodeData.length; i = i + 1) {
							if (!nodeListTable.hasOwnProperty(nodes.nodeData[i].name)) {
								nodeListTable[nodes.nodeData[i].name] = nodes.nodeData[i];
							}
						}
						if (nodeListTable.hasOwnProperty(prePropertyNodeName)) {
							updateProperty(nodeListTable[prePropertyNodeName]);
						} else {
							updateProperty(null);
						}
						//console.log("NODES", nodes);
						nui.clearNodes();
						nui.makeNodes(nodes);
						isloaded = true;
					}
				}
				if (!isloaded) {
					console.log("Init from Case");
					// init from Case
					editor.socket.emit('reqReloadNodeList');
					editor.socket.once('reloadNodeList', function (caseNodeList) {
						var i,
							caseNodes = JSON.parse(caseNodeList);

						//console.log("caseNodes", caseNodeList);
						caseNodes.sort(
							function (a, b) {
								return a.name > b.name;
							}
						);

						editor.socket.emit('reqGetTargetMachineList');
						editor.socket.once('doneGetTargetMachineList', function (data) {
							for (i = 0; i < caseNodes.length; i = i + 1) {
								nodeListTable[caseNodes[i].name] = caseNodes[i];
								addNode(caseNodes[i].name, 50, 50 + (150 * i), false);
								insertInitialParam(caseNodes[i], data);
							}
						});
					});
				}
				
			} catch (e) {
				console.error(e);
			}
		});
	}
	
	function gatherPasswordNeedMachines(parentNodes, sortedNodes) {
		var i,
			node,
			nodeData,
			password_need_machines = [];
		
		for (i = 0; i < sortedNodes.length; i = i + 1) {
			node = sortedNodes[i];
			nodeData = node.nodeData;
			insertInitialParam(nodeData, []);

			if (parentNodes.hasOwnProperty(nodeData.varname)) {
				gatherPasswordNeedMachine(i, parentNodes[nodeData.varname], nodeData, password_need_machines);
			} else {
				gatherPasswordNeedMachine(i, null, nodeData, password_need_machines);
			}
		}

		return password_need_machines;
	}
	
	function addResetWorkflowButton() {
		var property = document.getElementById('nodediv'),
			button = document.createElement('button'),
			label1 = document.createElement('div'),
			label2 = document.createElement('div');
		label1.innerHTML = "Reset";
		label1.className = "button_reset_workflow_label1";
		label2.innerHTML = "Workflow";
		label2.className = "button_reset_workflow_label2";
		button.appendChild(label1);
		button.appendChild(label2);
		button.className = "button_reset_workflow";
		button.id = "button_reset_workflow";
		button.onclick = (function () {
			return function (evt) {
				showOKCancelDialog(function (isOK) {
					if (isOK) {
						hiddenOKCancelDialog();
						editor.socket.emit('resetWorkflow');
						editor.socket.once('doneResetWorkflow', function () {
							//nui.clearNodes();
							initNode();
							load();
							console.log("doneResetWorkflow");
							updateProperty("");
						});
					} else {
						hiddenOKCancelDialog();
					}
				}, "Are you sure you want to reset workflow ?");
			};
		}());
		property.appendChild(button);
	}
	
	function executeWorkflow(isDryRun, endCallback) {
		save(function () {
			nui.exportLua(function (parents, sorted, exportEndCallback) {
				var i = 0,
					nodeData,
					password_need_machines = [],
					node,
					inputIDs = [],
					sortedDatas = [],
					createInputIDList = function (sortedDatas, parents) {
						var ids = [],
							i,
							index;
						for (i = 0; i < parents.length; i = i + 1) {
							index = sortedDatas.indexOf(parents[i]);
							if (index >= 0) {
								ids.push(index);
							} else {
								ids.push(null);
							}
						}
						return ids;
					};

				
				// create sorted node datas
				for (i = 0; i < sorted.length; i = i + 1) {
					sortedDatas.push(sorted[i].nodeData);
				}
				
				// gather password,passphrase machine
				password_need_machines = gatherPasswordNeedMachines(parents, sorted);

				// show password,passphrase input dialog
				password_input.createPasswordInputView(editor.socket, password_need_machines, function (password_need_machines) {
					var node,
						nodeData,
						script = "require('hpcpf')\n",
						i;
					
					for (i = 0; i < password_need_machines.length; i = i + 1) {
						password_input.saveConnection(password_need_machines[i]);
					}
					
					// create lua script
					for (i = 0; i < sorted.length; i = i + 1) {
						node = sorted[i];
						nodeData = node.nodeData;
						if (parents.hasOwnProperty(nodeData.varname)) {
							// has parents
							inputIDs = createInputIDList(sortedDatas, parents[nodeData.varname]);
							script = script + exportTargetMachine(i, inputIDs, nodeData, password_need_machines);
							script = script + exportOneNode(i, inputIDs, nodeData, isDryRun);
						} else {
							// root node
							script = script + exportTargetMachine(i, null, nodeData, password_need_machines);
							script = script + exportOneNode(i, null, nodeData, isDryRun);
						}
					}
					if (exportEndCallback) {
						exportEndCallback(script);
					}
				});
			}, function (script) {
				//console.log("finish creating script:\n", script);
				if (endCallback) {
					endCallback(script);
				}
			});
		});
	}
	
	function cleanWorkflow(endCallback) {
		console.log("cleanworkflow");
		
		showOKCancelDialog(function (isOK) {
			if (isOK) {
				hiddenOKCancelDialog();
				save(function () {
					editor.socket.emit('cleanWorkflow');
					editor.socket.once('doneCleanWorkflow', function () {
						if (endCallback) {
							endCallback();
						}
					});
				});
			} else {
				hiddenOKCancelDialog();
				if (endCallback) {
					endCallback();
				}
			}
		}, "Are you sure you want to clean workflow ?");
	}
	
	editor.socket.on('init', function () {
		init();
		addResetWorkflowButton();
		load();
		updateStatus();
	});
	
	// override
	window.editor.ceiJSONChanged = function (fd, dirpath) {
		console.log("ceiJSONChanged called:", dirpath);
		updateStatus();
	};
	
	window.node_edit_view = edit_view;
	window.node_edit_view.executeWorkflow = function (endcallback) {
		return executeWorkflow(false, endcallback);
	};
	window.node_edit_view.dryrunWorkflow = function (endcallback) {
		return executeWorkflow(true, endcallback);
	};
	window.node_edit_view.cleanWorkflow = function (endcallback) {
		return cleanWorkflow(endcallback);
	};
	window.node_edit_view.init = init;
	window.node_edit_view.save = save;
	window.node_edit_view.load = load;
	
}(window.editor, window.password_input));
