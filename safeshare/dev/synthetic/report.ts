import { hkidCheckDigit } from '../../src/detect/hkid.ts'
import { code128Svg } from './code128.ts'

export type LayoutName = 'classic' | 'split' | 'bilingual' | 'banner'

export type ReportSpec = {
  id: string
  index: number
  layout: LayoutName
  variant: 'clean' | 'phone'
}

export type LabRow = {
  test: string
  value: string
  unit: string
  range: string
}

/** Fictional values used to draw one page. They are not written into the ground-truth JSON. */
export type ReportFacts = {
  spec: ReportSpec
  nameEn: string
  nameZh: string | null
  hkid: string
  mrn: string
  labNo: string
  phone: string
  email: string | null
  address: string
  dob: string
  doctor: string
  age: string
  sex: string
  results: LabRow[]
}

const LAYOUTS: readonly LayoutName[] = ['classic', 'split', 'bilingual', 'banner']

const SURNAMES = ['Chan', 'Cheung', 'Wong', 'Lam', 'Ho', 'Tsang', 'Yip', 'Lau', 'Mak', 'Fung']
const GIVEN = [
  'Tai Man',
  'Siu Ming',
  'Mei Ling',
  'Ka Yan',
  'Wai Keung',
  'Hoi Yan',
  'Chi Wai',
  'Pui Shan',
]
const ZH_NAMES = [
  '陳大文',
  '張小明',
  '黃美玲',
  '林家欣',
  '何偉強',
  '曾海欣',
  '葉志偉',
  '劉淑芬',
  '麥俊傑',
  '馮佩珊',
]
const DOCTORS = ['Lam Mei', 'Cheung Pui Shan', 'Yip Ka Ming', 'Ho Siu Ling', 'Mak Wai Yee']
const STREETS = [
  '88 Nathan Road, Yau Tsim Mong',
  '12 Queen Road, Central',
  '3 Po Tai Street, Sha Tin',
  '41 Castle Peak Road, Tuen Mun',
  '19 Hip Wo Street, Kwun Tong',
  '6 Market Street, Tsuen Wan',
]
const TESTS: readonly LabRow[] = [
  { test: 'Sodium', value: '140', unit: 'mmol/L', range: '136-145' },
  { test: 'Potassium', value: '4.2', unit: 'mmol/L', range: '3.5-5.1' },
  { test: 'Chloride', value: '102', unit: 'mmol/L', range: '98-107' },
  { test: 'Urea', value: '5.6', unit: 'mmol/L', range: '3.0-7.8' },
  { test: 'Creatinine', value: '78', unit: 'umol/L', range: '45-84' },
  { test: 'Glucose', value: '5.4', unit: 'mmol/L', range: '3.9-6.1' },
  { test: 'Haemoglobin', value: '13.5', unit: 'g/dL', range: '11.5-14.8' },
]

function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pick<T>(next: () => number, items: readonly T[]): T {
  const item = items[Math.floor(next() * items.length)]
  if (item === undefined) throw new Error('empty-choice')
  return item
}

function digits(next: () => number, length: number): string {
  let out = ''
  for (let index = 0; index < length; index += 1) out += String(Math.floor(next() * 10))
  return out
}

export function fakeHkid(next: () => number): string {
  const two = next() < 0.25
  const letters =
    String.fromCharCode(65 + Math.floor(next() * 26)) +
    (two ? String.fromCharCode(65 + Math.floor(next() * 26)) : '')
  const body = `${letters}${digits(next, 6)}`
  const check = hkidCheckDigit(body)
  if (!check) throw new Error('hkid')
  return `${body}(${check})`
}

export function reportSpec(index: number): ReportSpec {
  const layout = LAYOUTS[Math.floor(index / 2) % LAYOUTS.length] ?? 'classic'
  return {
    id: `r${String(index).padStart(3, '0')}`,
    index,
    layout,
    variant: index % 2 === 0 ? 'clean' : 'phone',
  }
}

function jitter(next: () => number, value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  const span = numeric >= 20 ? 3 : 0.3
  const moved = numeric + (next() - 0.5) * span
  const places = value.includes('.') ? 1 : 0
  return moved.toFixed(places)
}

