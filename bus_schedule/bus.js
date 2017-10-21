;
// (function(){
// })();
var GLOBALVARS = {
	"plugin_name": "bus.js",
	"version": 1.3,
	"finish": false,
	"all_ifbds": [],
}

var Infoboard = {
	init: function (container, data, isshowbusinfo) {
		var _targettimecatcher = function (i) {
			var str;
			var property = me.data.timetable[me.tableindex].schedule[i].property;
			if (property == 'online') // future version
				str = undefined;
			str = me.data.timetable[me.tableindex].schedule[i].time
			str = (new Date).Format('yyyy/MM/dd') + ' ' + str;
			var targettime = new Date(str);
			if (property == 'accurate')
				return [targettime, targettime, 0];
			else if (property == 'estimate') {
				var estimate_delay = 0;
				if (me.data.timetable[me.tableindex].schedule[i].hasOwnProperty('estimate-delay'))
					estimate_delay = me.data.timetable[me.tableindex].schedule[i]['estimate-delay'];
				else
					estimate_delay = me.data.timetable[me.tableindex]['estimate-delay'];
				var targettime_withdelay = new Date();
				targettime_withdelay.setTime(targettime.getTime() + 60*1000*estimate_delay);
				return [targettime, targettime_withdelay, estimate_delay];
			}
		}
		var _timeshower = function(begin_index) {
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
					if (currenttime.getTime() > targettime.getTime())
						return [i, '正在驶来', '预计'+targettime_withdelay.Format('hh:mm')+'到达', estimate_delay, 10000]; //[currententry index, countdown, nexttime, estimate-delay in min, countdown in min]
					else         //  ↑targettime.Format_('mm:ss')+'对向发车'                                        ↑ not show is better...? cuz it's just an estimate..
						return [i, countdown, targettime.Format('hh:mm'), estimate_delay, countdown.getTime()/60/1000];
				}
			}
			return [i, '已停运', '已停运', undefined, undefined];
		}
		var _stringformatter = function (str) { // return [string to show, extrafield for currententry index, minutes left for the accurate next bus]
			var extrafield = undefined; // prepared for _countdown and _nexttime, transfer current index
			var minutesleft = undefined;
			var pattern0 = /\{(.+?)\}/g;
			var pattern1 = /\[(.+?)\]/g;
			var v = str.match(pattern0); // {route[1]}
			for (var i = v.length - 1; i >= 0; i--) {
				var text;
				var vname = v[i].replace('{','').replace('}',''); // {route[1]}=>route[1]
				var index = vname.match(pattern1)// [1]=>1
				if (index != null)
					index = index[0].replace('[','').replace(']','');
				else
					index = ''; 
				vname = vname.replace(pattern1, ''); // route[1]=>route
				var predefined = ['_countdown', '_nexttime'];
				if (vname[0] == '_') { //predefined 
					if (index == '')
						index = 'auto';
					var result = _timeshower(me.currententry); // choose to show nexttime or countdown
					text = result[predefined.indexOf(vname)+1];
					extrafield = result[0];
					minutesleft = result[4];
					if (predefined == 1) minutesleft = 1000; // if is nexttime, don't show progress indicator
					if (typeof text != 'string') // if not "Coming soon", do format
						text = text.Format_(index);
					return [text, extrafield, minutesleft];
				}
				if (me.data.timetable[me.tableindex].hasOwnProperty(vname)) {
					if (index != '')
						text = me.data.timetable[me.tableindex][vname][index].toString();
					else
						text = me.data.timetable[me.tableindex][vname].toString();
				} else if (me.data.hasOwnProperty(vname)) {
						if (index != '')
							text = me.data[vname][index].toString();
						else
							text = me.data[vname].toString();
				} else {
					text = v;
				}
				// console.log(vname+' '+index+' '+v[i]+' '+text);
				str = str.replace(v[i], text);
			}
			return [str, extrafield, minutesleft];
		};
		var _tableselector = function () {
			var timetable = [];
			$.extend(timetable, me.data.timetable);	// array copy
			for (var i = timetable.length - 1; i >= 0; i--)
				timetable[i]['_id'] = i;
			timetable.sort(function (a, b) {return b.priority - a.priority;}); // sort by priority, stable, the higher the prior
			for (var i = 0; i <= timetable.length - 1; i++) {
				var f = timetable[i].filter[0];
				if (f(timetable[i].filter[1]))
					return timetable[i]._id; // return the original index
			}
			return -1;
		}
		var me = {};
		me.container = container; // div box
		me.expand = false;
		me.tag = '_' + container.attr('id'); 
		me.data = eval(data); // convert to JSON
		if (me.data['version'] > GLOBALVARS['version']){
			console.log('*** New version of bus.js is needed. ***')
			return undefined;
		}

		$.ajax({
			url: './language.json',
			success: function(json) {
				me.dic = JSON.parse(json);
			}, //TODO: if failed
			dataType: "text",
			cache: true
		});
		me.language = 'zh-cn'; // default language of bus.js

		me.data = preprocess(me.data); // convert abbr JSON to standard JSON
		me.tableindex = _tableselector(); // timetable index for today
		me.instant_buffer = []; // buffer of indicators
		me.daily_buffer = [];
		me.currententry = _timeshower(0)[0]; // index for highlight
		me.update = function (mode) {
			if (mode == 1) {
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
						if (me.currententry != result[1]) { // update class highlight
							me.container.find('div#tabview'+me.tableindex+me.tag).find('div#i'+me.currententry).removeClass('highlight');
							me.container.find('div#tabview'+me.tableindex+me.tag).find('div#i'+me.currententry).addClass('lowlight');
							me.container.find('div#tabview'+me.tableindex+me.tag).find('div#i'+result[1]).addClass('highlight');
						}
						me.currententry = result[1];
					}
				}
			} else if (mode == 0) {
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
				if (me.tableindex == -1) 
					me.container.children('div.Bottom-container').find('a[href="#businfo'+me.tag+'"]').trigger('click').addClass('text-bold');
				else
					me.container.children('div.Bottom-container').find('a[href="#tabview'+me.tableindex+me.tag+'"]').trigger('click').addClass('text-bold');

				for (var i = 0; i < me.currententry; i++) {
					me.container.find('div#tabview'+me.tableindex+me.tag).find('div#i'+i).addClass('lowlight');
				}
				me.container.find('div#tabview'+me.tableindex+me.tag).find('div#i'+me.currententry).addClass('highlight');
				var now = new Date();
				window.setTimeout(function(){global_update(0)},(86400 - (now.getHours()*3600+now.getMinutes()*60+now.getSeconds()))*1000);
			}
		}

		// Fill in static contents
		me.instant_buffer = me.container.children('div.Top-container').children('div[formatter*="{_"]'); // formatter contains '{_'
		me.daily_buffer = me.container.children('div.Top-container').children().not('div[formatter*="{_"]');

		var tablist = $('<ul class="nav nav-tabs" role="tablist"></ul>');
		var tabcontent = $('<div class="tab-content"></div>');
		for (var i = 0; i < me.data.timetable.length; i++) {
			var tabhref = 'tabview' + i;
			var tabname = me.data.timetable[i].title;
			var tab = $('<li role="presentation"><a href="#'+tabhref+me.tag+'" aria-controls="'+tabhref+me.tag+'" role="tab" data-toggle="tab">'+tabname+'</a></li>');
			tablist.append(tab);

			var tabpanel = $('<div role="tabpanel" class="tab-pane"></div>').attr('id', tabhref+me.tag);
			var whiteshadowbox = $('<div class="box-inner-shadow"></div>');
			var entriescontainer = $('<div class="Entries-container"></div>');
			for (var j = 0; j < me.data.timetable[i].schedule.length; j++) {
				var entry = $('<div class="Entry"></div>').attr('id', 'i'+j);
					var entrycenter = $('<div class="Entry-center"></div>');
				var entrytime = $('<div class="Entry-time"></div>');
				entrytime.text(me.data.timetable[i].schedule[j].time);
				entrycenter.append(entrytime);
				if (me.data.timetable[i].schedule[j].text != undefined){
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
			var tab = $('<li role="presentation"><a href="#businfo'+me.tag+'" aria-controls="businfo'+me.tag+'" role="tab" data-toggle="tab">'+"班车信息"+'</a></li>');
			var tabpanel = $('<div role="tabpanel" class="tab-pane"></div>').attr('id', 'businfo'+me.tag);
			var entriescontainer = $('<div class="Entries-container"></div>');
			var listgroup = $('<ul class="list-group padding"></ul>');

			listgroup.append($('<li class="list-group-item"></li>').text("班车类别：" + me.data.name));
			listgroup.append($('<li class="list-group-item"></li>').text("行驶路线：" + me.data.route.join(" => ")));
			listgroup.append($('<li class="list-group-item"></li>').text("最后更新时间：" + me.data.lastupdate));

			entriescontainer.append(listgroup)
			tablist.prepend(tab);
			tabpanel.append(entriescontainer);
			tabcontent.prepend(tabpanel);

		}
		me.container.children('div.Bottom-container').append(tablist).append(tabcontent);

		me.update(0);
		me.update(1);
		GLOBALVARS['all_ifbds'].push(me);
		return me;
	}
}

