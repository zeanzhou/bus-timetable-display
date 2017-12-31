"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

;
// (function(){
// })();
var GLOBALVARS = {
	"plugin_name": "bus.js",
	"version": 1.3,
	"finish": false,
	"all_ifbds": []
};

var Dictionary = function () {
	function Dictionary(raw_data, default_lang) {
		_classCallCheck(this, Dictionary);

		this._data = raw_data;
		this._defaultlang = default_lang;
	}

	_createClass(Dictionary, [{
		key: "fetch",
		value: function fetch(lang) {
			if (this._data[lang] == undefined) {
				lang = this._defaultlang;
			}
			return this._data[lang];
		}
	}, {
		key: "data",
		get: function get() {
			return this._data;
		},
		set: function set(d) {
			var original = this._data;
			this._data = d;
			if (this._data[this._defaultlang] == undefined) {
				this._data[this._defaultlang] = original;
			}
		}
	}]);

	return Dictionary;
}();

// Load language file


var _language_json = {
	"zh-cn": {
		"_commingsoon": "正在驶来",
		"_nminutesleft_prefix": "预计",
		"_nminutesleft_postfix": "到达",
		"_outage": "今日运营结束",
		"_category": "班车类型：",
		"_route": "行驶路线：",
		"_lastupdate": "最后更新时间：",
		"_businfo": "班车信息"
	}
};
$.ajax({
	url: './language.json',
	success: function success(json) {
		_language_json = JSON.parse(json);
	},
	dataType: "text",
	cache: true
});

