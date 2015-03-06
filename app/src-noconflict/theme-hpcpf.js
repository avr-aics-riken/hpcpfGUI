ace.define('ace/theme/hpcpf', ['require', 'exports', 'module' , 'ace/lib/dom'], function(require, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-hpcpf";
exports.cssText = ".ace-hpcpf .ace_gutter {\
background: #3d3d3d;\
color: #fff\
}\
.ace-hpcpf .ace_print-margin {\
width: 1px;\
background: #3d3d3d\
}\
.ace-hpcpf {\
background-color: #4d4d4d;\
color: #FFFFFF\
}\
.ace-hpcpf .ace_cursor {\
color: #91FF00\
}\
.ace-hpcpf .ace_marker-layer .ace_selection {\
background: rgba(90, 100, 126, 0.88)\
}\
.ace-hpcpf.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px #323232;\
border-radius: 2px\
}\
.ace-hpcpf .ace_marker-layer .ace_step {\
background: rgb(102, 82, 0)\
}\
.ace-hpcpf .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
border: 1px solid #404040\
}\
.ace-hpcpf .ace_marker-layer .ace_active-line {\
background: #353637\
}\
.ace-hpcpf .ace_gutter-active-line {\
background-color: #353637\
}\
.ace-hpcpf .ace_marker-layer .ace_selected-word {\
border: 1px solid rgba(90, 100, 126, 0.88)\
}\
.ace-hpcpf .ace_invisible {\
color: #404040\
}\
.ace-hpcpf .ace_keyword,\
.ace-hpcpf .ace_meta {\
color: #FF7833\
}\
.ace-hpcpf .ace_constant,\
.ace-hpcpf .ace_constant.ace_character,\
.ace-hpcpf .ace_constant.ace_character.ace_escape,\
.ace-hpcpf .ace_constant.ace_other,\
.ace-hpcpf .ace_support.ace_constant {\
color: #6C99FF\
}\
.ace-hpcpf .ace_invalid {\
color: #FFFFFF;\
background-color: #FF0000\
}\
.ace-hpcpf .ace_fold {\
background-color: #FF7833;\
border-color: #FFFFFF\
}\
.ace-hpcpf .ace_support.ace_function {\
color: #FF3355\
}\
.ace-hpcpf .ace_variable.ace_parameter {\
font-style: italic\
}\
.ace-hpcpf .ace_string {\
color: #A5C261\
}\
.ace-hpcpf .ace_string.ace_regexp {\
color: #CCCC33\
}\
.ace-hpcpf .ace_comment {\
font-style: italic;\
color: #BC9458\
}\
.ace-hpcpf .ace_meta.ace_tag {\
color: #FFaa33\
}\
.ace-hpcpf .ace_entity.ace_name {\
color: #FFC66D\
}\
.ace-hpcpf .ace_collab.ace_user1 {\
color: #323232;\
background-color: #FFF980\
}\
.ace-hpcpf .ace_indent-guide {\
background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWMwMjLyZYiPj/8PAAreAwAI1+g0AAAAAElFTkSuQmCC) right repeat-y\
}";

var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});
