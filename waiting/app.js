const SITE = {
  version: "1.0.0",
  lastUpdated: "2026-09-03",
  dataFrom: "2025-07-01",
  dataTo: "2026-06-30",
  waitlistAsAt: "2026-06-30",
  nextHa: "2026-10-30",
};
const COPY = {
  en: {
    title: "Hong Kong specialist waiting times and private fees",
    subtitle:
      "Official Hospital Authority specialist outpatient new-case waiting times by cluster, plus the two elective surgeries HA publishes (cataract, total joint replacement). HA does not publish hospital-level SOP waits. Investigations (CT/MRI) are not in the same open-data series. Private prices are ranges and packages, not a single tariff.",
    version: "Version",
    siteUpdated: "Site updated",
    haPeriod: "HA data period",
    waitlistAsAt: "Waitlist as at",
    nextHa: "Next HA SOP/surgery file",
    cadence: "Site refresh",
    cadenceValue: "Quarterly — 30 Jan / 30 Apr / 31 Jul / 30 Oct",
    cluster: "Cluster",
    specialty: "Specialty",
    hospitals: "Hospitals in this cluster",
    pickCluster:
      "Select a cluster to list its major HA hospitals. SOP waits are published at cluster level only.",
    mergeNote:
      "From 1 Apr 2026, Hong Kong East and Hong Kong West merged into Hong Kong Island Cluster. HA still reports the old seven-cluster split in this dataset.",
    tabSop: "New-case SOP waits",
    tabSurgery: "Elective surgery",
    tabInvest: "Investigations",
    tabPrivate: "Private fees",
    bookings: "New bookings (HA, 12 mo)",
    stableMix: "Stable mix",
    worstStable: "Worst cluster stable median",
    stableMedian: "Stable median",
    worstP90: "Worst cluster P90",
    stableP90: "Stable P90",
    sopTitle: "Specialist outpatient new-case waiting time",
    sopNote:
      "Urgent target: median ≤ 2 weeks. Semi-urgent target: median ≤ 8 weeks. “Longest” = 90th percentile of stable cases.",
    legendCool: "≤ target / shorter",
    legendMid: "elevated",
    legendHot: "long tail (≥ 80 weeks P90 or ≥ 40 weeks median stable)",
    colCluster: "Cluster",
    colUrgent: "Urgent median",
    colSemi: "Semi-urgent median",
    colStable: "Stable median",
    colP90: "Stable P90",
    weeks: "weeks",
    months: "months",
    surgeryTitle: "Elective surgeries HA publishes",
    surgeryNote:
      "Only cataract and total joint replacement have official cluster waitlists and completed-case waiting times.",
    cataract: "Cataract (Eye)",
    tjr: "Total joint replacement (Orthopaedics)",
    waitlist: "On waitlist",
    done: "Done (12 mo)",
    medWait: "Median wait",
    p90Wait: "P90 wait",
    investTitle: "Investigations — what is actually published",
    investBody:
      "Confidence: moderate for long routine tails, low for cluster-level numbers. HA does not ship a quarterly CT/MRI/endoscopy table comparable to SOP. Secondary compilations of HA radiology triage (2025–26):",
    modality: "Modality",
    urgentMed: "Urgent median",
    semiMed: "Semi-urgent median",
    routineP90: "Routine P90",
    years: "years",
    investNote:
      "If a case is not triaged urgent or semi-urgent, public imaging can take years. Endoscopy is not in the same official dashboard.",
    investPrivate:
      "Private alternative: MRI packages commonly HK$6,000–15,000; CT lower; colonoscopy often HK$12,000–25,000+. Exact quote required.",
    privateTitle: "Private hospital fees (published ranges, 2025–26)",
    privateNote:
      "These are not waiting times. Private specialist first visits are usually days to a few weeks. Fees exclude most investigations, implants, ICU and complications.",
    consultTitle: "Specialist outpatient consultation (first visit, HKD)",
    setting: "Setting",
    typical: "Typical first visit",
    notes: "Notes",
    pkgTitle: "Illustrative private surgery packages (HKD, not quotes)",
    procedure: "Procedure",
    band: "Published / reported band",
    where: "Where seen",
    roomTitle: "Private room rates (daily, HKD, mid-2026 compilations)",
    hospital: "Hospital",
    privateRoom: "Private",
    semiRoom: "Semi-private",
    ward: "Ward",
    roomNote: "Room rate ≠ bill unless a named all-inclusive package applies.",
    footer:
      "Compiled from Hospital Authority open data and published private hospital / insurer fee tables. HA SOP and elective-surgery statistics update quarterly. This site follows that cadence.",
  },
  zh: {
    title: "香港專科輪候時間與私家醫院收費",
    subtitle:
      "醫管局官方專科門診新症輪候時間（按聯網），以及目前公開的兩項預約手術（白內障、全關節置換）。醫管局並無公布醫院層級的專科門診輪候。電腦掃描／磁力共振等檢查並非同一套公開數據。私家收費為區間及套餐，不是單一價目。",
    version: "版本",
    siteUpdated: "網頁更新日期",
    haPeriod: "醫管局數據期",
    waitlistAsAt: "輪候名冊截至",
    nextHa: "下次醫管局專科／手術檔案",
    cadence: "網頁定期更新",
    cadenceValue: "每季 — 1月30日／4月30日／7月31日／10月30日",
    cluster: "醫院聯網",
    specialty: "專科",
    hospitals: "此聯網主要醫院",
    pickCluster: "請先選擇聯網以顯示其主要公立醫院。專科門診輪候只按聯網公布。",
    mergeNote:
      "由 2026 年 4 月 1 日起，港島東與港島西已合併為香港島醫院聯網。本數據集仍沿用舊有七聯網劃分。",
    tabSop: "專科門診新症",
    tabSurgery: "預約手術",
    tabInvest: "檢查",
    tabPrivate: "私家收費",
    bookings: "新症預約宗數（醫管局，12 個月）",
    stableMix: "穩定新症比例",
    worstStable: "最長聯網穩定中位數",
    stableMedian: "穩定新症中位數",
    worstP90: "最長聯網第90百分位",
    stableP90: "穩定新症第90百分位",
    sopTitle: "專科門診新症輪候時間",
    sopNote:
      "醫管局目標：緊急新症中位數 ≤ 2 星期；半緊急新症中位數 ≤ 8 星期。「最長」指穩定新症的第 90 個百分位數。",
    legendCool: "達標／較短",
    legendMid: "偏高",
    legendHot: "長尾（第90百分位 ≥ 80 星期，或穩定中位數 ≥ 40 星期）",
    colCluster: "聯網",
    colUrgent: "緊急中位數",
    colSemi: "半緊急中位數",
    colStable: "穩定中位數",
    colP90: "穩定第90百分位",
    weeks: "星期",
    months: "個月",
    surgeryTitle: "醫管局公開的預約手術",
    surgeryNote: "目前只有白內障及全關節置換有官方聯網輪候名冊及已完成手術輪候時間。",
    cataract: "白內障手術（眼科）",
    tjr: "全關節置換術（骨科）",
    waitlist: "輪候宗數",
    done: "已完成（12 個月）",
    medWait: "中位數輪候",
    p90Wait: "第90百分位輪候",
    investTitle: "檢查——實際公開的資料",
    investBody:
      "信心：例行檢查長尾屬中等；聯網層級數字屬低。醫管局並無像專科門診那樣每季公開電腦掃描／磁力共振／內視鏡輪候表。坊間整理的放射分流（2025–26）：",
    modality: "項目",
    urgentMed: "緊急中位數",
    semiMed: "半緊急中位數",
    routineP90: "例行第90百分位",
    years: "年",
    investNote: "若個案未被分流為緊急或半緊急，公營影像檢查可能需時數年。",
    investPrivate:
      "私家替代：磁力共振套餐常見港幣 6,000–15,000；電腦掃描較低；大腸鏡常見 12,000–25,000 以上。必須取得正式報價。",
    privateTitle: "私家醫院收費（已公布區間，2025–26）",
    privateNote:
      "這不是輪候時間。私家專科初診通常數日至數星期。收費一般不包括大部分檢查、植入物、深切治療及併發症。",
    consultTitle: "專科門診診症（初診，港幣）",
    setting: "機構／項目",
    typical: "初診參考",
    notes: "備註",
    pkgTitle: "私家手術套餐參考（港幣，非報價）",
    procedure: "手術",
    band: "已公布／報道區間",
    where: "來源類型",
    roomTitle: "私家病房日費（港幣，2026 年中彙編）",
    hospital: "醫院",
    privateRoom: "私家房",
    semiRoom: "半私家房",
    ward: "普通房",
    roomNote: "房費不等於帳單，除非屬全包套餐。",
    footer:
      "資料來自醫管局開放數據及私家醫院／保險公司已公布價目。醫管局專科門診及預約手術統計每季更新。本網頁跟隨同一節奏更新。",
  },
};

