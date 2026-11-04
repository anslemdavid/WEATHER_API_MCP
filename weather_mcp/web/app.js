/* Atmos live weather dashboard: Open-Meteo data + an optional Three.js sky scene. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const state = { unit: 'celsius', location: 'London', weatherCode: 0, isDay: true, timezone: 'UTC', lastData: null, timer: null };
  const WMO = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',51:'Drizzle',53:'Drizzle',55:'Drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Heavy showers',85:'Snow showers',86:'Snow showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};
  const icon = (code, day = true) => code === 0 ? (day ? '☀' : '☾') : [1,2].includes(code) ? '⛅' : [45,48].includes(code) ? '〰' : [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? '🌧' : [71,73,75,77,85,86].includes(code) ? '❄' : [95,96,99].includes(code) ? '⛈' : '☁';
  const condition = (code) => WMO[code] || 'Unknown';
  const weatherIcon = (code) => [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? 'rain' : [71,73,75,77,85,86].includes(code) ? 'snow' : [95,96,99].includes(code) ? 'storm' : [45,48].includes(code) ? 'fog' : code >= 1 ? 'clouds' : 'clear';
  const safeNumber = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
  const unitSymbol = () => state.unit === 'celsius' ? '°C' : '°F';
  const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(state.timer); state.timer = setTimeout(() => toast.classList.remove('show'), 3200); };

  function updateClock() {
    const now = new Date();
    try { $('#local-time').textContent = new Intl.DateTimeFormat([], { timeZone: state.timezone, hour: '2-digit', minute: '2-digit', hour12: true }).format(now); }
    catch { $('#local-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  }
  function placeLabel(place) { return [place.name, place.admin1, place.country].filter(Boolean).filter((item, index, list) => list.indexOf(item) === index).join(', '); }
  async function geocode(query) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    if (!response.ok) throw new Error('Location search is temporarily unavailable.');
    const result = await response.json();
    if (!result.results?.length) throw new Error(`No location found for “${query}”. Try adding a country.`);
    return result.results[0];
  }
  async function loadWeather(location) {
    $('#updated-at').textContent = 'FETCHING LIVE DATA';
    try {
      const place = typeof location === 'string' ? await geocode(location) : location;
      const tempUnit = state.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max',
        temperature_unit: tempUnit, wind_speed_unit: 'kmh', timezone: place.timezone || 'auto', forecast_days: '7' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error('Live weather could not be loaded. Please try again.');
      const data = await response.json();
      if (!data.current || !data.daily) throw new Error('The weather service returned incomplete data.');
      state.location = placeLabel(place) || place.name || 'Your location'; state.timezone = data.timezone || place.timezone || 'UTC';
      state.weatherCode = data.current.weather_code ?? 0; state.isDay = Boolean(data.current.is_day); state.lastData = data;
      render(data);
      $('#updated-at').textContent = `UPDATED ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      drawScene(weatherIcon(state.weatherCode), state.isDay);
    } catch (error) {
      showToast(error.message || 'Could not load live weather.');
      $('#updated-at').textContent = 'COULD NOT UPDATE';
    }
  }
  function render(data) {
    const current = data.current, daily = data.daily, unit = unitSymbol();
    $('#location-name').textContent = state.location; $('#detail-place').textContent = state.location.toUpperCase();
    $('#temperature').textContent = `${safeNumber(current.temperature_2m)}°`;
    $('#condition').textContent = condition(current.weather_code);
    $('#today-high').textContent = `${safeNumber(daily.temperature_2m_max?.[0])}°`;
    $('#today-low').textContent = `${safeNumber(daily.temperature_2m_min?.[0])}°`;
    $('#summary').textContent = `${condition(current.weather_code)} right now. ${safeNumber(current.relative_humidity_2m)}% humidity, with winds at ${safeNumber(current.wind_speed_10m)} km/h.`;
    $('#feels-like').innerHTML = `${safeNumber(current.apparent_temperature)}°<small>${unit}</small>`;
    $('#humidity').innerHTML = `${safeNumber(current.relative_humidity_2m)}<small>%</small>`;
    $('#wind').innerHTML = `${safeNumber(current.wind_speed_10m)}<small> km/h</small>`;
    $('#wind-note').textContent = `Wind speed · ${safeNumber(current.wind_direction_10m)}°`;
    $('#precipitation').innerHTML = `${safeNumber(current.precipitation)}<small> mm</small>`;
    $('#cloud-cover').innerHTML = `${safeNumber(current.cloud_cover)}<small>%</small>`;
    $('#pressure').innerHTML = `${safeNumber(current.pressure_msl)}<small> hPa</small>`;
    $('#forecast-unit').textContent = `DAILY · ${unit}`;
    const cards = daily.time.map((date, index) => {
      const weekday = index === 0 ? 'TODAY' : new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: state.timezone }).format(new Date(`${date}T12:00:00`)).toUpperCase();
      const code = daily.weather_code[index], chance = daily.precipitation_probability_max?.[index];
      return `<article class="forecast-card" style="animation-delay:${index * 55}ms"><div class="forecast-day">${weekday}</div><span class="forecast-icon" aria-label="${condition(code)}">${icon(code, true)}</span><div class="forecast-condition">${condition(code)}</div><div class="forecast-temps"><span>${safeNumber(daily.temperature_2m_max[index])}°</span><span>${safeNumber(daily.temperature_2m_min[index])}°</span></div><div class="rain-chance">${chance == null ? '—' : `${chance}% rain`}</div></article>`;
    }).join('');
    $('#forecast-grid').innerHTML = cards;
    document.querySelectorAll('.metric-card').forEach((card, index) => { const values = [current.apparent_temperature, current.relative_humidity_2m, current.wind_speed_10m, current.precipitation, current.cloud_cover, current.pressure_msl]; const val = Number(values[index]); card.style.setProperty('--progress', `${Math.min(100, Math.max(12, Number.isFinite(val) ? index === 5 ? (val / 1100) * 100 : index === 2 ? val * 2 : val : 12))}%`); });
    updateClock();
  }
  let scene = null, sceneAnimation = 0;
  function drawScene(type, day) {
    if (typeof THREE === 'undefined') return;
    const canvas = $('#weather-scene'), parent = canvas.parentElement;
    if (!scene) {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8)); renderer.setSize(parent.clientWidth, parent.clientHeight, false);
      const world = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, parent.clientWidth / parent.clientHeight, .1, 100); camera.position.set(0, 0, 11);
      const group = new THREE.Group(); world.add(group);
      const globeGeo = new THREE.SphereGeometry(3.35, 56, 48); const globeMat = new THREE.MeshPhongMaterial({ color: 0x102e45, emissive: 0x082033, shininess: 28, transparent: true, opacity: .88, flatShading: true });
      const globe = new THREE.Mesh(globeGeo, globeMat); group.add(globe);
      const wire = new THREE.Mesh(new THREE.SphereGeometry(3.38, 24, 16), new THREE.MeshBasicMaterial({ color: 0x61d6d3, wireframe: true, transparent: true, opacity: .12 })); group.add(wire);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3.52, 48, 36), new THREE.MeshBasicMaterial({ color: 0x64ded4, side: THREE.BackSide, transparent: true, opacity: .055 })); group.add(halo);
      const starPositions = new Float32Array(500 * 3); for (let i=0;i<500;i++){starPositions[i*3]=(Math.random()-.5)*24;starPositions[i*3+1]=(Math.random()-.5)*16;starPositions[i*3+2]=-Math.random()*12-2;}
      const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xb8deef,size:.025,transparent:true,opacity:.62}));world.add(stars);
      const particleCount = type === 'rain' || type === 'storm' || type === 'snow' ? 350 : 180; const particles = new Float32Array(particleCount*3); const velocities = new Float32Array(particleCount);
      for(let i=0;i<particleCount;i++){particles[i*3]=(Math.random()-.5)*13;particles[i*3+1]=(Math.random()-.5)*9;particles[i*3+2]=(Math.random()-.5)*7;velocities[i]=.008+Math.random()*.025;}
      const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(particles,3));const pMat=new THREE.PointsMaterial({color:type==='snow'?0xd6f4ff:0x79dcd7,size:type==='rain'||type==='storm'?.035:.055,transparent:true,opacity:.75});const points=new THREE.Points(pGeo,pMat);world.add(points);
      const keyLight=new THREE.PointLight(day?0x9de8ed:0x536bb5,day?38:17,28);keyLight.position.set(-4,4,7);world.add(keyLight);world.add(new THREE.AmbientLight(0x50758a,day?2.3:1.1));
      scene={renderer,world,camera,group,globe,wire,points,particles,velocities,type,day,stars,halo};
      const resize=()=>{if(!scene)return;const w=parent.clientWidth,h=parent.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};window.addEventListener('resize',resize,{passive:true});
      const animate=()=>{sceneAnimation=requestAnimationFrame(animate);const t=performance.now()*.00016;group.rotation.y=Math.sin(t)*.18;group.rotation.x=.08+Math.sin(t*.7)*.035;globe.rotation.y+=.00045;wire.rotation.y-=.00025;points.rotation.y+=.0003;stars.rotation.z+=.000012;const pos=points.geometry.attributes.position.array;for(let i=0;i<velocities.length;i++){const y=i*3+1;pos[y]-=velocities[i]*(type==='snow'?.35:1);if(pos[y]<-4.8){pos[y]=4.8;pos[i*3]=(Math.random()-.5)*13;}}points.geometry.attributes.position.needsUpdate=true;renderer.render(world,camera);};animate();
    } else {scene.type=type;scene.day=day;scene.points.material.color.set(type==='snow'?0xd6f4ff:0x79dcd7);scene.points.material.size=type==='rain'||type==='storm'?.035:.055;scene.points.material.opacity=type==='fog'?.24:.75;scene.globe.material.color.set(type==='storm'?0x18283c:day?0x102e45:0x111f39);scene.globe.material.emissive.set(type==='storm'?0x171020:day?0x082033:0x11102a);}
  }
  $('#search-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#location-search'); if (input.value.trim()) loadWeather(input.value.trim()); });
  $('#geo-button').addEventListener('click', () => { if (!navigator.geolocation) { showToast('Location services are not available in this browser.'); return; } $('#updated-at').textContent='REQUESTING YOUR LOCATION'; navigator.geolocation.getCurrentPosition(async ({coords})=>{try{const response=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}&language=en&format=json`);const data=await response.json();const place=data.results?.[0]||{name:'Your location',latitude:coords.latitude,longitude:coords.longitude,timezone:'auto'};loadWeather(place);}catch{loadWeather({name:'Your location',latitude:coords.latitude,longitude:coords.longitude,timezone:'auto'});}},()=>{showToast('Location permission was denied or unavailable.');$('#updated-at').textContent='LOCATION NOT AVAILABLE';},{timeout:10000,maximumAge:300000}); });
  $('#unit-toggle').addEventListener('click', (event) => { const choice=event.target.closest('[data-unit]');if(!choice||choice.dataset.unit===state.unit)return;state.unit=choice.dataset.unit;document.querySelectorAll('.unit-choice').forEach(item=>item.classList.toggle('selected',item===choice));if(state.lastData)loadWeather(state.location.split(',')[0]); });
  updateClock();setInterval(updateClock,15000);loadWeather('London');setInterval(()=>loadWeather(state.location.split(',')[0]),15*60*1000);
  window.addEventListener('beforeunload',()=>cancelAnimationFrame(sceneAnimation));
})();
