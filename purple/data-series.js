// lastUpdated: 2026-09-19 HKT — iRacing 2026 S4 schedules from official SeasonSchedule.pdf
const S4_START = Date.UTC(2026, 8, 15); // Sep 15 2026
function iracingWeek(now){
  const t = now.getTime();
  if(t < S4_START) return {season:'2026 S4', week:1};
  const week = Math.floor((t - S4_START)/86400000/7)+1;
  return {season: week>12 ? '2026 S4 wrap' : '2026 S4', week: Math.min(week,12)};
}

const SERIES = [
  {id:'pec', name:'Production Endurance Challenge', cls:'Rookie 4.0+', field:'largest average field', cars:['mx5','gr86','bmwm2','clio'], weeks:['Hockenheim Outer','Monza GP No Chicane','Snetterton 300','Oschersleben','Silverstone International','Nürburgring GP Short','Navarra Speed','Sonoma Cup Long','Le Mans Historic','Summit Point','Watkins Glen Boot','Oulton Island Historic']},
  {id:'imsa', name:'IMSA iRacing Series — Open', cls:'Class B', field:'~42 cars · SoF ~2500', cars:['cadillac','ferrari296','porsche992'], weeks:['IMS Road Course','Road Atlanta','Fuji GP','Red Bull Ring','Long Beach','Gilles Villeneuve','Le Mans 24h','Mexico City','Suzuka GP','Silverstone GP','Sebring','Monza GP']},
  {id:'imsaf', name:'IMSA iRacing Series — Fixed', cls:'Class B', field:'~40 cars', cars:['cadillac','ferrari296','porsche992'], weeks:['IMS Road Course','Road Atlanta','Fuji GP','Red Bull Ring','Long Beach','Gilles Villeneuve','Le Mans 24h','Mexico City','Suzuka GP','Silverstone GP','Sebring','Monza GP']},
  {id:'gts', name:'GT Sprint Series by Simucube', cls:'Class C', field:'~26 cars', cars:['ferrari296','porsche992'], weeks:['Silverstone GP','Road Atlanta','Zandvoort GP','Motegi GP','IMS Road Course','The Bend GT','COTA GP','Spa GP','Fuji GP','Misano GP','Sebring','Suzuka GP']},
  {id:'gr86s', name:'Toyota GR86 Cup by SIMAGIC', cls:'Class D', field:'~17 cars · many splits', cars:['gr86'], weeks:['Oulton Fosters','Barber','Spa GP','IMS Road Course','Tsukuba 2000','Daytona Road Course','Laguna Seca 2026','Snetterton 300','Road Atlanta','Zandvoort GP','Lime Rock GP','Road America Short West']},
  {id:'pcup', name:'Porsche Cup by CONSPIT', cls:'Favourite · Class D/C', field:'~24 cars · spec 992.2', cars:['porschecup'], weeks:['Road Atlanta','Okayama Full','Sebring','Bathurst','Road America','COTA GP','Hungaroring','Algarve GP','Long Beach','Miami GP','Oschersleben','Zandvoort GP']},
  {id:'ring', name:'Ring Meister by LVRY', cls:'Favourite · hourly Nordschleife', field:'car changes each week', cars:['ringmeister'], weeks:['Nordschleife · Caterham 420R','Nordschleife · Lotus 79','Nordschleife · Spec Racer Ford','Nordschleife · Ruf RT 12R','Nordschleife · Street Stock','Nordschleife · GT3 field','Nordschleife · Skip Barber','Nordschleife · TCR','Nordschleife · GT4 field','Nordschleife · Formula Vee','Nordschleife · Mazda MX-5','Nordschleife · Mini Stock']}
];

const CARS = {
  mx5:{name:'Mazda MX-5 (ND) — Global MX-5 Cup', spec:'SKYACTIV-G 2.0 I4 · 1,998 cc · 181 hp', copy:'Hiroshima roadster. Spec ND Cup car with sealed 2.0 and control tyres. Rebuilt for S4.'},
  gr86:{name:'Toyota GR86 / Subaru BRZ — FA24 boxer', spec:'FA24D flat-four · 2,387 cc · 228–234 hp', copy:'Gunma-built second-gen 86. Naturally aspirated boxer, spec GR86 Cup.'},
  bmwm2:{name:'BMW M2 Racing (G87)', spec:'S58 twin-turbo inline-6 · ~450 hp class', copy:'Customer M2 Cup-spec racer. Shares PEC with MX-5, GR86 and Clio in S4.'},
  clio:{name:'Renault Clio', spec:'Touring / club spec · front-drive', copy:'French hatch in the Production Endurance Challenge multiclass mix.'},
  cayman:{name:'Porsche 718 Cayman GT4 — 4.0 flat-six', spec:'9A2 Evo 4.0 · ~420 hp', copy:'Mid-engined Cayman with a detuned 911 GT3 six.'},
  ferrari296:{name:'Ferrari 296 GT3 — F163CE V6', spec:'2,992 cc 120° V6 · twins · ~600 hp before BoP', copy:'Customer racer from the 296 GTB. No hybrid in GT3.'},
  porsche992:{name:'Porsche 911 GT3 R (992) — 4.2 flat-six', spec:'4,194 cc NA flat-six · ~565 hp before BoP', copy:'Rear-engine Weissach GT3. Default GTD reference car.'},
  porschecup:{name:'Porsche 911 GT3 Cup (992.2)', spec:'4.0 flat-six · ~510 hp · spec one-make', copy:'Customer Cup car. Porsche Cup by CONSPIT rotates the track, not the car.'},
  ringmeister:{name:'Ring Meister — weekly guest car', spec:'Fixed setup · Nordschleife Industriefahrten', copy:'The Ring stays. The car changes every Tuesday. S4 opens with the Caterham 420R; Week 12 is Mini Stock.'},
  cadillac:{name:'Cadillac V-Series.R — LMDh GTP', spec:'5.5-litre NA V8 + spec hybrid', copy:'IMSA GTP prototype. GM endurance V8, not a showroom Blackwing.'}
};
