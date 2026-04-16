// ===== КАРТА =====
let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== ДАННЫЕ =====
let stations = [];
let routes = [];
let trains = [];
let signals = [];

let currentRoute = [];
let mode = null;

// ===== UI =====
function setStatus(t){
 document.getElementById("status").innerText = t;
}

function updateRouteSelect(){
 let sel = document.getElementById("routeSelect");
 sel.innerHTML = "";

 routes.forEach((r,i)=>{
  let opt = document.createElement("option");
  opt.value = i;
  opt.innerText = "Маршрут " + (i+1);
  sel.appendChild(opt);
 });
}

// ===== РЕЖИМ =====
function setMode(m){
 mode = m;
 setStatus("Режим: " + m);

 if(m === "route"){
  currentRoute = [];
 }
}

// ===== КЛИК =====
map.on('click', e => {

 // ===== СТАНЦИИ =====
 if(mode === "station"){
  let name = document.getElementById("stationName").value;
  if(!name) return;

  let marker = L.marker(e.latlng).addTo(map).bindPopup(name);

  stations.push({
    pos: e.latlng,
    name: name,
    marker: marker
  });

  saveData();
 }

 // ===== СВЕТОФОР =====
 if(mode === "signal"){
  let m = L.circleMarker(e.latlng,{
    radius:6,
    color:'red'
  }).addTo(map);

  signals.push({
    pos:e.latlng,
    busy:false,
    marker:m
  });

  saveData();
 }

 // ===== МАРШРУТ =====
 if(mode === "route"){
  for(let st of stations){
    if(map.distance(e.latlng, st.pos) < 50){

      currentRoute.push(st);

      L.circleMarker(st.pos,{
        radius:10,
        color:'blue'
      }).addTo(map);

      setStatus("Станция добавлена в маршрут");
    }
  }
 }

});

// ===== СОЗДАНИЕ МАРШРУТА =====
function finishRoute(){

 if(currentRoute.length < 2){
  alert("Нужно минимум 2 станции");
  return;
 }

 routes.push({
  stations: [...currentRoute]
 });

 currentRoute = [];
 updateRouteSelect();

 saveData();
 setStatus("Маршрут создан");
}

// ===== СОЗДАНИЕ ПОЕЗДА =====
function spawnTrainUI(){

 let sel = document.getElementById("routeSelect");
 let route = routes[sel.value];

 if(!route || route.stations.length < 2){
  alert("Нет маршрута");
  return;
 }

 let train = {
  route: route,
  stationIndex: 0,
  progress: 0, // 0..1
  speed: 0,
  stopped: false,
  wait: 0,

  marker: L.circleMarker(route.stations[0].pos,{
    radius:14,
    color:'black'
  }).addTo(map)
 };

 trains.push(train);
}

// ===== СВЕТОФОР =====
function checkSignal(train){

 let pos = train.marker.getLatLng();

 for(let s of signals){
  let d = map.distance(pos, s.pos);

  if(d < 40){
    if(s.busy){
      return true;
    } else {
      s.busy = true;
      s.marker.setStyle({color:'green'});
    }
  }
 }

 return false;
}

// ===== ДВИЖЕНИЕ =====
function updateTrains(){

 trains.forEach(train => {

  // стоянка
  if(train.stopped){
    train.wait--;

    if(train.wait <= 0){
      train.stopped = false;
    }
    return;
  }

  // сигнал
  if(checkSignal(train)) return;

  let route = train.route;

  let start = route.stations[train.stationIndex].pos;
  let nextIndex = (train.stationIndex + 1) % route.stations.length;
  let end = route.stations[nextIndex].pos;

  let pos = train.marker.getLatLng();

  // остановка на станции
  if(map.distance(pos, start) < 20 && train.progress === 0){
    train.stopped = true;
    train.wait = 150; // ~5 сек
    return;
  }

  // скорость 45–60
  let targetSpeed = (45 + Math.random()*15) / 50000;

  // разгон
  if(train.speed < targetSpeed){
    train.speed += 0.00005;
  } else {
    train.speed -= 0.00005;
  }

  train.progress += train.speed;

  if(train.progress > 1){
    train.progress = 0;
    train.stationIndex = nextIndex;
  }

  // движение
  let lat = start.lat + (end.lat - start.lat) * train.progress;
  let lng = start.lng + (end.lng - start.lng) * train.progress;

  train.marker.setLatLng([lat, lng]);

 });

}

setInterval(updateTrains, 30);

// ===== СОХРАНЕНИЕ =====
function saveData(){
 localStorage.setItem("data", JSON.stringify({
  stations: stations.map(s=>({pos:s.pos,name:s.name})),
  routes: routes
 }));
}

// ===== ЗАГРУЗКА =====
function loadData(){

 let data = JSON.parse(localStorage.getItem("data") || "{}");

 stations = (data.stations || []).map(s=>{
  let marker = L.marker(s.pos).addTo(map).bindPopup(s.name);
  return {pos:s.pos,name:s.name,marker};
 });

 routes = data.routes || [];

 updateRouteSelect();
}

// ===== ОЧИСТКА =====
function clearAll(){
 localStorage.clear();
 location.reload();
}

// старт
loadData();