var Infoboard = {
	init: function init(container, data, isshowbusinfo, language) {
		var _targettimecatcher = function _targettimecatcher(i) {
			var str;
			var property = me.data.timetable[me.tableindex].schedule[i].property;
			if (property == 'online') // future version
				str = undefined;
			str = me.data.timetable[me.tableindex].schedule[i].time;
			str = new Date().Format('yyyy/MM/dd') + ' ' + str;
			var targettime = new Date(str);
			if (property == 'accurate') return [targettime, targettime, 0];else if (property == 'estimate') {
				var estimate_delay = 0;
				if (me.data.timetable[me.tableindex].schedule[i].hasOwnProperty('estimate-delay')) estimate_delay = me.data.timetable[me.tableindex].schedule[i]['estimate-delay'];else estimate_delay = me.data.timetable[me.tableindex]['estimate-delay'];
				var targettime_withdelay = new Date();
				targettime_withdelay.setTime(targettime.getTime() + 60 * 1000 * estimate_delay);
				return [targettime, targettime_withdelay, estimate_delay];
			}
		};
		var _timeshower = function _timeshower(begin_index) {
			var currenttime = new Date();
			for (var i = begin_index; i < me.data.timetable[me.tableindex].schedule.length; ++i) {
				var currenttime = new Date();
				var tmp = _targettimecatcher(i);
				var targettime = tmp[0];
				var targettime_withdelay = tmp[1];
				var estimate_delay = tmp[2];
				if (currenttime.getTime() < targettime_withdelay.getTime()) {
					var countdown = new Date();
					countdown.setTime(targettime.getTime() - currenttime.getTime());
					if (currenttime.getTime() > targettime.getTime()) return [i, me.dic.fetch(me.language)._commingsoon, me.dic.fetch(me.language)._nminutesleft_prefix + targettime_withdelay.Format('hh:mm') + me.dic.fetch(me.language)._nminutesleft_postfix, estimate_delay, 10000]; //[currententry index, countdown, nexttime, estimate-delay in min, countdown in min]
					else //                     ↑ [正在驶来] targettime.Format_('mm:ss')+'对向发车'                                        ↑ [10000] not show is better...? cuz it's just an estimate..
						return [i, countdown, targettime.Format('hh:mm'), estimate_delay, countdown.getTime() / 60 / 1000];
				}
			}
			return [i, me.dic.fetch(me.language)._outage, me.dic.fetch(me.language)._outage, undefined, undefined];
		};
		var _stringformatter = function _stringformatter(str) {
			// return [string to show, extrafield for currententry index, minutes left for the accurate next bus]
			var extrafield = undefined; // prepared for _countdown and _nexttime, transfer current index
			var minutesleft = undefined;
			var pattern0 = /\{(.+?)\}/g;
			var pattern1 = /\[(.+?)\]/g;
			var v = str.match(pattern0); // {route[1]}
			for (var i = v.length - 1; i >= 0; i--) {
				var text;
				var vname = v[i].replace('{', '').replace('}', ''); // {route[1]}=>route[1]
				var index = vname.match(pattern1); // [1]=>1
				if (index != null) index = index[0].replace('[', '').replace(']', '');else index = '';
				vname = vname.replace(pattern1, ''); // route[1]=>route
				var predefined = ['_countdown', '_nexttime'];
				if (vname[0] == '_') {
					//predefined 
					if (index == '') index = 'auto';
					var result = _timeshower(me.currententry); // choose to show nexttime or countdown
					text = result[predefined.indexOf(vname) + 1];
					extrafield = result[0];
					minutesleft = result[4];
					if (predefined == 1) minutesleft = 1000; // if is nexttime, don't show progress indicator
					if (typeof text != 'string') // if not "Coming soon", do format
						text = text.Format_(index);
					return [text, extrafield, minutesleft];
				}
				if (me.data.timetable[me.tableindex].hasOwnProperty(vname)) {
					if (index != '') text = me.data.timetable[me.tableindex][vname][index].toString();else text = me.data.timetable[me.tableindex][vname].toString();
				} else if (me.data.hasOwnProperty(vname)) {
					if (index != '') text = me.data[vname][index].toString();else text = me.data[vname].toString();
				} else {
					text = v;
				}
				// console.log(vname+' '+index+' '+v[i]+' '+text);
				str = str.replace(v[i], text);
			}
			return [str, extrafield, minutesleft];
		};
		var _tableselector = function _tableselector() {
			var timetable = [];
			$.extend(timetable, me.data.timetable); // array copy
			for (var i = timetable.length - 1; i >= 0; i--) {
				timetable[i]['_id'] = i;
			}timetable.sort(function (a, b) {
				return b.priority - a.priority;
			}); // sort by priority, stable, the higher the prior
			for (var i = 0; i <= timetable.length - 1; i++) {
				var f = timetable[i].filter[0];
				if (f(timetable[i].filter[1])) return timetable[i]._id; // return the original index
			}
			return -1;
		};
		var _switchlanguage = function _switchlanguage(dst_lang) {
			// dst_lang must be lowercase
			// Map Language File of bus.js
			if (dst_lang === undefined) // translate() may return undefined if no language section is in the json file
				return;
			if (dst_lang !== me.language) {
				// check if a full-text match exists
				for (var key in me.dic.data) {
					key = key.toLowerCase();
					if (key === dst_lang) {
						me.language = key;
						break;
					}
				}
			}
			if (dst_lang != me.language) {
				// check if a language-based match exists   [lang]-[area] ---> zh-CN
				for (var key in me.dic) {
					if (key.slice(0, 2).toLowerCase() === dst_lang.slice(0, 2)) {
						me.language = key.toLowerCase();
						break;
					}
				}
			}
		};

		var me = {};
		me.container = container; // div box
		me.expand = false;
		me.tag = '_' + container.attr('id');
		me.data_static = null;
		me.data = data; // convert to JSON
		if (me.data['version'] > GLOBALVARS['version']) {
			console.log('*** New version of bus.js is needed. ***');
			return undefined;
		}

		me.language = language ? language.toLowerCase() : 'zh-cn';
		me.dic = new Dictionary(_language_json, me.language); // default language of bus.js

		me.data_static = JSON.parse(JSON.stringify(me.data)); // deep copy for backup and future translation
		me.data = preprocess(me.data); // convert abbr JSON to standard JSON

		me.select_lang = function (dst_lang) {
			// return the final selected language
			var json = me.data_static; // make a shallow copy first
			if (!json.hasOwnProperty('language')) {
				return dst_lang;
			}
			var src_lang = json.language.default.toLowerCase();
			dst_lang = dst_lang ? dst_lang.toLowerCase() : 'auto';

			if (src_lang === dst_lang) // don't need translation
				return dst_lang;

			var avail_lang_list = new Array();
			for (var i = 0; i < json.language.list.length; i++) {
				avail_lang_list.push(json.language.list[i].name.toLowerCase());
			}
			avail_lang_list.push(src_lang); // default language

			var nav_lang_list = navigator.languages ? navigator.languages.map(function (m) {
				return m.toLowerCase();
			}) : [];

			// Choose Language
			var final_dst_lang_index = -1;
			if (dst_lang != 'auto') {
				// a target language is set
				for (var i = 0; i < avail_lang_list.length; i++) {
					// full-text match
					if (avail_lang_list[i] === dst_lang) // zh-CN ---> zh-CN
						final_dst_lang_index = i;else continue;
					break;
				}
				if (final_dst_lang_index == -1) {
					for (var i = 0; i < avail_lang_list.length; i++) {
						// language-based match
						if (avail_lang_list[i].indexOf(dst_lang) !== -1) // en-US ---> en
							final_dst_lang_index = i;else if (avail_lang_list[i].slice(0, 2) === dst_lang.slice(0, 2)) // zh-CN ---> zh-HK
							final_dst_lang_index = i;else continue;
						break;
					}
				}
			} else {
				// no target language is set, read navigater.languages and manually match them
				for (var i = 0; i < nav_lang_list.length; i++) {
					// full-text match
					final_dst_lang_index = avail_lang_list.indexOf(nav_lang_list[i]);
					if (final_dst_lang_index !== -1) break;
				}
				if (final_dst_lang_index === -1) {
					// language-based match
					for (var i = 0; i < nav_lang_list.length; i++) {
						for (var j = avail_lang_list.length - 1; j >= 0; j--) {
							if (avail_lang_list[j].slice(0, 2) === nav_lang_list[i].slice(0, 2)) {
								final_dst_lang_index = j;
								break;
							}
						}
						if (final_dst_lang_index != -1) break;
					}
				}
			}
			if (final_dst_lang_index === -1) {
				// still no match, use navigator.browserLanguage or navigator.language
				dst_lang = navigator.browserLanguage ? navigator.browserLanguage.toLowerCase() : navigator.language.toLowerCase();
				final_dst_lang_index = avail_lang_list.indexOf(dst_lang);
			}

			if (final_dst_lang_index === -1) // unable to decide a target language, use default language
				return src_lang;

			if (final_dst_lang_index === avail_lang_list.length - 1) // final one is default language, don't need translation
				return dst_lang;else dst_lang = json.language.list[final_dst_lang_index].name.toLowerCase();

			if (src_lang === dst_lang) // don't need translation
				return dst_lang;

			// Fetch Language
			$.ajax({
				url: json.language.list[final_dst_lang_index].url,
				success: function success(json_ajax) {
					var dictionary = JSON.parse(json_ajax);
					// Translation
					var inner_translate = function inner_translate(json) {
						for (var prop in json) {
							if (prop === 'filter' || prop === 'property' || prop === 'language' || prop === 'time') continue;
							if (typeof json[prop] === 'string') json[prop] = dictionary[json[prop]] ? dictionary[json[prop]] : json[prop];else if (_typeof(json[prop]) === 'object') for (var element in json[prop]) {
								inner_translate(json[prop]);
							} else // number, boolean, undefined, function
								continue;
						}
					};

					json = JSON.parse(JSON.stringify(me.data_static)); // make a deep, copy, make on copy first
					preprocess(json);
					inner_translate(json);

					me.data = json; // replace real data with this translated copy

					// UI Update
					_switchlanguage(dst_lang);
					me.update(2); // static
					me.update(0); // daily
				},
				dataType: "text",
				cache: true
			});
			return dst_lang;
		};
		me.select_lang(language);

		me.tableindex = _tableselector(); // timetable index for today
		me.instant_buffer = []; // buffer of indicators
		me.daily_buffer = [];
		me.currententry = _timeshower(0)[0]; // index for highlight
		me.update = function (mode) {
			// ones digit - 0=dailyupdate, 1=instantupdate, 2=staticdataupdate; twos digit - 0=nothing, 1=settimer when onesdigit is 0
			if (mode % 10 == 1) {
				me.container.children('div.Top-container').children('div.Progress-indicator').removeClass('warning-indicator');
				me.container.children('div.Top-container').children('div.Progress-indicator').removeClass('notice-indicator');
				for (var i = me.instant_buffer.length - 1; i >= 0; i--) {
					var result = _stringformatter(me.instant_buffer.eq(i).attr('formatter'));
					me.instant_buffer.eq(i).text(result[0]);
					if (result[2] != undefined) {
						me.container.children('div.Top-container').children('div.Progress-indicator').attr('tag', result[3]);
						if (result[2] < 2) {
							me.container.children('div.Top-container').children('div.Progress-indicator').addClass('warning-indicator');
						} else if (result[2] < 10) {
							me.container.children('div.Top-container').children('div.Progress-indicator').addClass('notice-indicator');
						}
					}
					if (result[1] != undefined) {
						if (me.currententry != result[1]) {
							// update class highlight
							me.container.find('div#tabview' + me.tableindex + me.tag).find('div#i' + me.currententry).removeClass('highlight');
							me.container.find('div#tabview' + me.tableindex + me.tag).find('div#i' + me.currententry).addClass('lowlight');
							me.container.find('div#tabview' + me.tableindex + me.tag).find('div#i' + result[1]).addClass('highlight');
						}
						me.currententry = result[1];
					}
				}
			} else if (mode % 10 == 0) {
				for (var i = me.daily_buffer.length - 1; i >= 0; i--) {
					var result = _stringformatter(me.daily_buffer.eq(i).attr('formatter'));
					me.daily_buffer.eq(i).text(result[0]);
				}
				me.container.children('div.Top-container').children('div.Progress-indicator').removeClass('warning-indicator');
				me.container.children('div.Top-container').children('div.Progress-indicator').removeClass('notice-indicator');
				me.container.find().removeClass('highlight');
				me.container.find().removeClass('lowlight');
				me.container.find().removeClass('bolder');
				me.tableindex = _tableselector();
				me.currententry = _timeshower(0)[0];
				if (me.tableindex == -1) me.container.children('div.Bottom-container').find('a[href="#businfo' + me.tag + '"]').trigger('click').addClass('text-bold');else me.container.children('div.Bottom-container').find('a[href="#tabview' + me.tableindex + me.tag + '"]').trigger('click').addClass('text-bold');

				for (var i = 0; i < me.currententry; i++) {
					me.container.find('div#tabview' + me.tableindex + me.tag).find('div#i' + i).addClass('lowlight');
				}
				me.container.find('div#tabview' + me.tableindex + me.tag).find('div#i' + me.currententry).addClass('highlight');
				if (parseInt(mode / 10) % 10 == 1) {
					var now = new Date();
					window.setTimeout(function () {
						global_update(10);
					}, (86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())) * 1000);
				}
			} else if (mode % 10 == 2) {
				// Fill in static contents
				var tablist = $('<ul class="nav nav-tabs" role="tablist"></ul>');
				var tabcontent = $('<div class="tab-content"></div>');
				for (var i = 0; i < me.data.timetable.length; i++) {
					var tabhref = 'tabview' + i;
					var tabname = me.data.timetable[i].title;
					var tab = $('<li role="presentation"><a href="#' + tabhref + me.tag + '" aria-controls="' + tabhref + me.tag + '" role="tab" data-toggle="tab">' + tabname + '</a></li>');
					tablist.append(tab);

					var tabpanel = $('<div role="tabpanel" class="tab-pane"></div>').attr('id', tabhref + me.tag);
					var whiteshadowbox = $('<div class="box-inner-shadow"></div>');
					var entriescontainer = $('<div class="Entries-container"></div>');
					for (var j = 0; j < me.data.timetable[i].schedule.length; j++) {
						var entry = $('<div class="Entry"></div>').attr('id', 'i' + j);
						var entrycenter = $('<div class="Entry-center"></div>');
						var entrytime = $('<div class="Entry-time"></div>');
						entrytime.text(me.data.timetable[i].schedule[j].time);
						entrycenter.append(entrytime);
						if (me.data.timetable[i].schedule[j].text != undefined) {
							var entrytext = $('<div class="Entry-text"></div>');
							entrytext.text(me.data.timetable[i].schedule[j].text);
							entrycenter.append(entrytext);
						}
						entry.append(entrycenter);
						entriescontainer.append(entry);
					}
					// tabpanel.append(whiteshadowbox);
					tabpanel.append(entriescontainer);
					tabcontent.append(tabpanel);
				}
				if (isshowbusinfo) {
					var tab = $('<li role="presentation"><a href="#businfo' + me.tag + '" aria-controls="businfo' + me.tag + '" role="tab" data-toggle="tab">' + me.dic.fetch(me.language)._businfo + '</a></li>');
					var tabpanel = $('<div role="tabpanel" class="tab-pane"></div>').attr('id', 'businfo' + me.tag);
					var entriescontainer = $('<div class="Entries-container"></div>');
					var listgroup = $('<ul class="list-group padding"></ul>');

					listgroup.append($('<li class="list-group-item"></li>').text(me.dic.fetch(me.language)._category + me.data.name));
					listgroup.append($('<li class="list-group-item"></li>').text(me.dic.fetch(me.language)._route + me.data.route.join(" => ")));
					listgroup.append($('<li class="list-group-item"></li>').text(me.dic.fetch(me.language)._lastupdate + me.data.lastupdate));

					entriescontainer.append(listgroup);
					tablist.prepend(tab);
					tabpanel.append(entriescontainer);
					tabcontent.prepend(tabpanel);
				}
				me.container.children('div.Bottom-container').empty();
				me.container.children('div.Bottom-container').append(tablist).append(tabcontent);
			}
		};

		me.instant_buffer = me.container.children('div.Top-container').children('div[formatter*="{_"]'); // formatter contains '{_'
		me.daily_buffer = me.container.children('div.Top-container').children().not('div[formatter*="{_"]');

		me.update(2); // static
		me.update(10); // daily
		me.update(1); // instant
		GLOBALVARS['all_ifbds'].push(me);
		return me;
	}
};