export function reportFacts(index: number): ReportFacts {
  const spec = reportSpec(index)
  const next = random(0x5afe0000 + index * 97)
  const surname = pick(next, SURNAMES)
  const given = pick(next, GIVEN)
  const phoneDigits = `${pick(next, ['2', '5', '6', '9'])}${digits(next, 7)}`
  return {
    spec,
    nameEn: `${surname} ${given}`,
    nameZh: spec.layout === 'bilingual' ? pick(next, ZH_NAMES) : null,
    hkid: fakeHkid(next),
    mrn: `M${digits(next, 7)}`,
    labNo: `L${digits(next, 7)}`,
    phone: `${phoneDigits.slice(0, 4)} ${phoneDigits.slice(4)}`,
    email: index % 3 === 0 ? `sample${1000 + index}@example.com` : null,
    address: pick(next, STREETS),
    dob: `${String(1 + Math.floor(next() * 28)).padStart(2, '0')}/${String(1 + Math.floor(next() * 12)).padStart(2, '0')}/${1940 + Math.floor(next() * 60)}`,
    doctor: pick(next, DOCTORS),
    age: String(20 + Math.floor(next() * 60)),
    sex: next() < 0.5 ? 'F' : 'M',
    results: TESTS.slice(0, 5).map((row) => ({ ...row, value: jitter(next, row.value) })),
  }
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function identifier(category: string, text: string, script = 'en'): string {
  return `<span class="value" data-role="identifier" data-category="${category}" data-script="${script}">${esc(text)}</span>`
}

function field(label: string, category: string, text: string, script = 'en', after = ''): string {
  const tail = after ? `<span class="label">${esc(after)}</span>` : ''
  return `<div class="field"><span class="label">${esc(label)}</span>${identifier(category, text, script)}${tail}</div>`
}

function nameFields(facts: ReportFacts, label: string, zhLabel = ''): string {
  const zh = facts.nameZh
    ? `${zhLabel ? `<span class="label">${esc(zhLabel)}</span>` : ''}${identifier('name', facts.nameZh, 'zh')}`
    : ''
  return `<div class="field"><span class="label">${esc(label)}</span>${identifier('name', facts.nameEn, 'en')}${zh}</div>`
}

function resultTable(rows: readonly LabRow[]): string {
  const body = rows
    .map(
      (row) =>
        `<tr><td>${esc(row.test)}</td><td data-role="result" data-category="result" data-script="">${esc(row.value)}</td><td>${esc(row.unit)}</td><td>${esc(row.range)}</td></tr>`,
    )
    .join('')
  return `<table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead><tbody>${body}</tbody></table>`
}

function fields(facts: ReportFacts): string {
  const zh = facts.spec.layout === 'bilingual' ? CHINESE : null
  const rows = [
    nameFields(facts, ENGLISH.name, zh?.name ?? ''),
    field(ENGLISH.hkid, 'hkid', facts.hkid, 'en', zh?.hkid),
    field(ENGLISH.mrn, 'record-number', facts.mrn, 'en', zh?.mrn),
    field(ENGLISH.phone, 'phone', facts.phone, 'en', zh?.phone),
    field(ENGLISH.dob, 'date', facts.dob, 'en', zh?.dob),
    `<div class="field"><span class="label">${esc(ENGLISH.sex)}</span><span>${esc(facts.sex)}</span>${zh ? `<span class="label">${esc(zh.sex)}</span>` : ''}<span class="label">${esc(ENGLISH.age)}</span><span>${esc(facts.age)}</span>${zh ? `<span class="label">${esc(zh.age)}</span>` : ''}</div>`,
    field(ENGLISH.address, 'address', facts.address, 'en', zh?.address),
    field(ENGLISH.doctor, 'other-person', facts.doctor, 'en', zh?.doctor),
  ]
  if (facts.email) rows.push(field(ENGLISH.email, 'email', facts.email, 'en', zh?.email))
  return rows.join('')
}

const ENGLISH = {
  name: 'Name',
  hkid: 'HKID',
  mrn: 'MRN',
  phone: 'Tel',
  dob: 'DOB',
  sex: 'Sex',
  age: 'Age',
  address: 'Address',
  doctor: 'Requested by',
  email: 'Email',
}

const CHINESE = {
  name: '姓名',
  hkid: '身份證',
  mrn: '病人編號',
  phone: '電話',
  dob: '出生日期',
  sex: '性別',
  age: '年齡',
  address: '地址',
  doctor: '醫生',
  email: '電郵',
}

function footer(facts: ReportFacts): string {
  return `<div class="footer">${field('Lab No', 'record-number', facts.labNo)}${field('Tel', 'phone', facts.phone)}${field('HKID', 'hkid', facts.hkid)}<div class="field"><span class="label">Collected</span><span>26/09/2026</span></div></div>`
}

export function reportHtml(facts: ReportFacts): string {
  const barcode = `<div class="barcode" data-role="identifier" data-category="barcode" data-script="en">${code128Svg(facts.mrn)}</div>`
  const body =
    facts.spec.layout === 'split' ? `<div class="grid">${fields(facts)}</div>` : fields(facts)
  const department =
    facts.spec.layout === 'banner' ? '<p class="sub">Department of Chemical Pathology</p>' : ''
  const title = `<div class="banner"><div><h1>Laboratory Report</h1><p class="sub">Fictional General Hospital</p>${department}</div>${barcode}</div>`
  return `<div id="frame"><div id="page">${title}${body}${resultTable(facts.results)}${footer(facts)}</div></div>`
}

export const REPORT_STYLE = `
#frame { position: relative; width: 920px; box-sizing: border-box; padding: 36px; background: #fff; }
#page { background: #fff; color: #000; font-family: "Liberation Sans", "DejaVu Sans", "WenQuanYi Micro Hei", sans-serif; font-size: 22px; line-height: 1.35; }
h1 { font-size: 28px; line-height: 1.2; margin: 0; }
.sub { margin: 2px 0 0; font-size: 18px; }
.banner { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #000; margin-bottom: 12px; padding-bottom: 8px; }
.field { display: flex; gap: 10px; align-items: baseline; margin: 3px 0; white-space: nowrap; }
.grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; }
.grid .field:nth-child(n + 7) { grid-column: 1 / -1; }
table { width: 100%; border-collapse: collapse; margin-top: 18px; font-family: "Liberation Mono", "DejaVu Sans Mono", monospace; font-size: 22px; }
th, td { border-bottom: 1px solid #222; text-align: left; padding: 5px 8px; }
.footer { margin-top: 18px; }
.barcode svg { display: block; }
`