const COLS = ["HKE", "HKW", "KC", "KE", "KW", "NTE", "NTW"];
const CLUSTERS = [
  { id: "ALL", en: "All clusters", zh: "全部聯網", shortEn: "All", shortZh: "全部", hospitals: [] },
  {
    id: "HKE",
    en: "Hong Kong East",
    zh: "港島東",
    shortEn: "HK East",
    shortZh: "港島東",
    hospitals: [
      ["Pamela Youde Nethersole Eastern Hospital", "東區尤德夫人那打素醫院"],
      ["Ruttonjee Hospital", "律敦治醫院"],
      ["Tang Shiu Kin Hospital", "鄧肇堅醫院"],
      ["St John Hospital (Cheung Chau)", "長洲醫院"],
      ["Wong Chuk Hang Hospital", "黃竹坑醫院"],
    ],
  },
  {
    id: "HKW",
    en: "Hong Kong West",
    zh: "港島西",
    shortEn: "HK West",
    shortZh: "港島西",
    hospitals: [
      ["Queen Mary Hospital", "瑪麗醫院"],
      ["Tung Wah Hospital", "東華醫院"],
      ["Grantham Hospital", "葛量洪醫院"],
      ["Tsan Yuk Hospital", "贊育醫院"],
      ["Duchess of Kent Children's Hospital", "根德公爵夫人兒童醫院"],
    ],
  },
  {
    id: "KC",
    en: "Kowloon Central",
    zh: "九龍中",
    shortEn: "Kowloon C",
    shortZh: "九龍中",
    hospitals: [
      ["Queen Elizabeth Hospital", "伊利沙伯醫院"],
      ["Kwong Wah Hospital", "廣華醫院"],
      ["Hong Kong Eye Hospital", "香港眼科醫院"],
      ["TWGHs Wong Tai Sin Hospital", "東華三院黃大仙醫院"],
      ["Hong Kong Buddhist Hospital", "香港佛教醫院"],
      ["Our Lady of Maryknoll Hospital", "聖母醫院"],
    ],
  },
  {
    id: "KE",
    en: "Kowloon East",
    zh: "九龍東",
    shortEn: "Kowloon E",
    shortZh: "九龍東",
    hospitals: [
      ["United Christian Hospital", "基督教聯合醫院"],
      ["Tseung Kwan O Hospital", "將軍澳醫院"],
      ["Haven of Hope Hospital", "靈實醫院"],
    ],
  },
  {
    id: "KW",
    en: "Kowloon West",
    zh: "九龍西",
    shortEn: "Kowloon W",
    shortZh: "九龍西",
    hospitals: [
      ["Princess Margaret Hospital", "瑪嘉烈醫院"],
      ["Caritas Medical Centre", "明愛醫院"],
      ["Yan Chai Hospital", "仁濟醫院"],
      ["Kwai Chung Hospital", "葵涌醫院"],
      ["North Lantau Hospital", "北大嶼山醫院"],
    ],
  },
  {
    id: "NTE",
    en: "New Territories East",
    zh: "新界東",
    shortEn: "NT East",
    shortZh: "新界東",
    hospitals: [
      ["Prince of Wales Hospital", "威爾斯親王醫院"],
      ["Alice Ho Miu Ling Nethersole Hospital", "雅麗氏何妙齡那打素醫院"],
      ["North District Hospital", "北區醫院"],
      ["Shatin Hospital", "沙田醫院"],
      ["Tai Po Hospital", "大埔醫院"],
    ],
  },
  {
    id: "NTW",
    en: "New Territories West",
    zh: "新界西",
    shortEn: "NT West",
    shortZh: "新界西",
    hospitals: [
      ["Tuen Mun Hospital", "屯門醫院"],
      ["Pok Oi Hospital", "博愛醫院"],
      ["Tin Shui Wai Hospital", "天水圍醫院"],
      ["Castle Peak Hospital", "青山醫院"],
    ],
  },
];

