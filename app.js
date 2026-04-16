// ===== КАРТА =====
let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== ДАННЫЕ =====
let stations = [];
let railPoints = [];
let smoothRail = [];
let speedLimits = [];
let signals = [];
let trains = [];
let routes = [];

let currentRoute = [];
let routeMode = false;

let stationMode=false;
let trackMode=false;
let signalMode=false;

let scheduleInterval=null;

// ===== UI =====
function setStatus(text){
 document.getElementById("status").innerText = text;
}

function updateTrainList(){
 let div = document.getElementById("trainList");
 div.innerHTML = "";

 trains.forEach((t,i)=>{
  let el = document.createElement("div");
  el.innerHTML = "Поезд #" + (i+1);
  div.appendChild(el);
 });
}

// ===== РЕЖИМЫ =====
function toggleStation(){ stationMode=!stationMode; trackMode=false; signalMode=false; routeMode=false; }
function toggleTrack(){ trackMode=!trackMode; stationMode=false; signalMode=false; routeMode=false; }
function toggleSignal(){ signalMode=!signalMode; stationMode=false; trackMode=false; routeMode=false; }

function toggleRoute(){
 routeMode=!routeMode;
 stationMode=false;
 trackMode=false;
 signalMode=false;

 currentRoute = [];
 setStatus("Выбирай станции для маршрута");
}

// ===== СГЛАЖИВАНИЕ =====
function smoothLine(points){
 let result=[];
 for(let i=0;i<points.length-1;i++){
  let p1=points[i];
  let p2=points[i+1];

  for(let t=0;t<1;t+=0.1){
    result.push([
      p1.lat+(p2.lat-p1.lat)*t,
      p1.lng+(p2.lng-p1.lng)*t
    ]);
  }
 }
 return result;
}

// ===== КЛИК =====
map.on('click', e=>{

 // станции
 if(stationMode){
  let name = prompt("Название станции:");
  if(!name) return;

  L.marker(e.latlng).addTo(map).bindPopup(name);
  stations.push({pos:e.latlng,name});
  saveData();
 }

 // рельсы
 if(trackMode){
  railPoints.push(e.latlng);

  if(railPoints.length>1){
    smoothRail = smoothLine(railPoints);
    L.polyline(smoothRail,{color:'black'}).addTo(map);

    let speeds=[45,60];
    speedLimits.push(speeds[Math.floor(Math.random()*2)]);
    saveData();
  }
 }

 // светофор
 if(signalMode){
  let m=L.circleMarker(e.latlng,{radius:6,color:'red'}).addTo(map);
  signals.push({pos:e.latlng,busy:false,marker:m});
  saveData();
 }

 // маршрут
 if(routeMode){
  for(let st of stations){
    if(map.distance(e.latlng, st.pos) < 50){
      currentRoute.push(st);
      L.circleMarker(st.pos,{radius:10,color:'blue'}).addTo(map);
      setStatus("Станция добавлена");
    }
  }
 }

});

// ===== ЗАВЕРШИТЬ МАРШРУТ =====
function finishRoute(){

 if(currentRoute.length < 2){
  alert("Минимум 2 станции");
  return;
 }

 routes.push({
  stations: currentRoute
 });

 routeMode = false;
 setStatus("Маршрут создан");

 saveData();
}

// ===== ПОЕЗД =====
function spawnTrain(){

 if(routes.length === 0){
  alert("Сначала создай маршрут");
  return;
 }

 let id = prompt("Маршрут 1-" + routes.length);
 let route = routes[id-1];

 if(!route) return;

 let train = {
  route: route,
  stationIndex: 0,
  marker: L.circleMarker(route.stations[0].pos,{
    radius:14,
    color:'black'
  }).addTo(map),

  t:0,
  speed:0,
  stopped:false,
  wait:0
 };

 trains.push(train);
 updateTrainList();
}

// ===== РАСПИСАНИЕ =====
function startSchedule(){
 let min = prompt("Интервал (мин)", "15");

 scheduleInterval = setInterval(()=>{
  spawnTrain();
 }, min*60000);
}

// ===== СВЕТОФОР =====
function checkSignal(train){

 let pos = train.marker.getLatLng();

 for(let s of signals){
  let d = map.distance(pos, s.pos);

  if(d < 50){
    if(s.busy){
      return true;
    } else {
      s.busy = true;
      s.marker.setStyle({color:'green'});
      return false;
    }
  }
 }

 return false;
}

// ===== ДВИЖЕНИЕ =====
function updateTrains(){

 trains.forEach(train=>{

  if(train.stopped){
    train.wait--;
    if(train.wait<=0) train.stopped=false;
    return;
  }

  if(checkSignal(train)) return;

  let route = train.route;

  let start = route.stations[train.stationIndex].pos;
  let end = route.stations[(train.stationIndex+1)%route.stations.length].pos;

  let pos = train.marker.getLatLng();

  // остановка
  if(map.distance(pos,start) < 50){
    train.stopped = true;
    train.wait = 200;
    return;
  }

  // скорость 45-60
  let target = (45 + Math.random()*15) / 100000;

  if(train.speed < target) train.speed += 0.00002;
  else train.speed -= 0.00002;

  train.t += train.speed;

  let lat = start.lat + (end.lat-start.lat)*train.t;
  let lng = start.lng + (end.lng-start.lng)*train.t;

  train.marker.setLatLng([lat,lng]);

  if(train.t >= 1){
    train.t = 0;
    train.stationIndex = (train.stationIndex+1)%route.stations.length;
  }

 });

}

setInterval(updateTrains,30);

// ===== СОХРАНЕНИЕ =====
function saveData(){
 localStorage.setItem("data", JSON.stringify({
  stations, railPoints, speedLimits, signals, routes
 }));
 setStatus("Сохранено");
}

// ===== ЗАГРУЗКА =====
function loadData(){
 let data = localStorage.getItem("data");
 if(!data) return;

 let d = JSON.parse(data);

 stations = d.stations || [];
 railPoints = d.railPoints || [];
 speedLimits = d.speedLimits || [];
 signals = d.signals || [];
 routes = d.routes || [];

 stations.forEach(s=>L.marker(s.pos).addTo(map));

 smoothRail = smoothLine(railPoints);
 L.polyline(smoothRail,{color:'black'}).addTo(map);

 signals.forEach(s=>{
  s.marker = L.circleMarker(s.pos,{radius:6,color:'red'}).addTo(map);
 });

 setStatus("Загружено");
}

// ===== ОЧИСТКА =====
function clearAll(){
 localStorage.clear();
 location.reload();
}

// старт
loadData();
