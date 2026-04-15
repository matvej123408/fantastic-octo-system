let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== ДАННЫЕ =====
let stations = [];
let railPoints = [];
let smoothRail = [];
let speedLimits = [];
let signals = [];
let trains = [];

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
function toggleStation(){ stationMode=!stationMode; trackMode=false; signalMode=false; }
function toggleTrack(){ trackMode=!trackMode; stationMode=false; signalMode=false; }
function toggleSignal(){ signalMode=!signalMode; stationMode=false; trackMode=false; }

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

 if(stationMode){
  let name = prompt("Название станции:");
  if(!name) return;

  L.marker(e.latlng).addTo(map).bindPopup(name);
  stations.push({pos:e.latlng,name});
  saveData();
 }

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

 if(signalMode){
  let m=L.circleMarker(e.latlng,{radius:6,color:'red'}).addTo(map);

  signals.push({pos:e.latlng,busy:false,marker:m});
  saveData();
 }

});

// ===== ПОЕЗД =====
function spawnTrain(){

 let train = {
  marker:L.circleMarker(smoothRail[0],{radius:14,color:'black'}).addTo(map),
  index:0,
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

// ===== ДВИЖЕНИЕ =====
function updateTrains(){

 trains.forEach(train=>{

  if(train.stopped){
    train.wait--;
    if(train.wait<=0) train.stopped=false;
    return;
  }

  let pos=train.marker.getLatLng();

  // станции
  for(let st of stations){
    if(map.distance(pos,st.pos)<60){
      train.stopped=true;
      train.wait=200;
      return;
    }
  }

  let start=smoothRail[train.index];
  let end=smoothRail[(train.index+1)%smoothRail.length];

  let limit=speedLimits[train.index]||60;
  let target=limit/100000;

  if(train.speed<target) train.speed+=0.00002;
  else train.speed-=0.00002;

  train.t+=train.speed;

  let lat=start[0]+(end[0]-start[0])*train.t;
  let lng=start[1]+(end[1]-start[1])*train.t;

  train.marker.setLatLng([lat,lng]);

  if(train.t>=1){
    train.t=0;
    train.index=(train.index+1)%smoothRail.length;
  }

 });

}

setInterval(updateTrains,30);

// ===== СОХРАНЕНИЕ =====
function saveData(){
 localStorage.setItem("data", JSON.stringify({
  stations, railPoints, speedLimits, signals
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

 // перерисовка
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

// авто загрузка
loadData();
