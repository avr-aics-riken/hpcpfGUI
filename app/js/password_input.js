/*jslint devel:true, node:true, nomen:true */
/*global RemoteFTP */
// depends: editor.js

(function (editor) {
	"use strict";
	var str_textclass = 'nodePropertyText';

	function makePasswordInput(node) {
		var row = document.createElement('div'),
			name = node.name_hr,
			hostname = node.name_hr,
			testbtn,
			clickfunc,
			passwordInput;
		
		row.setAttribute('class', "hostitem");
		row.setAttribute('draggable', "false");
		name = document.createElement('span');
		name.setAttribute('class', "hostlabel");
		name.innerHTML = node.name_hr;
		row.appendChild(name);

		// input
		passwordInput = document.createElement('input');
		passwordInput.className = str_textclass;
		passwordInput.type = "password";
		passwordInput.addEventListener('keyup', (function (nodeData, passwordInput) {
			return function (e) {
				if (nodeData.hasOwnProperty('sshkey')) {
					nodeData.passphrase = passwordInput.value;
				} else {
					nodeData.password = passwordInput.value;
				}
			};
		}(node, passwordInput)));
		row.appendChild(passwordInput);

		testbtn = document.createElement('button');
		testbtn.setAttribute('class', "connecttest");
		row.appendChild(testbtn);
		clickfunc = (function (hostname) {
			return function (e) {
				e.stopPropagation();
				this.classList.remove('connecttest_ok');
				this.classList.remove('connecttest_fail');
				e.target.removeEventListener('click', clickfunc);// remove clickfunc

				console.log('connect test : ' + hostname);
				var testConnect = new RemoteFTP(editor.socket, 'TestConnect-' + hostname, hostname);
				testConnect.on('error', (function (thisptr, hostname) {
					return function (data) {
						console.log('Connect Error', data);
						//var error_output = document.getElementById('error_output');
						//error_output.innerHTML = 'Connect Error' + data;
						thisptr.classList.add('connecttest_fail');
						testConnect.deleteConnection();
						testConnect = null;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, hostname)));
				testConnect.on('processed', function (data) { console.log('Processed', data); });
				testConnect.on('openDir', (function (thisptr, hostname) {
					return function (data) {
						thisptr.classList.add('connecttest_ok');
						testConnect.deleteConnection();
						testConnect = null;
						thisptr.addEventListener('click', clickfunc); // add clickfunc
					};
				}(this, hostname)));
				testConnect.Connect(node.password);
			};
		}(hostname));
		testbtn.addEventListener('click', clickfunc);

		row.addEventListener('click', (function (hostname) {
			return function (e) {
				editor.socket.emit('REMOTEHOST:REQHOSTINFO', {hostname : hostname});
			};
		}(hostname)));
		return row;
	}
	
	function createPasswordInputView(machines) {
		var machine,
			i,
			row,
			nameElem,
			background = document.getElementById('popup_background'),
			regiterlist = document.getElementById('regiterlist'),
			okButton = document.getElementById('newproject_name_button_ok'),
			cancelButton = document.getElementById('newproject_name_button_cancel'),
			testbutton;
		
		background.onclick = function (evt) {
			background.style.display = "none";
		};
		
		regiterlist.innerHTML = "";
		regiterlist.onclick = function (evt) {
			evt.stopPropagation();
		};
		regiterlist.zIndex = 110;
		for (i in machines) {
			if (machines.hasOwnProperty(i)) {
				machine = machines[i];
				regiterlist.appendChild(makePasswordInput(machine));
			}
		}
		background.style.display = "block";
	}
	
	window.password_input = {};
	window.password_input.makePasswordInput = makePasswordInput;
	window.password_input.createPasswordInputView = createPasswordInputView;
}(window.editor));