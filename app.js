let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let stationMode=false;
let trackMode=false;

let stations=[];
let railPoints=[];

function toggleStation(){
 stationMode=!stationMode;
 trackMode=false;
}

function toggleTrack(){
 trackMode=!trackMode;
 stationMode=false;
}

map.on('click', e=>{
 if(stationMode){
  let name = prompt("Название станции:");
  if(!name) return;
  let m = L.marker(e.latlng).addTo(map).bindPopup(name);
  stations.push(e.latlng);
 }

 if(trackMode){
  railPoints.push(e.latlng);
  if(railPoints.length>1){
    L.polyline(railPoints,{color:'black'}).addTo(map);
  }
 }
});

// === ПОЕЗДА ===

let trains=[];

function spawnTrain(){
 if(railPoints.length<2){
  alert("Нарисуй рельсы");
  return;
 }

 let train = {
  marker: L.circleMarker(railPoints[0], {radius:7,color:'black'}).addTo(map),
  index:0,
  t:0,
  speed:0.002
 };

 trains.push(train);
}

function updateTrains(){
 trains.forEach(train=>{
  let i = train.index;
  let start = railPoints[i];
  let end = railPoints[(i+1)%railPoints.length];

  // плавный разгон
  train.t += train.speed;

  let ease = Math.sin(train.t * Math.PI/2);

  let lat = start.lat + (end.lat-start.lat)*ease;
  let lng = start.lng + (end.lng-start.lng)*ease;

  train.marker.setLatLng([lat,lng]);

  if(train.t>=1){
    train.t=0;
    train.index=(train.index+1)%railPoints.length;
  }
 });
}

setInterval(updateTrains, 30);