const SOP = {
  ENT: { en: "Ear, Nose & Throat", zh: "耳鼻喉科", bookings: 102323, mixSt: "74,110 (72%)", urgent: ["<1w","<1w","<1w","<1w","1w","<1w","<1w"], semi: [6,7,4,5,4,5,5], stable: [24,24,40,54,36,34,39], p90: [54,53,62,84,84,79,54] },
  EYE: { en: "Ophthalmology (Eye)", zh: "眼科", bookings: 150517, mixSt: "75,657 (50%)", urgent: ["<1w","<1w","<1w","<1w","<1w","<1w","<1w"], semi: [6,5,4,6,6,6,4], stable: [24,36,32,38,43,70,31], p90: [58,55,67,100,98,114,78] },
  GYN: { en: "Gynaecology", zh: "婦科", bookings: 60011, mixSt: "42,132 (70%)", urgent: ["<1w","1w","<1w","1w","<1w","<1w","<1w"], semi: [6,6,5,5,6,5,4], stable: [26,27,25,19,49,58,44], p90: [27,48,83,62,94,86,58] },
  MED: { en: "Medicine", zh: "內科", bookings: 164462, mixSt: "124,072 (75%)", urgent: ["1w","<1w","1w","1w","1w","1w","1w"], semi: [6,4,6,5,6,6,6], stable: [29,27,65,33,47,36,47], p90: [82,50,98,91,88,86,64] },
  ORT: { en: "Orthopaedics & Traumatology", zh: "骨科", bookings: 108274, mixSt: "74,613 (69%)", urgent: ["1w","1w","1w","<1w","1w","<1w","1w"], semi: [5,5,4,5,3,5,6], stable: [25,23,27,42,45,33,34], p90: [53,59,72,70,81,81,66] },
  PAE: { en: "Paediatrics", zh: "兒科", bookings: 28313, mixSt: "19,238 (68%)", urgent: ["<1w","1w","<1w","<1w","<1w","1w","<1w"], semi: [6,4,5,4,5,4,7], stable: [13,21,11,10,21,25,24], p90: [16,35,28,36,30,38,31] },
  PSY: { en: "Psychiatry", zh: "精神科", bookings: 53664, mixSt: "42,169 (79%)", urgent: ["<1w","1w","<1w","1w","<1w","1w","1w"], semi: [3,3,3,3,2,3,2], stable: [27,46,25,41,19,69,46], p90: [69,84,74,85,84,104,84] },
  SUR: { en: "Surgery", zh: "外科", bookings: 186075, mixSt: "138,686 (75%)", urgent: ["1w","1w","1w","1w","1w","<1w","1w"], semi: [7,4,5,6,5,5,5], stable: [38,27,42,48,37,38,36], p90: [86,83,99,99,99,90,62] },
};
const CAT = { waitlist: [8725,3070,11252,10065,11294,10243,11628], done: [3767,4253,6542,3481,3132,5418,3870], median: [17,7,20,25,13,16,21], p90: [26,11,25,31,48,29,33] };
const TJR = { waitlist: [1675,2730,6036,3487,5824,8350,4608], done: [515,680,916,686,841,892,578], median: [10,30,42,35,46,30,6], p90: [86,53,61,43,75,64,67] };

