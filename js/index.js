(function($){$.clock={version:"2.0.2",locale:{}};t=[];$.fn.clock=function(d){var c={it:{weekdays:["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"],months:["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]},en:{weekdays:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],months:["January","February","March","April","May","June","July","August","September","October","November","December"]},es:{weekdays:["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],months:["Enero","Febrero","Marzo","Abril","May","junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]},de:{weekdays:["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],months:["Januar","Februar","März","April","könnte","Juni","Juli","August","September","Oktober","November","Dezember"]},fr:{weekdays:["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"],months:["Janvier","Février","Mars","Avril","May","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]},ru:{weekdays:["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],months:["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]}};return this.each(function(){$.extend(c,$.clock.locale);d=d||{};d.timestamp=d.timestamp||"z";y=new Date().getTime();d.sysdiff=0;if(d.timestamp!="z"){d.sysdiff=d.timestamp-y}d.langSet=d.langSet||"en";d.format=d.format||((d.langSet!="en")?"24":"12");d.calendar=d.calendar||"true";d.seconds=d.seconds||"true";if(!$(this).hasClass("jqclock")){$(this).addClass("jqclock")}var e=function(g){if(g<10){g="0"+g}return g},f=function(j,n){var r=$(j).attr("id");if(n=="destroy"){clearTimeout(t[r])}else{m=new Date(new Date().getTime()+n.sysdiff);var p=m.getHours(),l=m.getMinutes(),v=m.getSeconds(),u=m.getDay(),i=m.getDate(),k=m.getMonth(),q=m.getFullYear(),o="",z="",w=n.langSet;if(n.format=="12"){o=" AM";if(p>11){o=" PM"}if(p>12){p=p-12}if(p==0){p=12}}p=e(p);l=e(l);v=e(v);if(n.calendar!="false"){z=((w=="en")?"<span class='clockdate'>"+c[w].weekdays[u]+", "+c[w].months[k]+" "+i+", "+q+"</span>":"<span class='clockdate'>"+c[w].weekdays[u]+", "+i+" "+c[w].months[k]+" "+q+"</span>")}$(j).html(z+"<span class='clocktime'>"+p+":"+l+(n.seconds=="true"?":"+v:"")+o+"</span>");t[r]=setTimeout(function(){f($(j),n)},1000)}};f($(this),d)})};return this})(jQuery);

var direccion="http://www.biobiochile.cl/static/masleido.json";
var i = 0;
var j = 0;
var reproductor = null;
var db;
var videos = null;
var boolGC = false;
var boolVideo = false;
var GC = false;
var linkVideo = false;

$(document).ready(function() {
	db = new PouchDB('my_database');
	$("#time").clock({
		"calendar":"false",
		"seconds":"false"
	});
	$("video").height(document.documentElement.clientHeight-110);
	$('video').mediaelementplayer({
		success: function(media, node, player) {
			reproductor = player;
			$.get( "http://190.121.26.165/local", function( data ) {
				var datos = JSON.parse(data);
				db.destroy().then(function(){
					db = new PouchDB('my_database');
					for(var t in datos){
						db.post({
							archivo: datos[t]
						}).then(function (response) {
	  						db.allDocs({include_docs: true, descending: true}, function(err, doc) {
	    						videos = doc;
	    						reproducir();
	    					});
						});
					}
				});
			}).fail(function() {
	    		db.allDocs({include_docs: true, descending: true}, function(err, doc) {
					videos = doc;
					reproducir();
				});
	  		});

		}
	});
	var ws = new WebSocket("ws://190.121.26.165:8000");
	ws.onmessage = function(e){
		var datos = JSON.parse(e.data);
		var comando = parseInt(datos.comando);
		switch(comando){
			case 1:
				db.post({
					archivo: datos.archivo
				}).then(function (response) {
  					db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    					videos = doc;
    				});
				});
				break;
			case 2:
				var flagGC=false;
				var flagVideo = false;
				if(boolGC != datos.boolGC)
					flagGC=true;
				if(boolVideo != datos.boolVideo)
					flagVideo=true;
				boolGC = datos.boolGC;
				boolVideo = datos.boolVideo;
				try{
					if(flagGC || GC!=datos.gcManual){
						GC = datos.gcManual;
						setNoticia();
					}
					linkVideo = datos.linkManual;
					if(flagVideo )
						reproducir();

				}catch(err){}
				break;
			case 3:
				playManual(datos.archivo);
				break;
			case 4:
				db.find({
  					selector: {archivo: {$eq: datos.archivo}}
				}, function (err, result) {
					console.log(result);
    				db.remove(result.docs[0], function(err, response) {
    					db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    						videos = doc;
    					});
    				});
				});
		}
	}
	ws.onopen = function(e){

	}
	$("video").on('ended',function(){
		reproducir();
	})
	getMasLeidos();
	setWeather();
	setInterval(setWeather,30*60*1000);
	setInterval(getMasLeidos,5*60*1000);
	setInterval(setNoticia,10*1000);

});


function reproducir(){
	setTimeout(function(){
		if(boolVideo)
			playManual(linkVideo);
		else{
			if(videos.total_rows>0){
				reproductor.setSrc(videos.rows[j].doc.archivo);
				reproductor.play();
				j++;
				if(j==videos.total_rows)
					j=0;
			}
		}
	},1000);


}

function playManual(url){
	reproductor.pause();
	reproductor.setSrc(url);
	reproductor.play();
}

function setWeather(){
	$.simpleWeather({
		location: '',
		woeid: '56048600',
		unit: 'c',
		success: function(weather) {
			html = '<i class="icon-'+weather.code+'"></i>'+weather.temp+'&deg;'+weather.units.temp;

			$("#weather").html(html);
		},
		error: function(error) {
			$("#weather").html('---');
		}
	});
}

function setNoticia(){
	if (nacional.length==0)
		return;
	if(boolGC){
		$("#titular").html(GC);
		return;
	}

	$("#titular").html(nacional[i].titulo);
	i++;
	if (i==nacional.length)
		i=0;
}

function getMasLeidos(){
	$.get( direccion, function( data ) {
		nacional = data.masNacional;
		setNoticia();
	});
}
