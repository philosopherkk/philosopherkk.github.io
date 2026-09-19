const YT = {
  'Daytona Road Course':[['g8PBEncPir4','Sambo · MX-5 Daytona'],['Kz1SOQrNAME','Coach Dave · MX-5 Daytona'],['CBazw5hcspU','Sambo · Cayman GT4']],
  'Road Atlanta':[['rh2Z-VD_1Vc','Sambo · Porsche GT3'],['e5E3nvXjUhc','Coach Dave · Mustang GT3'],['FHy4Rwa09ps','HYMO · Road Atlanta']],
  'Red Bull Ring':[['2wQ6TXEmu2E','Sambo · Porsche 992 GT3'],['g_vj25h6n8Q','FelixVoetter · Porsche Cup RBR'],['hvj96xKjebo','GITGUD · Porsche Cup']],
  'Road America':[['2o_31ZOjocU','Sambo · GR86'],['IjpAm7z0sXs','GITGUD · GR86'],['1LsJ48OTsik','Erilla · GR86']],
  'Oulton Fosters':[['OdZJemA5QYw','Sambo · MX-5 Fosters'],['mj-r0fol_GA','Finding Speed · Fosters']],
  'Monza GP':[['44JMl4mArck','FelixVoetter · Porsche Cup 992.2 Monza W12']]
};
function resolveTrack(name){
  let t = TRACKS[name];
  if(t && t.alias) t = TRACKS[t.alias];
  return t || {key:'x',lat:20,lng:0,zoom:2,place:'—',opened:'—',length:'—',history:'No dossier stored for this layout yet.',corners:[]};
}
let maps = {};
function destroyMaps(){ Object.values(maps).forEach(m=>{try{m.remove()}catch(e){}}); maps={}; }
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const IS_FILE = location.protocol === 'file:';
function ytBlock(track){
  const list = YT[track] || [];
  if(!list.length){
    const q = encodeURIComponent('iRacing '+track+' track guide hot lap');
    return '<p class="spec">No stored onboard — open YouTube:</p><a class="ytbtn" href="https://www.youtube.com/results?search_query='+q+'" target="_blank" rel="noopener">Search YouTube for '+track+'</a>';
  }
  return '<div class="yt">'+list.map(v=>{
    const watch = 'https://www.youtube.com/watch?v='+v[0];
    const thumb = 'https://i.ytimg.com/vi/'+v[0]+'/hqdefault.jpg';
    const embed = 'https://www.youtube-nocookie.com/embed/'+v[0]+'?rel=0&playsinline=1';
    const media = (IS_IOS || IS_FILE)
      ? '<a href="'+watch+'" target="_blank" rel="noopener"><img src="'+thumb+'" alt="'+v[1]+'"></a>'
      : '<iframe src="'+embed+'" title="'+v[1]+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>';
    return '<div class="ytcard">'+media+'<p>'+v[1]+'</p><a class="ytbtn" href="'+watch+'" target="_blank" rel="noopener">Open in YouTube</a></div>';
  }).join('')+'</div>';
}
function render(week){
  const live = iracingWeek(new Date());
  document.getElementById('issueLine').textContent = live.season+' · live week '+live.week+' of 12 · viewing week '+week+' · resets Tuesday 00:00 GMT';
  document.getElementById('clock').textContent = new Date().toUTCString();
  const heads = ['Wk'].concat(SERIES.map(s=>s.name.replace(' by Simucube','').replace(' by SIMAGIC','').replace('iRacing Series — ','IMSA ')));
  let cal = '<table class="cal"><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>';
  for(let w=1;w<=12;w++){
    const on = w===week ? ' style="background:#efe0c4"' : '';
    cal += '<tr'+on+'><td><button type="button" data-week="'+w+'">'+w+'</button></td>';
    SERIES.forEach(s=>{ cal += '<td>'+s.weeks[w-1]+'</td>'; });
    cal += '</tr>';
  }
  cal += '</tbody></table>';
  document.getElementById('calTable').innerHTML = cal;
  document.querySelectorAll('#calTable button[data-week]').forEach(b=>{
    b.onclick = ()=>{ sel.value=b.getAttribute('data-week'); render(+sel.value); document.getElementById('board').scrollIntoView({behavior:'smooth'}); };
  });
  document.getElementById('topList').innerHTML = SERIES.map((s,i)=>'<div class="row"><div class="num">'+String(i+1).padStart(2,'0')+'</div><div><div class="cls">'+s.cls+' · '+s.field+'</div><h3>'+s.name+'</h3><p>'+s.weeks[week-1]+'</p></div></div>').join('');
  destroyMaps();
  document.getElementById('dossiersBox').innerHTML = SERIES.map(s=>{
    const trackName = s.weeks[week-1];
    const tr = resolveTrack(trackName);
    const mapId = 'm_'+tr.key+'_'+s.id;
    const cars = s.cars.map(id=>{ const c = CARS[id]; return '<div><h3>'+c.name+'</h3><p class="spec">'+c.spec+'</p><p>'+c.copy+'</p></div>'; }).join('');
    return '<article><div class="cls">'+s.name+'</div><h3>'+trackName+'</h3><p class="spec">'+tr.place+' · opened '+tr.opened+' · '+tr.length+'</p><div id="'+mapId+'" class="map"></div><div class="cols"><div><h3>The circuit</h3><p>'+tr.history+'</p></div><div><h3>The cars this series runs</h3>'+cars+'</div></div><h3 style="margin-top:18px">Onboard this week</h3>'+ytBlock(trackName)+'</article>';
  }).join('');
  setTimeout(()=>{
    if(typeof L === 'undefined') return;
    let made = 0;
    SERIES.forEach(s=>{
      const tr = resolveTrack(s.weeks[week-1]);
      const id = 'm_'+tr.key+'_'+s.id;
      const el = document.getElementById(id);
      if(!el || maps[id] || tr.zoom===2) return;
      if(IS_IOS && made>=1){ el.innerHTML='<p class="spec" style="padding:12px">Map skipped on iPhone. Track: '+s.weeks[week-1]+'</p>'; return; }
      try{
        const m = L.map(id,{tap:true}).setView([tr.lat,tr.lng], tr.zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(m);
        L.marker([tr.lat,tr.lng]).addTo(m).bindPopup(s.weeks[week-1]);
        maps[id]=m; made++;
      }catch(err){ el.innerHTML='<p class="spec" style="padding:12px">Map could not load.</p>'; }
    });
  },80);
}
const sel = document.getElementById('weekSelect');
for(let w=1;w<=12;w++){
  const o=document.createElement('option');
  o.value=w;
  o.textContent='S4 Week '+w+' · '+new Date(S4_START+(w-1)*7*86400000).toISOString().slice(0,10);
  sel.appendChild(o);
}
function renderArchive(){
  const seen = new Set();
  const names = [];
  SERIES.forEach(s=>s.weeks.forEach(n=>{
    const t = resolveTrack(n);
    if(seen.has(t.key)) return;
    seen.add(t.key);
    names.push({n,t});
  }));
  document.getElementById('archiveBox').innerHTML = names.map(({n,t})=>'<article><h3>'+n+'</h3><p class="spec">'+(t.place||'—')+' · opened '+(t.opened||'—')+' · '+(t.length||'—')+'</p><p>'+(t.history||'')+'</p></article>').join('');
}
function applyLive(){
  const w=iracingWeek(new Date()).week; sel.value=w; render(w); renderArchive();
  const note=document.getElementById('iosNote');
  if(IS_FILE){ note.style.display='block'; note.textContent='This copy is file:// — use the GitHub Pages URL on iPhone.'; }
  else if(IS_IOS){ note.style.display='block'; note.textContent='iPhone Safari: videos open in the YouTube app. Only one map is drawn.'; }
}
sel.onchange=()=>render(+sel.value);
document.getElementById('liveBtn').onclick=applyLive;
document.querySelectorAll('nav a[data-go]').forEach(a=>{
  a.addEventListener('click', function(e){
    e.preventDefault();
    const el = document.getElementById(this.getAttribute('data-go'));
    if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  });
});
applyLive();
