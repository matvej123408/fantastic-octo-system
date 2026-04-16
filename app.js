// ===== КАРТА =====
let map = L.map('map').setView([49,31],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// ===== ДАННЫЕ =====
let stations=[], routes=[], trains=[], signals=[];
let currentRoute=[];
let mode=null;

// ===== UI =====
function setStatus(t){
 document.getElementById("status").innerText=t;
}

function updateRouteSelect(){
 let sel=document.getElementById("routeSelect");
 sel.innerHTML="";
 routes.forEach((r,i)=>{
  let o=document.createElement("option");
  o.value=i;
  o.innerText="Маршрут "+(i+1);
  sel.appendChild(o);
 });
}

// ===== РЕЖИМ =====
function setMode(m){
 mode=m;
 setStatus("Режим: "+m);
 currentRoute=[];
}

// ===== КЛИК =====
map.on('click', e=>{

 if(mode==="station"){
  let name=document.getElementById("stationName").value;
  if(!name) return;

  let m=L.marker(e.latlng).addTo(map).bindPopup(name);
  stations.push({pos:e.latlng,name,marker:m});
  saveData();
 }

 if(mode==="signal"){
  let m=L.circleMarker(e.latlng,{radius:6,color:'red'}).addTo(map);
  signals.push({pos:e.latlng,busy:false,marker:m});
 }

 if(mode==="route"){
  for(let st of stations){
    if(map.distance(e.latlng,st.pos)<50){
      currentRoute.push(st);
      L.circleMarker(st.pos,{radius:10,color:'blue'}).addTo(map);
    }
  }
 }

});

// ===== МАРШРУТ =====
function finishRoute(){
 if(currentRoute.length<2) return;

 routes.push({stations:[...currentRoute]});
 currentRoute=[];
 updateRouteSelect();
 saveData();
}

// ===== ПОЕЗД =====
function spawnTrain(){

 let sel=document.getElementById("routeSelect");
 let route=routes[sel.value];
 if(!route) return;

 let train={
  route,
  stationIndex:0,
  progress:0,
  speed:0,
  stopped:false,
  wait:0,
  marker:L.circleMarker(route.stations[0].pos,{radius:14,color:'black'}).addTo(map)
 };

 trains.push(train);
}

// ===== РАСПИСАНИЕ =====
function startSchedule(){
 setInterval(()=>spawnTrain(), 15*60000);
}

// ===== СВЕТОФОР =====
function checkSignal(train){
 let pos=train.marker.getLatLng();

 for(let s of signals){
  let d=map.distance(pos,s.pos);

  if(d<40){
    if(s.busy) return true;
    s.busy=true;
    s.marker.setStyle({color:'green'});
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

  let route=train.route;

  let start=route.stations[train.stationIndex].pos;
  let next=(train.stationIndex+1)%route.stations.length;
  let end=route.stations[next].pos;

  let pos=train.marker.getLatLng();

  if(map.distance(pos,start)<20 && train.progress===0){
    train.stopped=true;
    train.wait=120;
    return;
  }

  let target=(45+Math.random()*15)/50000;

  if(train.speed<target) train.speed+=0.00005;
  else train.speed-=0.00005;

  train.progress+=train.speed;

  if(train.progress>1){
    train.progress=0;
    train.stationIndex=next;
  }

  let lat=start.lat+(end.lat-start.lat)*train.progress;
  let lng=start.lng+(end.lng-start.lng)*train.progress;

  train.marker.setLatLng([lat,lng]);

 });

}

setInterval(updateTrains,30);

// ===== СОХРАНЕНИЕ =====
function saveData(){
 localStorage.setItem("data",JSON.stringify({
  stations:stations.map(s=>({pos:s.pos,name:s.name})),
  routes:routes
 }));
}

// ===== ЗАГРУЗКА =====
function loadData(){

 let d=JSON.parse(localStorage.getItem("data")||"{}");

 stations=(d.stations||[]).map(s=>{
  let m=L.marker(s.pos).addTo(map).bindPopup(s.name);
  return {pos:s.pos,name:s.name,marker:m};
 });

 routes=d.routes||[];

 updateRouteSelect();
}

// ===== ОЧИСТКА =====
function clearAll(){
 localStorage.clear();
 location.reload();
}

loadData();
