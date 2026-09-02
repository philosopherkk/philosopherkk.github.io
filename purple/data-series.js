const S3_START = Date.UTC(2026,5,16);
function iracingWeek(now){
  const t = now.getTime();
  if(t < S3_START) return {season:'2026 S3', week:1};
  const week = Math.floor((t - S3_START)/86400000/7)+1;
  return {season: week>12 ? '2026 S3/S4 transition' : '2026 S3', week: Math.min(week,12)};
}

const SERIES = [
  {id:'pec', name:'Production Endurance Challenge', cls:'Rookie 4.0+', field:'largest average field', cars:['mx5','gr86','cayman'], weeks:['VIR Full','Qualcomm Coronado','Spa Endurance','Okayama Full','Road America','Gateway RC','Oran Park GP','Long Beach','Lime Rock Classic','Suzuka GP','Daytona Road Course','Charlotte Roval No Chicane']},
  {id:'imsa', name:'IMSA iRacing Series — Open', cls:'Class B', field:'~42 cars · SoF ~2500', cars:['cadillac','ferrari296','porsche992'], weeks:['Watkins Glen Boot','Motegi GP','Spa GP','CTMP','Interlagos','Road America','Monza GP','Fuji No Chicane','Daytona Road Course','VIR Full','Road Atlanta','Le Mans 24h']},
  {id:'imsaf', name:'IMSA iRacing Series — Fixed', cls:'Class B', field:'~40 cars', cars:['cadillac','ferrari296','porsche992'], weeks:['Watkins Glen Boot','Motegi GP','Spa GP','CTMP','Interlagos','Road America','Monza GP','Fuji No Chicane','Daytona Road Course','VIR Full','Road Atlanta','Le Mans 24h']},
  {id:'gts', name:'GT Sprint Series by Simucube', cls:'Class C', field:'~26 cars', cars:['ferrari296','porsche992'], weeks:['Watkins Glen Boot','Oran Park GP','Bathurst','Spa GP','VIR Full','Adelaide','Hockenheim GP','Le Mans 24h','IMS Road Course','St. Petersburg','Red Bull Ring','Suzuka GP']},
  {id:'gr86s', name:'Toyota GR86 Cup by SIMAGIC', cls:'Class D', field:'~17 cars · many splits', cars:['gr86'], weeks:['Laguna Seca 2026','Zandvoort Nationaal','Summit Point','Interlagos','Spa GP','Okayama Full','St. Petersburg','Bathurst','Oschersleben','CTMP','Road America','VIR North']},
  {id:'pcup', name:'Porsche Cup by CONSPIT', cls:'Favourite · Class D/C', field:'~24 cars · spec 992.2', cars:['porschecup'], weeks:['VIR Full','Fuji GP','Imola GP','Bathurst','Spa GP','Watkins Glen Boot','Catalunya GP','Miami GP','Hockenheim GP','Interlagos','Red Bull Ring','Monza GP']},
  {id:'ring', name:'Ring Meister by LVRY', cls:'Favourite · hourly Nordschleife', field:'car changes each week', cars:['ringmeister'], weeks:['Nordschleife · Acura NSX GT3','Nordschleife · Ford Mustang FR500S','Nordschleife · Porsche Mission R','Nordschleife · Aston Vantage GT4','Nordschleife · Dallara IL-15','Nordschleife · Aston DBR9 GT1','Nordschleife · Porsche 992.2 Cup','Nordschleife · Radical SR8','Nordschleife · Ligier JS P320','Nordschleife · Renault Clio','Nordschleife · EURO NASCAR V8GP','Nordschleife · Pontiac Solstice']}
];

const CARS = {
  mx5:{name:'Mazda MX-5 (ND) — Global MX-5 Cup', spec:'SKYACTIV-G 2.0 I4 · 1,998 cc · 181 hp', copy:'Hiroshima roadster. Spec ND Cup car with sealed 2.0 and control tyres.'},
  gr86:{name:'Toyota GR86 / Subaru BRZ — FA24 boxer', spec:'FA24D flat-four · 2,387 cc · 228–234 hp', copy:'Gunma-built second-gen 86. Naturally aspirated boxer, spec GR86 Cup.'},
  cayman:{name:'Porsche 718 Cayman GT4 — 4.0 flat-six', spec:'9A2 Evo 4.0 · ~420 hp', copy:'Mid-engined Cayman with a detuned 911 GT3 six.'},
  ferrari296:{name:'Ferrari 296 GT3 — F163CE V6', spec:'2,992 cc 120° V6 · twins · ~600 hp before BoP', copy:'Customer racer from the 296 GTB. No hybrid in GT3.'},
  porsche992:{name:'Porsche 911 GT3 R (992) — 4.2 flat-six', spec:'4,194 cc NA flat-six · ~565 hp before BoP', copy:'Rear-engine Weissach GT3. Default GTD reference car.'},
  porschecup:{name:'Porsche 911 GT3 Cup (992.2)', spec:'4.0 flat-six · ~510 hp · spec one-make', copy:'Customer Cup car. Porsche Cup by CONSPIT rotates the track, not the car.'},
  ringmeister:{name:'Ring Meister — weekly guest car', spec:'Fixed setup · Nordschleife Industriefahrten', copy:'The Ring stays. The car changes every Tuesday. Week 12 is the Pontiac Solstice.'},
  cadillac:{name:'Cadillac V-Series.R — LMDh GTP', spec:'5.5-litre NA V8 + spec hybrid', copy:'IMSA GTP prototype. GM endurance V8, not a showroom Blackwing.'}
};