function preprocess(json) {
	for (var t = json.timetable.length - 1; t >= 0; t--) {
		// use 'in' ?
		for (var s = json.timetable[t].schedule.length - 1; s >= 0; s--) {
			if (typeof json.timetable[t].schedule[s] == 'string') {
				// convert simple string format into JSON
				var p = {
					'time': json.timetable[t].schedule[s],
					'property': 'accurate'
				};
				json.timetable[t].schedule[s] = p;
			}
			if (json.timetable[t].schedule[s].hasOwnProperty('text')) {
				// convert abbr index into actual text
				if (typeof json.timetable[t].schedule[s].text == 'number') json.timetable[t].schedule[s].text = json.timetable[t].text[json.timetable[t].schedule[s].text];
			} else {
				json.timetable[t].schedule[s].text = undefined;
			}
		}
		json.timetable[t].filter = _datefilter(json.timetable[t].filter); // convert abbr to a pre-defined function
	}
	return json;
}

function _datefilter(filter) {
	// converter every possible input into a filter function
	var is_work_day = function is_work_day(date_str) {
		// 0 - workday, 1 - weekend, 2 - holiday
		// var holidays_2017 = new Array("2017/1/1","2017/1/2","2017/1/27","2017/1/28","2017/1/29","2017/1/30","2017/1/31","2017/2/1","2017/2/2","2017/4/2","2017/4/3","2017/4/4","2017/4/29","2017/4/30","2017/5/1","2017/5/28","2017/5/29","2017/5/30","2017/10/1","2017/10/2","2017/10/3","2017/10/4","2017/10/5","2017/10/6","2017/10/7","2017/10/8");
		// var ex_workdays_2017 = new Array("2017/1/22","2017/2/4","2017/4/1","2017/5/27","2017/9/30");
		var holidays_2018 = new Array("2018/1/1", "2018/2/15", "2018/2/16", "2018/2/17", "2018/2/18", "2018/2/19", "2018/2/20", "2018/2/21", "2018/4/5", "2018/4/6", "2018/4/7", "2018/4/29", "2018/4/30", "2018/5/1", "2018/6/18", "2018/9/24", "2018/10/1", "2018/10/2", "2018/10/3", "2018/10/4", "2018/10/5", "2018/10/6", "2018/10/7");
		var ex_workdays_2018 = new Array("2018/2/11", "2018/2/24", "2018/4/8", "2018/4/28", "2018/9/29", "2018/9/30");
		var this_date;
		if (date_str == undefined) this_date = new Date();else this_date = new Date(date_str);
		date_str = this_date.getFullYear() + '/' + (this_date.getMonth() + 1) + '/' + this_date.getDate();
		if (holidays_2018.indexOf(date_str) != -1) return 2;
		if (ex_workdays_2018.indexOf(date_str) != -1) return 0;
		if (this_date.getDay() == 6 || this_date.getDay() == 0) return 1;else return 0;
	};
	var _weekdayfilter = function _weekdayfilter() {
		// filter = "weekday"
		return is_work_day() == 0;
	};
	var _holidayfilter = function _holidayfilter() {
		// filter = "holiday"
		return !_weekdayfilter();
	};
	var _dayfilter = function _dayfilter(date) {
		// filter = "2016/12/7" or "Thu"
		var d = new Date();
		date = date.toLowerCase();
		var day = ['sun', 'mon', 'tue', 'thu', 'fri', 'sat'];
		if (day.indexOf(date) != -1) d = day[d.getDay()];else d = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
		return date == d;
	};
	var _mixedfilter = function _mixedfilter(list) {
		// filter = ["2016/12/7", "weekday", ...]
		var temp = false;
		for (var i = list.length - 1; i >= 0; i--) {
			if (list[i] == 'weekday') temp = _weekdayfilter();else if (list[i] == 'holiday') temp = _holidayfilter();else if (typeof list[i] == 'string') temp = _dayfilter(list[i]);else if (typeof list[i] == 'function') temp = list[i]();
			if (temp) return true;
		}
		return false;
	};

	if (typeof filter == 'function') // filter is a function which should return true or false
		return [filter, undefined];else if (typeof filter == 'boolean') return [function (ret) {
		return ret;
	}, filter];else if (filter == 'weekday') return [_weekdayfilter, undefined];else if (filter == 'holiday') return [_holidayfilter, undefined];else if (typeof filter == 'string') // cannot deliver a fixed-parameter function... check, sol found
		return [_dayfilter, filter];else return [_mixedfilter, filter];
};