let lang = localStorage.getItem("ha-lang") === "zh" ? "zh" : "en";
let tab = "sop";

function t() { return COPY[lang]; }
function fd(iso) {
  const [y, m, d] = iso.split("-");
  return lang === "zh" ? `${y}年${Number(m)}月${Number(d)}日` : iso;
}
function clsS(w) { return w >= 40 ? "hot" : w >= 30 ? "mid" : "cool"; }
function clsP(w) { return w >= 80 ? "hot" : w >= 50 ? "mid" : "cool"; }
function clsSemi(w) { return w > 8 ? "hot" : w > 6 ? "mid" : "cool"; }
function clsM(w) { return w >= 24 ? "hot" : w >= 12 ? "mid" : "cool"; }
function idxs() {
  const id = document.getElementById("cluster").value;
  return id === "ALL" ? [0,1,2,3,4,5,6] : [COLS.indexOf(id)];
}

function setLang(next) {
  lang = next;
  localStorage.setItem("ha-lang", next);
  document.documentElement.lang = next === "zh" ? "zh-Hant" : "en";
  document.getElementById("btn-en").classList.toggle("on", next === "en");
  document.getElementById("btn-zh").classList.toggle("on", next === "zh");
  render();
}

function fillSelects() {
  const cSel = document.getElementById("cluster");
  const sSel = document.getElementById("specialty");
  const cVal = cSel.value || "ALL";
  const sVal = sSel.value || "SUR";
  cSel.innerHTML = CLUSTERS.map((c) => `<option value="${c.id}">${lang === "zh" ? c.zh : c.en}</option>`).join("");
  sSel.innerHTML = Object.entries(SOP).map(([k, v]) => `<option value="${k}">${lang === "zh" ? v.zh : v.en}</option>`).join("");
  cSel.value = cVal;
  sSel.value = sVal;
}