function translate(json, dst_lang) {
	if (!json.hasOwnProperty('language')) {
		return;
	}
	var src_lang = json.language.default.toLowerCase();
	dst_lang = dst_lang?dst_lang.toLowerCase():'auto';

	var avail_lang_list = new Array();
	for (var i = 0; i < json.language.list.length; i++) {
		avail_lang_list.push(json.language.list[i].name.toLowerCase());
	}
	var nav_lang_list = navigator.languages;

// Choose Language
	var final_dst_lang_index = -1;
	if (dst_lang != 'auto') { // a target language is set
		for (var i = 0; i < avail_lang_list.length; i++) { // full-text match
			if (avail_lang_list[i] == dst_lang) // zh-CN ---> zh-CN
				final_dst_lang_index = i;
			else
				continue;
			break;
		}
		if (final_dst_lang_index == -1) {
			for (var i = 0; i < avail_lang_list.length; i++) { // language-based match
				if (avail_lang_list[i].indexOf(dst_lang) != -1) // en-US ---> en
					final_dst_lang_index = i;
				else if (avail_lang_list[i].slice(0, 2) == dst_lang.slice(0, 2)) // zh-CN ---> zh-HK
					final_dst_lang_index = i;
				else
					continue;
				break;
			}
		}
	} else { // no target language is set, read navigater.languages and manually match them
		for (var i = 0; i < nav_lang_list.length; i++) { // full-text match
			final_dst_lang_index = avail_lang_list.indexOf(nav_lang_list[i]);
			if (final_dst_lang_index != -1)
				break;
		}
		if (final_dst_lang_index == -1) { // language-based match
			for (var i = 0; i < nav_lang_list.length; i++) {
				for (var j = avail_lang_list.length - 1; j >= 0; j--) {
					if (avail_lang_list[j].slice(0, 2) == nav_lang_list[i].slice(0, 2)) {
						final_dst_lang_index = j;
						break;
					}
				}
				if (final_dst_lang_index != -1)
					break;
			}
		}
	}
	if (final_dst_lang_index == -1) { // still no match, use navigator.browserLanguage or navigator.language
		dst_lang = navigator.browserLanguage?navigator.browserLanguage:navigator.language;
		final_dst_lang_index = avail_lang_list.indexOf(nav_lang_list[i])
	}
	if (final_dst_lang_index == -1) // unable to detect a target language, use default language
		return json;
	dst_lang = json.language.list[final_dst_lang_index].name.toLowerCase();

	if (src_lang == dst_lang) // don't need translation
		return json;

// Fetch Language
	var dictionary;
	$.ajax({
		url: json.language.list[final_dst_lang_index].url,
		success: function(json) {
			dictionary = JSON.parse(json);
		}, //TODO: if failed
		dataType: "text",
		cache: true
	});

// Map Language File of bus.js
	if (dst_lang != me.language) { // check if a full-text match exists
		for (var key in me.dic) {
			if (key.toLowerCase() == dst_lang) {
				me.language = key;
				break;
			}
		}
	}
	if (dst_lang != me.language) { // check if a language-based match exists   [lang]-[area] ---> zh-CN
		for (var key in me.dic) {
			if (key.slice(0, 2).toLowerCase() == dst_lang.slice(0, 2)) {
				me.language = key;
				break;
			}
		}
	}

// Translation
	var inner_translate = function (json) {
			for (var prop in json) {
				if (prop == 'filter')
					continue;
				if (prop == 'property')
					continue;
				if (typeof json[prop] == 'string')
					json[prop] = dictionary[json[prop]]?dictionary[json[prop]]:json[prop];
				else if (typeof json[prop] == 'object')
					for (var element in json[prop])
						inner_translate(json[prop]);
				else // number, boolean, undefined, function
					continue;
		};
	inner_translate(json);
	return json;
}

function preprocess(json) {
	for (var t = json.timetable.length - 1; t >= 0; t--) { // use 'in' ?
		for (var s = json.timetable[t].schedule.length - 1; s >= 0; s--) {
			if (typeof json.timetable[t].schedule[s] == 'string') { // convert simple string format into JSON
				var p = {
					'time': json.timetable[t].schedule[s],
					'property': 'accurate',
				};
				json.timetable[t].schedule[s] = p;
			}
			if (json.timetable[t].schedule[s].hasOwnProperty('text')) { // convert abbr index into actual text
				if (typeof json.timetable[t].schedule[s].text == 'number') 
					json.timetable[t].schedule[s].text = json.timetable[t].text[json.timetable[t].schedule[s].text];
			} else {
				json.timetable[t].schedule[s].text = undefined;
			}
		}
		json.timetable[t].filter = _datefilter(json.timetable[t].filter); // convert abbr to a pre-defined function
	}	
	return json;
}

function _datefilter(filter) {		   // converter every possible input into a filter function
	var is_work_day = function (date_str) { // 0 - workday, 1 - weekend, 2 - holiday
		var holidays_2017 = new Array("2017/1/1","2017/1/2","2017/1/27","2017/1/28","2017/1/29","2017/1/30","2017/1/31","2017/2/1","2017/2/2","2017/4/2","2017/4/3","2017/4/4","2017/4/29","2017/4/30","2017/5/1","2017/5/28","2017/5/29","2017/5/30","2017/10/1","2017/10/2","2017/10/3","2017/10/4","2017/10/5","2017/10/6","2017/10/7","2017/10/8");
		var ex_workdays_2017 = new Array("2017/1/22","2017/2/4","2017/4/1","2017/5/27","2017/9/30");
		var this_date;
		if (date_str == undefined)
			this_date = new Date();
		else
			this_date = new Date(date_str)
		date_str = this_date.getFullYear()+'/'+(this_date.getMonth()+1)+'/'+this_date.getDate();
		if (holidays_2017.indexOf(date_str) != -1)
			return 2;
		if (ex_workdays_2017.indexOf(date_str) != -1)
			return 0;
		if (this_date.getDay() == 6 || this_date.getDay() == 0)
			return 1;
		else
			return 0;
	}
	var _weekdayfilter = function () { // filter = "weekday"
		return is_work_day() == 0;
	};
	var _holidayfilter = function () { // filter = "holiday"
		return !_weekdayfilter();
	};
	var _dayfilter = function (date) { // filter = "2016/12/7" or "Thu"
		var d = new Date();
		date = date.toLowerCase();
		var day = ['sun', 'mon', 'tue', 'thu', 'fri', 'sat'];
		if (day.indexOf(date) != -1)
			d = day[d.getDay()];
		else
			d = d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate();
		return date == d;
	};
	var _mixedfilter = function (list) { // filter = ["2016/12/7", "weekday", ...]
		var temp = false;
		for (var i = list.length - 1; i >= 0; i--) {
			if (list[i] == 'weekday')
				temp = _weekdayfilter();
			else if (list[i] == 'holiday')
				temp = _holidayfilter();
			else if (typeof list[i] == 'string')
				temp = _dayfilter(list[i]);
			else if (typeof list[i] == 'function')
				temp = list[i]();
			if (temp)
				return true;
		}
		return false;
	}

	if (typeof filter == 'function')   // filter is a function which should return true or false
		return [filter, undefined];
	else if (typeof filter == 'boolean')
		return [function(ret){return ret}, filter];
	else if (filter == 'weekday') 
		return [_weekdayfilter, undefined];
	else if (filter == 'holiday')
		return [_holidayfilter, undefined];
	else if (typeof filter == 'string') // cannot deliver a fixed-parameter function... check, sol found
		return [_dayfilter, filter];
	else
		return [_mixedfilter, filter];

};

function global_update(mode) {
	for (var i = GLOBALVARS['all_ifbds'].length - 1; i >= 0; i--) {
		GLOBALVARS['all_ifbds'][i].update(mode);
	}
}

var now = new Date();

var id = window.setInterval(function(){global_update(1)},1000);
var id2 = window.setTimeout(function(){global_update(0)},(86400000 - (now.getHours()*3600+now.getMinutes()*60+now.getSeconds())*1000));

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
Date.prototype.Format_ = function(fmt) 
{ //author: meizz 
	if (fmt == '---:--')
		return (this.getUTCHours()*60+this.getUTCMinutes())+':'+this.Format_('ss');
	else if (fmt == 'auto')
		return ((this.getUTCHours()==0)?(''):(this.getUTCHours()+':'))+this.Format_('mm:ss');
  var o = { 
    "M+" : this.getUTCMonth()+1,                 //月份 
    "d+" : this.getUTCDate(),                    //日 
    "h+" : this.getUTCHours(),                   //小时 
    "m+" : this.getUTCMinutes(),                 //分 
    "s+" : this.getUTCSeconds(),                 //秒 
    "q+" : Math.floor((this.getUTCMonth()+3)/3), //季度 
    "S"  : this.getUTCMilliseconds()             //毫秒 
  }; 
  if(/(y+)/.test(fmt)) 
    fmt=fmt.replace(RegExp.$1, (this.getUTCFullYear()+"").substr(4 - RegExp.$1.length)); 
  for(var k in o) 
    if(new RegExp("("+ k +")").test(fmt)) 
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length))); 
  return fmt; 
};
Date.prototype.Format = function(fmt) 
{ //author: meizz 
  var o = { 
    "M+" : this.getMonth()+1,                 //月份 
    "d+" : this.getDate(),                    //日 
    "h+" : this.getHours(),                   //小时 
    "m+" : this.getMinutes(),                 //分 
    "s+" : this.getSeconds(),                 //秒 
    "q+" : Math.floor((this.getMonth()+3)/3), //季度 
    "S"  : this.getMilliseconds()             //毫秒 
  }; 
  if(/(y+)/.test(fmt)) 
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
  for(var k in o) 
    if(new RegExp("("+ k +")").test(fmt)) 
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length))); 
  return fmt; 
};