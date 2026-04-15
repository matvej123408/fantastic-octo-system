let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== ДАННЫЕ =====
let stations = [];
let railPoints = [];
let smoothRail = [];
let speedLimits = [];
let trains = [];
let signals = [];

let stationMode=false;
let trackMode=false;
let signalMode=false;

// ===== UI =====
function toggleStation(){
 stationMode=!stationMode;
 trackMode=false;
 signalMode=false;
}

function toggleTrack(){
 trackMode=!trackMode;
 stationMode=false;
 signalMode=false;
}

function toggleSignal(){
 signalMode=!signalMode;
 stationMode=false;
 trackMode=false;
}

// ===== СГЛАЖИВАНИЕ РЕЛЬС =====
function smoothLine(points){
 let result = [];

 for(let i=0;i<points.length-1;i++){
  let p1 = points[i];
  let p2 = points[i+1];

  for(let t=0;t<1;t+=0.1){
    let lat = p1.lat + (p2.lat-p1.lat)*t;
    let lng = p1.lng + (p2.lng-p1.lng)*t;
    result.push([lat,lng]);
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

  let marker = L.marker(e.latlng).addTo(map).bindPopup(name);

  stations.push({
    pos: e.latlng,
    name: name
  });
 }

 // рельсы
 if(trackMode){
  railPoints.push(e.latlng);

  if(railPoints.length>1){
    smoothRail = smoothLine(railPoints);

    L.polyline(smoothRail,{color:'black'}).addTo(map);

    let speeds = [45,60];
    speedLimits.push(speeds[Math.floor(Math.random()*2)]);
  }
 }

 // светофор
 if(signalMode){
  let signal = L.circleMarker(e.latlng,{
    radius:6,
    color:'red'
  }).addTo(map);

  signals.push({
    pos: e.latlng,
    busy:false,
    marker:signal
  });
 }

});

// ===== ПОЕЗД =====
function spawnTrain(){

 if(smoothRail.length < 2){
  alert("Сначала построй рельсы");
  return;
 }

 let train = {
  marker: L.circleMarker(smoothRail[0],{
    radius:14,
    color:'black'
  }).addTo(map),

  index:0,
  t:0,
  speed:0,
  stopped:false,
  wait:0
 };

 trains.push(train);
}

// ===== ПРОВЕРКА СИГНАЛОВ =====
function checkSignal(train){

 let pos = train.marker.getLatLng();

 for(let s of signals){
  let dist = map.distance(pos, s.pos);

  if(dist < 50){
    if(s.busy){
      return true; // стоп
    } else {
      s.busy = true;
      s.marker.setStyle({color:'green'});
      return false;
    }
  }
 }

 return false;
}

// ===== ОСТАНОВКА НА СТАНЦИИ =====
function checkStation(train){

 let pos = train.marker.getLatLng();

 for(let st of stations){
  let dist = map.distance(pos, st.pos);

  if(dist < 60){
    train.stopped = true;
    train.wait = 200; // ~6 секунд
    return true;
  }
 }

 return false;
}

// ===== ДВИЖЕНИЕ =====
function updateTrains(){

 trains.forEach(train=>{

  if(train.stopped){
    train.wait--;

    if(train.wait <= 0){
      train.stopped = false;
    }
    return;
  }

  // сигнал
  if(checkSignal(train)){
    return;
  }

  // станция
  if(checkStation(train)){
    return;
  }

  let start = smoothRail[train.index];
  let end = smoothRail[(train.index+1)%smoothRail.length];

  let limit = speedLimits[train.index] || 60;

  let targetSpeed = limit / 100000;

  if(train.speed < targetSpeed){
    train.speed += 0.00002;
  } else {
    train.speed -= 0.00002;
  }

  train.t += train.speed;

  let lat = start[0] + (end[0]-start[0]) * train.t;
  let lng = start[1] + (end[1]-start[1]) * train.t;

  train.marker.setLatLng([lat,lng]);

  if(train.t >= 1){
    train.t = 0;
    train.index = (train.index + 1) % smoothRail.length;
  }

 });

}

setInterval(updateTrains, 30);