function surgeryTable(data) {
  const tt = t();
  return `<div class="ov"><table><thead><tr>
    <th>${tt.colCluster}</th><th>${tt.waitlist}</th><th>${tt.done}</th><th>${tt.medWait}</th><th>${tt.p90Wait}</th>
  </tr></thead><tbody>${idxs().map((i) => {
    const c = CLUSTERS.find((x) => x.id === COLS[i]);
    return `<tr>
      <td>${lang === "zh" ? c.shortZh : c.shortEn}</td>
      <td class="num">${data.waitlist[i].toLocaleString()}</td>
      <td class="num">${data.done[i].toLocaleString()}</td>
      <td class="num ${clsM(data.median[i])}">${data.median[i]} ${tt.months}</td>
      <td class="num ${clsM(data.p90[i])}">${data.p90[i]} ${tt.months}</td>
    </tr>`;
  }).join("")}</tbody></table></div>`;
}

function render() {
  const tt = t();
  document.querySelector("[data-i=title]").textContent = tt.title;
  document.querySelector("[data-i=subtitle]").textContent = tt.subtitle;
  document.querySelector("[data-i=cluster]").textContent = tt.cluster;
  document.querySelector("[data-i=specialty]").textContent = tt.specialty;
  document.querySelector("[data-i=mergeNote]").textContent = tt.mergeNote;
  document.title = tt.title;
  document.getElementById("meta").innerHTML = [
    `${tt.version} ${SITE.version}`,
    `${tt.siteUpdated} ${fd(SITE.lastUpdated)}`,
    `${tt.haPeriod} ${fd(SITE.dataFrom)} – ${fd(SITE.dataTo)}`,
    `${tt.waitlistAsAt} ${fd(SITE.waitlistAsAt)}`,
    `${tt.nextHa} ${fd(SITE.nextHa)}`,
    `${tt.cadence}: ${tt.cadenceValue}`,
  ].map((x) => `<span class="pill">${x}</span>`).join("");

  fillSelects();
  const c = CLUSTERS.find((x) => x.id === document.getElementById("cluster").value);
  const hosp = document.getElementById("hospitals");
  if (c.id === "ALL") hosp.innerHTML = `<p class="note">${tt.pickCluster}</p>`;
  else hosp.innerHTML = `<p><strong>${tt.hospitals}</strong></p><ul>${c.hospitals.map((h) => `<li>${lang === "zh" ? h[1] : h[0]}</li>`).join("")}</ul>`;

  document.getElementById("tabs").innerHTML = [
    ["sop", tt.tabSop],
    ["surgery", tt.tabSurgery],
    ["invest", tt.tabInvest],
    ["private", tt.tabPrivate],
  ].map(([id, label]) => `<button type="button" data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`).join("");
  document.querySelectorAll("#tabs button").forEach((b) => {
    b.onclick = () => { tab = b.dataset.tab; render(); };
  });

  const spec = SOP[document.getElementById("specialty").value];
  const ix = idxs();
  const focus = document.getElementById("cluster").value === "ALL" ? null : COLS.indexOf(document.getElementById("cluster").value);
  const st = focus == null ? Math.max(...spec.stable) : spec.stable[focus];
  const p90 = focus == null ? Math.max(...spec.p90) : spec.p90[focus];

  document.getElementById("tab-sop").className = tab === "sop" ? "" : "hidden";
  document.getElementById("tab-surgery").className = tab === "surgery" ? "" : "hidden";
  document.getElementById("tab-invest").className = tab === "invest" ? "" : "hidden";
  document.getElementById("tab-private").className = tab === "private" ? "" : "hidden";

  document.getElementById("tab-sop").innerHTML = `
    <div class="kpi">
      <div class="card"><div class="l">${tt.bookings}</div><div class="v">${spec.bookings.toLocaleString()}</div></div>
      <div class="card"><div class="l">${tt.stableMix}</div><div class="v">${spec.mixSt}</div></div>
      <div class="card"><div class="l">${focus == null ? tt.worstStable : tt.stableMedian}</div><div class="v ${clsS(st)}">${st} ${tt.weeks}</div></div>
      <div class="card"><div class="l">${focus == null ? tt.worstP90 : tt.stableP90}</div><div class="v ${clsP(p90)}">${p90} ${tt.weeks}</div></div>
    </div>
    <div class="card">
      <h2>${lang === "zh" ? spec.zh : spec.en} — ${tt.sopTitle}</h2>
      <p class="note">${tt.sopNote}</p>
      <p class="note"><span class="cool">● ${tt.legendCool}</span> &nbsp; <span class="mid">● ${tt.legendMid}</span> &nbsp; <span class="hot">● ${tt.legendHot}</span></p>
      <div class="ov"><table><thead><tr>
        <th>${tt.colCluster}</th><th>${tt.colUrgent}</th><th>${tt.colSemi}</th><th>${tt.colStable}</th><th>${tt.colP90}</th>
      </tr></thead><tbody>${ix.map((i) => {
        const cl = CLUSTERS.find((x) => x.id === COLS[i]);
        return `<tr>
          <td>${lang === "zh" ? cl.shortZh : cl.shortEn}</td>
          <td class="num cool">${spec.urgent[i]}</td>
          <td class="num ${clsSemi(spec.semi[i])}">${spec.semi[i]} ${tt.weeks}</td>
          <td class="num ${clsS(spec.stable[i])}">${spec.stable[i]} ${tt.weeks}</td>
          <td class="num ${clsP(spec.p90[i])}">${spec.p90[i]} ${tt.weeks}</td>
        </tr>`;
      }).join("")}</tbody></table></div>
    </div>`;

  document.getElementById("tab-surgery").innerHTML = `<div class="card">
    <h2>${tt.surgeryTitle}</h2><p class="note">${tt.surgeryNote}</p>
    <h3>${tt.cataract} — ${tt.waitlistAsAt} ${fd(SITE.waitlistAsAt)}: 66,277</h3>
    ${surgeryTable(CAT)}
    <h3>${tt.tjr} — ${tt.waitlistAsAt} ${fd(SITE.waitlistAsAt)}: 32,710</h3>
    ${surgeryTable(TJR)}
  </div>`;

  document.getElementById("tab-invest").innerHTML = `<div class="card">
    <h2>${tt.investTitle}</h2>
    <p>${tt.investBody}</p>
    <div class="ov"><table><thead><tr><th>${tt.modality}</th><th>${tt.urgentMed}</th><th>${tt.semiMed}</th><th>${tt.routineP90}</th></tr></thead>
    <tbody>
      <tr><td>CT</td><td class="num cool">~1 ${tt.weeks}</td><td class="num mid">~23 ${tt.weeks}</td><td class="num hot">~218 ${tt.weeks} (~4 ${tt.years})</td></tr>
      <tr><td>MRI</td><td class="num cool">~2 ${tt.weeks}</td><td class="num mid">~26 ${tt.weeks}</td><td class="num hot">~212 ${tt.weeks} (~4 ${tt.years})</td></tr>
    </tbody></table></div>
    <p class="note">${tt.investNote}</p>
    <p class="note">${tt.investPrivate}</p>
  </div>`;

  document.getElementById("tab-private").innerHTML = `<div class="card">
    <h2>${tt.privateTitle}</h2><p class="note">${tt.privateNote}</p>
    <h3>${tt.consultTitle}</h3>
    <div class="ov"><table><thead><tr><th>${tt.setting}</th><th>${tt.typical}</th><th>${tt.notes}</th></tr></thead><tbody>
      <tr><td>HA subsidised SOP / 公營資助專科門診</td><td class="num">250 + 20/drug</td><td>From 1 Jan 2026</td></tr>
      <tr><td>HA non-subsidised / 醫管局非資助</td><td class="num">1,090–2,580</td><td>Follow-up 950–2,350</td></tr>
      <tr><td>Private specialists / 私家專科一般</td><td class="num">800–2,500+</td><td>Oncology / neurosurgery high end</td></tr>
      <tr><td>Gleneagles clinics</td><td class="num">~1,200–1,500</td><td>Doctor-dependent</td></tr>
      <tr><td>CUHK Medical Centre</td><td class="num">fixed CMP/IMP</td><td>Jan 2026 catalogues</td></tr>
    </tbody></table></div>
    <h3>${tt.pkgTitle}</h3>
    <div class="ov"><table><thead><tr><th>${tt.procedure}</th><th>${tt.band}</th><th>${tt.where}</th></tr></thead><tbody>
      <tr><td>Cataract / 白內障（單眼）</td><td class="num">~20,000–50,000+</td><td>Lens type</td></tr>
      <tr><td>TJR / 全髖或全膝置換</td><td class="num">~150,000–350,000+</td><td>Implant + LOS</td></tr>
      <tr><td>Laparoscopic cholecystectomy / 腹腔鏡膽囊切除</td><td class="num">~80,000–120,000</td><td>Package lists</td></tr>
      <tr><td>Hernia / 疝氣修補</td><td class="num">~60,000–90,000</td><td>Package lists</td></tr>
    </tbody></table></div>
    <h3>${tt.roomTitle}</h3>
    <div class="ov"><table><thead><tr><th>${tt.hospital}</th><th>${tt.privateRoom}</th><th>${tt.semiRoom}</th><th>${tt.ward}</th></tr></thead><tbody>
      <tr><td>Hong Kong Sanatorium / 養和</td><td class="num">4,700–6,800</td><td class="num">2,930–3,950</td><td class="num">1,350–1,960</td></tr>
      <tr><td>Gleneagles / 港怡</td><td class="num">4,600+</td><td class="num">2,100–3,250</td><td class="num">1,000–1,200</td></tr>
      <tr><td>CUHK Medical Centre / 中大醫院</td><td class="num">3,600–4,800</td><td class="num">1,500–2,500</td><td class="num">1,000</td></tr>
      <tr><td>Union Hospital / 仁安</td><td class="num">2,500–8,000</td><td class="num">1,080–2,000</td><td class="num">600–950</td></tr>
      <tr><td>HK Baptist / 浸信會</td><td class="num">3,880–4,780</td><td class="num">1,900–2,800</td><td class="num">—</td></tr>
    </tbody></table></div>
    <p class="note">${tt.roomNote}</p>
  </div>`;

  document.getElementById("footer").innerHTML = `${tt.footer}
    <a href="https://www.ha.org.hk/opendata/sop/sop-waiting-time-en.xlsx">SOP</a> ·
    <a href="https://www.ha.org.hk/opendata/electivesurgery/elective-cataract-surgery-en.xlsx">${tt.cataract}</a> ·
    <a href="https://www.ha.org.hk/opendata/electivesurgery/elective-total-joint-replacement-surgery-en.xlsx">${tt.tjr}</a>`;
}

document.getElementById("btn-en").onclick = () => setLang("en");
document.getElementById("btn-zh").onclick = () => setLang("zh");
document.getElementById("cluster").onchange = render;
document.getElementById("specialty").onchange = render;
setLang(lang);
