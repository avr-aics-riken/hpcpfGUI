/*jslint devel: true */
/*global SVG */

function svgNodeUI(draw) {
	'use strict';
	
	// NodeUI global
	var holeSize = 20,
		holeSets = draw.set(),
		draggingPlug = null,
		nodeArray = {},
		plugArray = {},
		nodeClickFunction = null,
		nodeDeleteFunction = null,
		colorTableFunction = null,
		headerCode = '',
		footerCode = '',
		topologycalSort;
	
	/*
		TODO: read from setting JSON file
	*/
	function setTypeColorFunction(typeColorFunc) {
		colorTableFunction = typeColorFunc;
	}
	function getTypeColor(type) {
		if (colorTableFunction !== null) {
			return colorTableFunction(type);
		}
		return "#c12417";
	}
	
	function getPlugVarName(nodeName, plugName) {
		return nodeName + ':' + plugName;
	}
	function getNodeNameFromVarname(varName) {
		var sp = varName.split(':');
		return sp[0];
	}
	function getPlugNameFromVarname(varName) {
		var sp = varName.split(':');
		if (sp.length > 1) {
			return sp[1];
		} else {
			return sp[0];
		}
	}

	/* NodeUI class */
	function PlugClass(sx, sy, ex, ey, width, color) {
		this.sx = sx;
		this.sy = sy;
		this.ex = ex;
		this.ey = ey;
		this.connected = null;
		this.line = draw.path('').fill('none').stroke({ width: width, color: color });
		this.drawCurve(this.line, sx, sy, ex, ey);
	}

	PlugClass.prototype = {
		drawCurve: function () {
			var midx = (this.sx + this.ex) * 0.5,
				pstr = 'M' + this.sx + ',' + this.sy;
			pstr += 'C' + midx + ',' + this.sy + ' ' + midx + ',' + this.ey + ' ';
			pstr += this.ex + ',' + this.ey;
			this.line.plot(pstr);
		},
		front: function () {
			this.line.front();
		},
		startPos: function (x, y) {
			this.sx = x;
			this.sy = y;
			this.drawCurve();
		},
		endPos: function (x, y) {
			this.ex = x;
			this.ey = y;
			this.drawCurve();
		},
		reset: function () {
			this.connected = null;
			this.ex = this.sx;
			this.ey = this.sy;
			this.drawCurve();
		},
		erase: function () {
			this.connected = null;
			this.line.remove();
		},
		disconnect: function () {
			this.erase();
		}
	};

	function createPlugSVG(x, y, color) {
		var hole = draw.path("m 112,425 0,15 c 0,0 0.2,0.8 0.6,1.4 0.4,0.4 1.2,0.6 1.2,0.6 l 7.4,0 c 0,0 0.5,0 0.6,0.2 0.2,0 0.5,-0.2 0.5,-0.2 l 8.8,-8 c 0,0 0.7,-0.7 0.7,-1.3 0,-0.6 -0.7,-1.3 -0.7,-1.3 l -8.3,-8.0 c 0,0 0,0 -0.7,-0.3 -0.6,-0.3 -1,-0.2 -1,-0.2 l -7.3,0 c 0,0 -0.4,0.2 -1,0.6 -0.5,0.5 -0.7,1.3 -0.7,1.3 z");
		hole.center(x, y).fill(color);
		return hole;
	}
	
	function NodeConnector(varname, vartype, svgparent, parentNode, x, y) {
		this.type = 'NodeConnector';
		this.varname = varname;
		this.vartype = vartype;
		this.svgparent = svgparent;
		this.parentNode = parentNode;
		this.px = x;
		this.py = y;
		this.connected = null;
		this.line = null;

		var hole = createPlugSVG(svgparent.x() + x, svgparent.y() + y, getTypeColor(vartype)), //draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill(getTypeColor(vartype)),
			holeMouseUp = function (self) {
				return function () {
					if (self.connected) {
						self.connected.disconnect();
						self.disconnect();
					}
					if (draggingPlug !== null) {
						self.connectPlug(draggingPlug);
						draggingPlug = null;
					}
					if (!topologycalSort()) {
						self.connected.disconnect();
						self.disconnect();
					}
				};
			};
		hole.on('mouseup', holeMouseUp(this));
		this.hole = hole;
		holeSets.add(hole);
	}

	NodeConnector.prototype = {
		fit: function () {
			this.hole.move(this.px + this.svgparent.x() - 10, this.py + this.svgparent.y() - 10);
			if (this.connected && this.line) {
				this.line.endPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			}
		},
		front: function () {
			this.hole.front();
		},
		disconnect: function () {
			this.connected = null;
			this.line = null;
			delete plugArray[this.varname];
		},
		connectPlug: function (plug) {
			var plugline;
			if (this.vartype !== plug.vartype) {
				console.log('Error invalid data type.', this.vartype, plug.vartype);
				return;
			}
			
			plugArray[this.varname] = plug;
			
			if (draggingPlug) {
				plugline = draggingPlug.line[plug.line.length - 1];
			} else {
				plugline = new PlugClass(plug.svgparent.x(), plug.svgparent.y(),
										 plug.svgparent.x(), plug.svgparent.y(),
										 4, getTypeColor(plug.vartype));
				plug.line.push(plugline);
			}
			plugline.front();
			
			this.line = plugline;
			this.connected = plugline;
			plugline.connected = this;
			
			this.fit();
			plug.fit();
		},
		erase: function () {
			this.disconnect();
			this.hole.remove();
		}
	};

	function NodePlug(varname, vartype, svgparent, parentNode, x, y) {
		this.type = 'NodePlug';
		this.varname = varname;
		this.vartype = vartype;
		this.svgparent = svgparent;
		this.parentNode = parentNode;
		this.px = x;
		this.py = y;
		this.line = [];

		var hole = createPlugSVG(svgparent.x() + x, svgparent.y() + y, getTypeColor(vartype)),//draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill('#c7c7c7'),
			pole = createPlugSVG(svgparent.x() + x, svgparent.y() + y, getTypeColor(vartype)),//draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill(getTypeColor(vartype)),
			newline,
			poleDragstart = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					newline = new PlugClass(svgparent.x() + x, svgparent.y() + y,
												 svgparent.x() + x, svgparent.y() + y,
												 4, getTypeColor(vartype));
					this.line.push(newline);
					newline.front();
					this.front();
					holeSets.front();
					draggingPlug = self;
				};
			},
			poleDragend = function (self) {
				return function (delta, event) {
					var line = self.line[self.line.length - 1];
					event.stopPropagation();
					if (!line.connected) {
						draggingPlug = null;
						line.endPos(self.px + self.svgparent.x(), self.py + self.svgparent.y());
					}
					this.center(self.px + self.svgparent.x(), self.py + self.svgparent.y());
				};
			};
		this.pole = pole;
		this.hole = hole;
		pole.front();
		pole.line = this.line; // reference
		pole.draggable();
		pole.dragstart = poleDragstart(this);
		pole.dragmove = function (delta, event) {
			event.stopPropagation();
			//this.line[this.line.length - 1].endPos(event.pageX, event.pageY);
			this.line[this.line.length - 1].endPos(event.offsetX, event.offsetY);
		};
		pole.dragend = poleDragend(this);
	}
	NodePlug.prototype = {
		fit: function () {
			var i;
			for (i = 0; i < this.line.length; i = i + 1) {
				this.line[i].startPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			}
			this.hole.move(this.px + this.svgparent.x() - 10, this.py + this.svgparent.y() - 10);
			this.pole.move(this.px + this.svgparent.x() - 10, this.py + this.svgparent.y() - 10);
			for (i = 0; i < this.line.length; i = i + 1) {
				if (!this.line[i].connected) {
					this.line[i].endPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
				}
			}
		},
		front: function () {
			this.hole.front();
			this.pole.front();
		},
		disconnect: function () {
			var i;
			if (plugArray[this]) {
				delete plugArray[this];
			}
			for (i = 0; i < this.line.length; i = i + 1) {
				this.line[i].reset();
			}
		},
		erase: function () {
			var i;
			this.disconnect();
			this.pole.remove();
			this.hole.remove();
			this.pole = null;
			this.hole = null;
			for (i = 0; i < this.line.length; i = i + 1) {
				this.line[i].erase();
				delete this.line[i];
			}
			this.line = [];
		}
	};
	
	function getNodeInfo(data) {
		var nodeData = data.nodeData;
		if (nodeClickFunction) {
			nodeClickFunction(nodeData);
		}
	}
	
	function moveAll(mx, my) {
		var i;
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				nodeArray[i].nodeData.pos[0] = nodeArray[i].nodeData.pos[0] + mx;
				nodeArray[i].nodeData.pos[1] = nodeArray[i].nodeData.pos[1] + my;
				nodeArray[i].move(nodeArray[i].nodeData.pos[0], nodeArray[i].nodeData.pos[1]);
				//console.log(mx, my);
			}
		}
	}
	
	function Node(typename, inouts) {
		var varName = inouts.varname,
			nodeback1 = draw.rect(212, 60).radius(4).attr({'fill': "#72ca29", 'fill-opacity': "1.0", 'stroke': "none"}).move(14, 0),
			nodeback2 = draw.rect(30, 60).radius(4).attr({'fill': "#72ca29", 'fill-opacity': "1.0", 'stroke': "none"}).move(0, 14),
			nodeback3 = draw.rect(24, 24).radius(4).attr({'fill': '#72ca29', 'fill-opacity': "1.0", 'stroke': "none"}).move(4.5, 4.5).rotate(45, 16, 16),
			nodebase = draw.rect(220, 60).attr({'fill': "#4d4d4c", 'fill-opacity': "1.0", 'stroke': "none"}).move(3, 30),
			canErase = true,
			erasebtn,
			eraseA,
			eraseB,
			titletext = draw.text(typename).fill('#4d4d4c').move(15, 2),
			eraseG,
			group = draw.group(),
			groupDragStart = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					self.front();
					getNodeInfo(self);
				};
			},
			groupDragMove = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					self.nodeData.pos[0] = self.orgPos[0] + delta.x;
					self.nodeData.pos[1] = self.orgPos[1] + delta.y;
					self.fit();
				};
			},
			groupDragEnd = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					self.orgPos[0] = self.nodeData.pos[0];
					self.orgPos[1] = self.nodeData.pos[1];
				};
			},
			i,
			j,
			inode,
			connectCnt = 0,
			nodeText,
			inoutNum = 0,
			nodeVarName,
			plugConnectors = {};
		
		if (inouts.hasOwnProperty('canErase')) {
			canErase = inouts.canErase;
		}
		nodeArray[varName] = this;
		if (canErase) {
			erasebtn = draw.rect(16, 16).radius(5).attr({'fill': "#ffffff", 'fill-opacity': "0.8", 'stroke': "none"}).move(0, 4);
			eraseA = draw.rect(14, 2).radius(1).attr({'fill': "#000000", 'fill-opacity': "1.0", 'stroke': "none"}).move(1, 11).rotate(45, 1 + 7, 1 + 11);
			eraseB = draw.rect(14, 2).radius(1).attr({'fill': "#000000", 'fill-opacity': "1.0", 'stroke': "none"}).move(1, 11).rotate(-45, 1 + 7, 1 + 11);
			eraseG = draw.group().move(200, 5);
			
			eraseG.add(erasebtn);
			eraseG.add(eraseA);
			eraseG.add(eraseB);
			eraseG.on('mousedown', (function (node) {
				return function () {
					if (nodeDeleteFunction) {
						setTimeout(function () {
							nodeDeleteFunction(node.nodeData);
						}, 0);
					}
				};
			}(this)));
		}
		
		group.add(nodeback1);
		group.add(nodeback2);
		group.add(nodeback3);
		group.add(nodebase);
		group.add(titletext);
		if (canErase) {
			group.add(eraseG);
		}
		group.draggable();
		group.dragstart = groupDragStart(this);
		group.dragmove = groupDragMove(this);
		group.dragend = groupDragEnd(this);
		this.nodeData = inouts;
		this.orgPos = [0, 0];
		
		this.group = group;
		this.plugConnectors = plugConnectors;
		
		function newNodeConnector(group, inNode, thisptr, i) {
			var nodeText = draw.text(inNode.name).fill('#eee').move(20, 30 + i * 20),
				nodeVarName = getPlugVarName(varName, inNode.name);
			group.add(nodeText);
			return new NodeConnector(nodeVarName, inNode.type, group, thisptr, 0, 45 + i * 20);
		}
		function newNodeOutConnector(group, outNode, thisptr, i) {
			var nodeText = draw.text(outNode.name).fill('#eee').move(130, 30 + i * 20),
				nodeVarName = getPlugVarName(varName, outNode.name);
			group.add(nodeText);
			return new NodePlug(nodeVarName, outNode.type, group, thisptr, 220, 45 + i * 20);
		}
		
		// Node Params
		connectCnt = 0;
		if (inouts) {
			if (inouts.input) {
				for (i = 0; i < inouts.input.length; i += 1) {
					inode = inouts.input[i];
					if (inode.array) {
						for (j = 0; j < inode.array.length; j = j + 1) {
							plugConnectors[inode.array[j].name] = newNodeConnector(group, inode.array[j], this, connectCnt);
							connectCnt = connectCnt + 1;
						}
					} else {
						plugConnectors[inouts.input[i].name] = newNodeConnector(group, inode, this, connectCnt);
						connectCnt = connectCnt + 1;
					}
				}
			}
			inoutNum = Math.max(inoutNum, connectCnt);
			if (inouts.output) {
				inoutNum = Math.max(inoutNum, inouts.output.length);
				for (i = 0; i < inouts.output.length; i += 1) {
					plugConnectors[inouts.output[i].name] = newNodeOutConnector(group, inouts.output[i], this, i);
				}
			}
		}
		nodeback1.size(nodeback1.width(), 40 + 20 * inoutNum);
		nodeback2.size(nodeback2.width(), 40 + 20 * inoutNum - 14);
		nodebase.size(nodebase.width(), 7 + 20 * inoutNum);
		
		for (i in plugConnectors) {
			if (plugConnectors.hasOwnProperty(i)) {
				plugConnectors[i].fit();
			}
		}
	}
	Node.prototype = {
		front: function () {
			var i;
			this.group.front();
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].front();
				}
			}
		},
		fit: function () {
			var i;
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].fit();
				}
			}
		},
		move: function (x, y) {
			this.orgPos[0] = x;
			this.orgPos[1] = y;
			this.group.move(x, y);
			this.fit();
		},
		getConnector: function (name) {
			return this.plugConnectors[name];
		},
		erase: function () {
			var i;
			this.group.remove();
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].erase();
					delete this.plugConnectors[i];
				}
			}
		}
	};

	function getNode(name) {
		return nodeArray[name];
	}
	function getPlug(name) {
		return plugArray[name];
	}
	
	function dump() {
		var i;
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				console.log(i, nodeArray[i]);
			}
		}

		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				console.log(i, plugArray[i]);
			}
		}
	}

	function pushNextNode(nextNode, dependency) {
		if (!nextNode) {
			return;
		}
		
		var i, nextPlug, outNode;
		// multiplex reference
		i = dependency.indexOf(nextNode);
		if (i >= 0) {
			dependency.splice(i, 1);
		}
		dependency.push(nextNode);
		
		for (i in nextNode.plugConnectors) {
			if (nextNode.plugConnectors.hasOwnProperty(i)) {
				nextPlug = nextNode.plugConnectors[i];
				if (nextPlug.type === 'NodeConnector') { // input
					outNode = plugArray[nextPlug.varname];
					if (outNode) {
						pushNextNode(outNode.parentNode, dependency);
					}
				}
			}
		}
	}
	
	topologycalSort = function () {
		var i,
			sorted = [],
			nodeChecks = {},
			temporary = 'temp',
			permanent = 'perm',
			visitFunc = function (varname, nodeChecks) {
				var node = nodeArray[varname],
					i,
					connector,
					nextConnector,
					nextNode;
				if (!varname || varname === undefined) {
					return true;
				}
				if (nodeChecks.hasOwnProperty(varname)) {
					if (nodeChecks[varname] === temporary) {
						// closed loop
						// this is not DAG
						return false;
					}
				} else {
					nodeChecks[varname] = temporary;
					for (i in node.plugConnectors) {
						if (node.plugConnectors.hasOwnProperty(i)) {
							connector = node.plugConnectors[i];
							if (connector.type === 'NodeConnector') {
								if (plugArray.hasOwnProperty(connector.varname)) {
									nextConnector = plugArray[connector.varname];
									if (nextConnector.hasOwnProperty('parentNode')) {
										if (!visitFunc(nextConnector.parentNode.nodeData.varname, nodeChecks)) {
											return false;
										}
									}
								}
							}
						}
					}
					nodeChecks[varname] = permanent;
					sorted.push(node);
				}
				return true;
			};
		
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				if (!nodeChecks.hasOwnProperty(i)) {
					if (!visitFunc(i, nodeChecks)) {
						return false;
					}
				}
			}
		}
		return sorted;
	};


	function exportLua() {
		var i,
			j,
			k,
			node,
			dependency = [],
			plug,
			plugname,
			src = headerCode + '\n\n',
			customfuncs = {},
			customfuncSrc = '',
			fn,
			temp,
			rootList = [];
	
		console.log(topologycalSort());
		
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				if (nodeArray[i].nodeData.rootnode) {
					rootList.push(nodeArray[i]);
				}
			}
		}
		
		for (i = 0; i < rootList.length; i = i + 1) {
			pushNextNode(rootList[i], dependency);
		}
		console.log(dependency);

		//Add Custom Func
		for (i = dependency.length - 1; i >= 0; i -= 1) {
			node = dependency[i].nodeData;
			console.log(node);
			if (node.customfunc) {
				//customfunclist += node.customfunc + '\n';
				customfuncs[node.name] = node;
			}
		}
		
		//console.log('Export:dependency.length: ' + dependency.length);
		function makeValueSrc(node) {
			var src = '';
			if (node.type === 'string') {
				src += node.name + '=\'' + node.value + '\'';
			} else if (node.type === 'vec4') {
				src += node.name + '={';
				src += node.value[0] + ',';
				src += node.value[1] + ',';
				src += node.value[2] + ',';
				src += node.value[3] + '}';
			} else if (node.type === 'vec3') {
				src += node.name + '={';
				src += node.value[0] + ',';
				src += node.value[1] + ',';
				src += node.value[2] + '}';
			} else if (node.type === 'vec2') {
				src += node.name + '={';
				src += node.value[0] + ',';
				src += node.value[1] + '}';
			} else if (node.type === 'float') {
				src += node.name + ' = ' + node.value;
			} else { // Unknown primitive
				src += 'nil';
			}
			return src;
		}
		function makePlugValueSrc(nodevarname, node) {
			var src = '',
				plugname = getPlugVarName(nodevarname, node.name);
			if (plugArray[plugname]) {
				temp = plugArray[plugname].varname;
				if (temp.substr(temp.length - 1, temp.length) === ':') {
					src += node.name + '=' + temp.substr(0, temp.length - 1);
				} else {
					src += node.name + '=' + plugArray[plugname].varname + '()';
				}
			} else if (node.value) {
				src += makeValueSrc(node);
			} else {
				src += 'nil';
			}
			return src;
		}
		for (i = dependency.length - 1; i >= 0; i -= 1) {
			node = dependency[i].nodeData;
			if (node.define) {
				src += node.define;
			}
			/*src += 'local ' + node.varname + ' = ' + node.name + '()\n';
			if (node.funcname) {
				src += node.varname + ':' + node.funcname + '(';
			} else {
				src += node.varname + '(';
			}*/
			src += 'local ' + node.varname + ' = ' + node.funcname + '({';
			if (node.input) {
				for (j = 0; j < node.input.length; j += 1) {
					if (Array.isArray(node.input[j].array)) {
						src += node.input[j].name + '={';
						for (k = 0; k < node.input[j].array.length; k = k + 1) {
							src += makePlugValueSrc(node.varname, node.input[j].array[k]);
							if (k !== node.input[j].array.length - 1) {
								src += ', ';
							}
						}
						src += '}';
					} else {
						/*plugname = getPlugVarName(node.varname, node.input[j].name);
						if (plugArray[plugname]) {
							temp = plugArray[plugname].varname;
							if (temp.substr(temp.length - 1, temp.length) === ':') {
								src += node.input[j].name + '=' + temp.substr(0, temp.length - 1);
							} else {
								src += node.input[j].name + '=' + plugArray[plugname].varname + '()';
							}
						} else if (node.input[j].value) {
							src += makeValueSrc(node.input[j]);
						} else {
							src += 'nil';
						}*/
						src += makePlugValueSrc(node.varname, node.input[j]);
						if (j !== node.input.length - 1) {
							src += ', ';
						}
					}
				}
			}
			src += '})\n';
		}
		for (fn in customfuncs) {
			if (customfuncs.hasOwnProperty(fn)) {
				customfuncSrc += customfuncs[fn].customfunc + '\n';
			}
		}
		src = customfuncSrc + src;
		src += footerCode + '\n';
		//console.log(src);
		return src;
	}
	
	function pushDependencyNode(node, dependency, plugArray) {
		if (!node) {
			return;
		}
		var i, nextPlug, outNode;
		// multiplex reference
		i = dependency.indexOf(node);
		if (i >= 0) {
			dependency.splice(i, 1);
		}
		dependency.push(node);
		
		for (i in node.input) {
			if (node.input.hasOwnProperty(i)) {
				nextPlug = node.input[i];
				outNode = plugArray[nextPlug.varname];
				if (outNode) {
					pushDependencyNode(outNode.parentNode, dependency, plugArray);
				}
			}
		}
	}

	/*
	function convertToLua(data) {
		var nodeData = data.nodeData,
			plugData = data.plugData,
			node,
			outputPlug,
			inputNode,
			i,
			nodeA,
			plugA;
		
		// TODO:
		
		// store nodeArray, plugArray
		
		// start from root node.
		//var rootNode = nodeArray["root"];
		//pushDependencyNode(rootNode, dependency, plugA);
		
		// export denpendencies
		
	}
	*/
	
	function makeNodes(data) {
		var nodeData = data.nodeData,
			plugData = data.plugData,
			node,
			outputPlug,
			inputNode,
			i,
			outNode,
			inpNode;
		for (i = 0; i < nodeData.length; i += 1) {
			node = new Node(nodeData[i].name, nodeData[i]);
			node.move(nodeData[i].pos[0], nodeData[i].pos[1]);
		}
		
		for (i = 0; i < plugData.length; i += 1) {
			outNode = getNode(plugData[i].output.node);
			inpNode = getNode(plugData[i].input.node);
			if (outNode && inpNode) {
				outputPlug = outNode.getConnector(plugData[i].output.plug);
				inputNode  = inpNode.getConnector(plugData[i].input.plug);
				if (outputPlug && inputNode) {
					inputNode.connectPlug(outputPlug);
				}
			}
		}
	}
	
	function getNodeData() {
		//nodeArray
		var i, node, plug, nodeData = [], plugData = [];
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				node = nodeArray[i];
				nodeData.push(node.nodeData);
			}
		}
		//plugArray
		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				// Ref==> {output: {node: 'inst1', plug: 'Position'}, input: {node: 'root', plug: 'vertexbuf'}},
				plug = plugArray[i];
				plugData.push({output: {node: getNodeNameFromVarname(plug.varname), plug: getPlugNameFromVarname(plug.varname)},
							   input:  {node: getNodeNameFromVarname(i),            plug: getPlugNameFromVarname(i)}});
			}
		}
		return {nodeData: nodeData, plugData: plugData};
	}
	
	
	function clearNodes() {
		var i;
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				nodeArray[i].erase();
				delete nodeArray[i];
			}
		}
		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				delete plugArray[i];
			}
		}

		nodeArray = {};
		plugArray = {};
		holeSets.remove();
		holeSets = draw.set();
	}
	function nodeClickEvent(func) {
		nodeClickFunction = func;
	}
	function nodeDeleteEvent(func) {
		nodeDeleteFunction = func;
	}
	
	function setHeaderCode(codes) {
		headerCode = codes;
	}
	function setFooterCode(codes) {
		footerCode = codes;
	}

	
	return {
		PlugClass: PlugClass,
		NodePlug: NodePlug,
		NodeConnector: NodeConnector,
		Node: Node,
		getNode: getNode,
		getPlug: getPlug,
		exportLua: exportLua,
		dump: dump,
		makeNodes: makeNodes,
		getNodeData: getNodeData,
		clearNodes: clearNodes,
		nodeClickEvent: nodeClickEvent,
		nodeDeleteEvent: nodeDeleteEvent,
		setTypeColorFunction: setTypeColorFunction,
		setHeaderCode: setHeaderCode,
		setFooterCode: setFooterCode,
		moveAll: moveAll
	};
}

