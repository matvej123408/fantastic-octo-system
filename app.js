let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// режимы
let stationMode = false;
let trackMode = false;

// данные
let stations = [];
let railPoints = [];
let speedLimits = [];
let trains = [];
let scheduleInterval = null;

// ===== ЗАГРУЗКА =====
function loadData(){
 let s = localStorage.getItem("stations");
 let r = localStorage.getItem("rails");
 let sp = localStorage.getItem("speeds");

 if(s) stations = JSON.parse(s);
 if(r) railPoints = JSON.parse(r);
 if(sp) speedLimits = JSON.parse(sp);

 stations.forEach(st => {
  L.marker(st).addTo(map);
 });

 if(railPoints.length > 1){
  L.polyline(railPoints, {color:'black'}).addTo(map);
 }
}

// ===== СОХРАНЕНИЕ =====
function saveData(){
 localStorage.setItem("stations", JSON.stringify(stations));
 localStorage.setItem("rails", JSON.stringify(railPoints));
 localStorage.setItem("speeds", JSON.stringify(speedLimits));
}

// ===== РЕЖИМЫ =====
function toggleStation(){
 stationMode = !stationMode;
 trackMode = false;
}

function toggleTrack(){
 trackMode = !trackMode;
 stationMode = false;
}

// ===== КЛИК =====
map.on('click', e => {

 // станции
 if(stationMode){
  let name = prompt("Название станции:");
  if(!name) return;

  L.marker(e.latlng).addTo(map).bindPopup(name);
  stations.push(e.latlng);
  saveData();
 }

 // рельсы
 if(trackMode){
  railPoints.push(e.latlng);

  if(railPoints.length > 1){
    L.polyline(railPoints, {color:'black'}).addTo(map);

    // скорость 30 или 45
    let speeds = [30, 45];
    let randomSpeed = speeds[Math.floor(Math.random()*speeds.length)];
    speedLimits.push(randomSpeed);

    saveData();
  }
 }

});

// ===== ПОЕЗДА =====
function spawnTrain(){
 if(railPoints.length < 2){
  alert("Сначала нарисуй рельсы");
  return;
 }

 let train = {
  marker: L.circleMarker(railPoints[0], {
    radius: 14,
    color: 'black'
  }).addTo(map),

  index: 0,
  t: 0,
  speed: 0
 };

 trains.push(train);
}

// ===== РАСПИСАНИЕ =====
function startSchedule(){
 if(scheduleInterval) return;

 let minutes = prompt("Интервал (мин):", "15");
 if(!minutes) return;

 scheduleInterval = setInterval(() => {
  spawnTrain();
 }, minutes * 60000);
}

// ===== ДВИЖЕНИЕ =====
function updateTrains(){

 trains.forEach(train => {

  let i = train.index;

  let start = railPoints[i];
  let end = railPoints[(i+1) % railPoints.length];

  let limit = speedLimits[i] || 45;

  // перевод скорости (условный)
  let targetSpeed = limit / 100000;

  // разгон / торможение
  if(train.speed < targetSpeed){
    train.speed += 0.00001;
  } else {
    train.speed -= 0.00001;
  }

  train.t += train.speed;

  // плавность
  let ease = Math.sin(train.t * Math.PI / 2);

  let lat = start.lat + (end.lat - start.lat) * ease;
  let lng = start.lng + (end.lng - start.lng) * ease;

  train.marker.setLatLng([lat, lng]);

  if(train.t >= 1){
    train.t = 0;
    train.index = (train.index + 1) % railPoints.length;
  }

 });

}

setInterval(updateTrains, 30);

// ===== ОЧИСТКА =====
function clearAll(){
 localStorage.clear();
 location.reload();
}

// запуск
loadData();