function global_update(mode) {
	for (var i = GLOBALVARS['all_ifbds'].length - 1; i >= 0; i--) {
		GLOBALVARS['all_ifbds'][i].update(mode);
	}
}

var now = new Date();

var id = window.setInterval(function () {
	global_update(1);
}, 1000);
var id2 = window.setTimeout(function () {
	global_update(0);
}, 86400000 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000);

//JAVASCRIPT IN HTML
// $(document).ready(function(){
// 	var containers = $('.Infoboard'); // elements id = Infoboard
// 	var ifbds = new Array(containers.length);
// 	for (var i = containers.length - 1; i >= 0; i--) {
// 		ifbds[i] = Infoboard.init(containers[i], )

// 	}
// });
//http://www.ruanyifeng.com/blog/2012/07/three_ways_to_define_a_javascript_class.html


// 对Date的扩展，将 Date 转化为指定格式的String 
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
// 例子： 
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
Date.prototype.Format_ = function (fmt) {
	//author: meizz 
	if (fmt == '---:--') return this.getUTCHours() * 60 + this.getUTCMinutes() + ':' + this.Format_('ss');else if (fmt == 'auto') return (this.getUTCHours() == 0 ? '' : this.getUTCHours() + ':') + this.Format_('mm:ss');
	var o = {
		"M+": this.getUTCMonth() + 1, //月份 
		"d+": this.getUTCDate(), //日 
		"h+": this.getUTCHours(), //小时 
		"m+": this.getUTCMinutes(), //分 
		"s+": this.getUTCSeconds(), //秒 
		"q+": Math.floor((this.getUTCMonth() + 3) / 3), //季度 
		"S": this.getUTCMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getUTCFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
	}return fmt;
};
Date.prototype.Format = function (fmt) {
	//author: meizz 
	var o = {
		"M+": this.getMonth() + 1, //月份 
		"d+": this.getDate(), //日 
		"h+": this.getHours(), //小时 
		"m+": this.getMinutes(), //分 
		"s+": this.getSeconds(), //秒 
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度 
		"S": this.getMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
	}return fmt;
};