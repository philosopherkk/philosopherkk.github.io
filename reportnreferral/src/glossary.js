/**
 * Offline ophthalmology glossary used to turn clinical shorthand into
 * plain-language patient text (English / Traditional Chinese, Hong Kong usage).
 *
 * Match fields:
 *   words  case-insensitive English phrases
 *   abbr   case-sensitive abbreviations
 *   zh     Chinese terms
 * Urgency (referral suggestion only): emergency > urgent > semi > routine.
 * No brand names anywhere: drug classes / INN and procedure names only.
 */

export const URGENCY_RANK = { routine: 1, semi: 2, urgent: 3, emergency: 4 };

export const CONDITIONS = [
  {
    id: "cataract",
    en: "Cataract",
    zh: "白內障",
    words: [
      "cataract",
      "cataracts",
      "lens opacity",
      "lens opacities",
      "nuclear sclerosis",
      "nuclear sclerotic",
      "posterior subcapsular",
    ],
    abbr: ["PSC"],
    zhWords: ["白內障", "白内障", "晶體混濁", "晶体混浊"],
    urgency: "routine",
    plainEn:
      "A cataract is clouding of the natural lens inside the eye. It can make vision blurry or hazy, make glare and bright lights bothersome, and make night driving or reading harder. It usually develops slowly, and surgery to replace the cloudy lens can be considered when it affects daily life.",
    plainZh:
      "白內障是眼球內的天然晶體變得混濁，會令視力模糊、怕光或眩光，夜間看東西或閱讀也可能比較困難。白內障通常慢慢形成；當影響日常生活時，可考慮以手術更換混濁的晶體。",
  },
  {
    id: "pseudophakia",
    en: "Artificial lens in the eye (after cataract surgery)",
    zh: "已植入人工晶體（白內障手術後）",
    words: [
      "pseudophakia",
      "pseudophakic",
      "pseudophakos",
      "post cataract surgery",
      "post-cataract surgery",
      "s/p phaco",
      "status post phaco",
      "IOL in situ",
      "PCIOL",
      "PC IOL",
      "post phaco",
      "post-phaco",
    ],
    abbr: ["PCIOL"],
    zhWords: ["人工晶體", "人工晶体", "已做白內障手術", "白內障手術後", "白內障術後"],
    urgency: "routine",
    plainEn:
      "You have had cataract surgery: the cloudy natural lens was replaced with a clear artificial lens (intraocular lens). Check-ups after surgery are still needed.",
    plainZh: "你曾做過白內障手術，混濁的天然晶體已換上透明的人工晶體。手術後仍需要定期覆診檢查。",
  },
  {
    id: "pco",
    en: "Clouding behind the artificial lens (posterior capsule opacification)",
    zh: "後囊混濁（後發性白內障）",
    words: [
      "posterior capsule opacification",
      "posterior capsular opacification",
      "capsular opacification",
      "after-cataract",
      "after cataract",
      "secondary cataract",
    ],
    abbr: ["PCO"],
    zhWords: ["後囊混濁", "後發性白內障", "後發障"],
    urgency: "routine",
    plainEn:
      "After cataract surgery, the thin membrane that holds the artificial lens can become cloudy over time and make vision hazy again. This is common and can usually be treated with a quick, painless laser procedure.",
    plainZh:
      "白內障手術後，固定人工晶體的薄膜可能隨時間變混濁，令視力再次模糊。這情況相當常見，通常可用快捷、無痛的激光治療處理。",
  },
  {
    id: "glaucoma",
    en: "Glaucoma",
    zh: "青光眼",
    words: [
      "glaucoma",
      "glaucomatous",
      "normal tension glaucoma",
      "open angle glaucoma",
      "open-angle glaucoma",
    ],
    abbr: ["POAG", "NTG", "PXG", "OAG"],
    zhWords: ["青光眼"],
    urgency: "routine",
    plainEn:
      "Glaucoma is a group of conditions in which the nerve at the back of the eye (the optic nerve) is slowly damaged, often linked to eye pressure that is too high for that eye. It usually causes no pain early on, and side vision is affected first. Damage that has already happened cannot be reversed, but treatment aims to protect the vision you still have, so regular check-ups and using treatment as directed are very important.",
    plainZh:
      "青光眼是視神經（眼球後方傳送影像到大腦的神經）逐漸受損的一類眼病，通常與該眼睛承受不了的眼壓有關。早期往往沒有痛楚，最先受影響的是周邊視野。已受損的視神經不能復原，治療的目標是保護尚餘的視力，所以定期覆診及按指示治療非常重要。",
  },
  {
    id: "gsus",
    en: "Possible glaucoma (needs monitoring)",
    zh: "疑似青光眼（需要監察）",
    words: [
      "glaucoma suspect",
      "suspected glaucoma",
      "suspect glaucoma",
      "possible glaucoma",
      "glaucoma suspicion",
    ],
    abbr: [],
    zhWords: ["疑似青光眼", "青光眼疑似", "青光眼嫌疑"],
    urgency: "routine",
    plainEn:
      "Some of your eye checks (such as eye pressure or the appearance of the optic nerve) need closer follow-up to be sure whether glaucoma is developing. This is not the same as having glaucoma, but regular monitoring is needed.",
    plainZh:
      "你的部分眼睛檢查結果（例如眼壓或視神經外觀）需要較密切跟進，才能確定是否有青光眼的跡象。這並不等於已患上青光眼，但需要定期監察。",
  },
  {
    id: "oht",
    en: "Raised eye pressure (ocular hypertension)",
    zh: "高眼壓症",
    words: [
      "ocular hypertension",
      "raised IOP",
      "elevated IOP",
      "high IOP",
      "raised intraocular pressure",
    ],
    abbr: ["OHT"],
    zhWords: ["高眼壓", "高眼压"],
    urgency: "routine",
    plainEn:
      "Your eye pressure is higher than the usual range, but the optic nerve and side vision may still be healthy. Some people with higher eye pressure develop glaucoma over time, so regular checks (and sometimes treatment) are used to protect the nerve.",
    plainZh:
      "你的眼壓高於一般範圍，但視神經和視野可能仍然健康。部分眼壓偏高的人日後可能發展成青光眼，因此需要定期檢查（有時也需要治療）以保護視神經。",
  },
  {
    id: "aacg",
    en: "Acute angle closure",
    zh: "急性閉角",
    words: [
      "acute angle closure",
      "acute angle-closure",
      "angle closure attack",
      "acute primary angle closure",
    ],
    abbr: ["AACG", "APAC"],
    zhWords: ["急性閉角", "急性青光眼", "急性閉角型青光眼"],
    urgency: "emergency",
    plainEn:
      "Acute angle closure is a sudden blockage of the eye's drainage channel that makes eye pressure rise very quickly. It can cause severe eye pain, headache, nausea, redness and blurred vision with halos around lights, and needs urgent treatment to prevent permanent damage.",
    plainZh:
      "急性閉角是眼內排水通道突然被阻塞，令眼壓在短時間內急升。可引致劇烈眼痛、頭痛、噁心、眼紅，以及視力模糊並看到燈光周圍有光環，需要即時治療以免造成永久損害。",
    warnEn: "Severe eye pain with redness, headache or nausea needs emergency care the same day.",
    warnZh: "如出現劇烈眼痛，並伴隨眼紅、頭痛或噁心，請即日前往急症室。",
  },
  {
    id: "angleclosure",
    en: "Narrow drainage angle (angle closure risk)",
    zh: "房角狹窄（有閉角風險）",
    words: [
      "angle closure",
      "angle-closure",
      "narrow angle",
      "narrow angles",
      "occludable angle",
      "closed angle",
      "narrow drainage angle",
    ],
    abbr: ["PAC", "PACS", "PACG"],
    zhWords: ["閉角", "窄角", "房角狹窄", "房角窄"],
    urgency: "semi",
    plainEn:
      "In some eyes the drainage angle is narrow, so fluid drains less easily and the eye pressure may rise, sometimes suddenly. Your doctor may recommend a laser procedure or other treatment to open the angle and lower the risk of an attack of pain and high pressure.",
    plainZh:
      "部分眼睛的房角（排水通道的入口）比較狹窄，眼內液體較難排出，眼壓可能上升，有時甚至突然急升。醫生可能建議以激光或其他治療打開房角，減低引發眼痛及高眼壓發作的風險。",
    warnEn: "Severe eye pain with redness, headache or nausea needs emergency care the same day.",
    warnZh: "如出現劇烈眼痛，並伴隨眼紅、頭痛或噁心，請即日前往急症室。",
  },
  {
    id: "npdr",
    en: "Diabetic retinopathy (early/non-proliferative)",
    zh: "糖尿病視網膜病變（糖尿上眼）",
    words: [
      "diabetic retinopathy",
      "non-proliferative diabetic retinopathy",
      "nonproliferative diabetic retinopathy",
      "non-proliferative DR",
      "background diabetic retinopathy",
      "non proliferative",
    ],
    abbr: ["DR", "NPDR", "BDR"],
    zhWords: ["糖尿病視網膜病變", "糖尿病性視網膜病變", "糖尿上眼", "糖尿眼", "糖尿病眼病"],
    urgency: "routine",
    plainEn:
      "Diabetic retinopathy means long-term high blood sugar has damaged the tiny blood vessels in the retina (the light-sensing layer at the back of the eye). Early on there may be no symptoms, so regular eye screening matters. Good control of blood sugar, blood pressure and cholesterol helps slow it down, and some stages are treated with laser or injections.",
    plainZh:
      "糖尿病視網膜病變（俗稱「糖尿上眼」）是指長期高血糖損害視網膜（眼底感光層）的微細血管。早期通常沒有症狀，所以定期眼底檢查十分重要。良好控制血糖、血壓及膽固醇可減慢病情，部分階段需要以激光或注射治療。",
  },
  {
    id: "pdr",
    en: "Proliferative diabetic retinopathy",
    zh: "增生性糖尿病視網膜病變",
    words: [
      "proliferative diabetic retinopathy",
      "proliferative DR",
      "retinal neovascularisation",
      "retinal neovascularization",
      "neovascularisation of the disc",
    ],
    abbr: ["PDR", "NVD", "NVE"],
    zhWords: ["增生性糖尿病視網膜病變", "增生性視網膜病變", "增殖性糖尿病視網膜病變"],
    urgency: "urgent",
    plainEn:
      "In advanced diabetic eye disease, fragile new blood vessels grow on the retina. These vessels can bleed or pull on the retina, which may cause sudden loss of vision. Laser or injection treatment is usually needed to reduce this risk, and close follow-up is important.",
    plainZh:
      "在糖尿病眼病較嚴重的階段，視網膜上會長出脆弱的新生血管，這些血管可能出血或牽拉視網膜，導致視力突然下降。通常需要激光或注射治療以降低風險，並須密切覆診。",
  },
  {
    id: "dme",
    en: "Swelling of the macula (macular oedema)",
    zh: "黃斑水腫",
    words: [
      "diabetic macular oedema",
      "diabetic macular edema",
      "macular oedema",
      "macular edema",
      "cystoid macular oedema",
      "cystoid macular edema",
      "clinically significant macular oedema",
    ],
    abbr: ["DMO", "DME", "CSME", "CME"],
    zhWords: ["糖尿黃斑水腫", "糖尿病黃斑水腫", "黃斑水腫", "黃斑部水腫"],
    urgency: "semi",
    plainEn:
      "Fluid has built up in the central part of the retina (the macula), which is responsible for sharp, detailed vision. It can blur or distort central vision. Treatment, such as injections or laser, is often used to reduce the swelling.",
    plainZh:
      "視網膜中央的黃斑部（負責清晰、精細視覺）積聚了液體，可令中央視力模糊或扭曲。醫生常會以注射或激光治療以減輕腫脹。",
  },
  {
    id: "amd",
    en: "Age-related macular degeneration",
    zh: "老年黃斑病變",
    words: [
      "age-related macular degeneration",
      "age related macular degeneration",
      "macular degeneration",
      "drusen",
      "dry AMD",
    ],
    abbr: ["AMD", "ARMD"],
    zhWords: [
      "老年黃斑病變",
      "老年性黃斑",
      "黃斑病變",
      "黃斑退化",
      "黃斑部病變",
      "黃斑變性",
      "黃斑點病變",
    ],
    urgency: "routine",
    plainEn:
      'Age-related macular degeneration affects the macula, the central part of the retina used for reading, recognising faces and seeing fine detail. It usually leaves side vision intact. The "dry" type tends to progress slowly; the "wet" type can change quickly. Regular check-ups, not smoking and a healthy diet are advised, and your doctor may suggest checking your central vision at home for any change.',
    plainZh:
      "老年黃斑病變影響黃斑部，即視網膜中央、用來閱讀、辨認面孔及看清細節的部分，一般不會影響周邊視野。「乾性」進展較慢；「濕性」則可能變化較快。建議定期覆診、戒煙及保持均衡飲食，醫生也可能建議你在家中定期自我檢查中央視力有否變化。",
  },
  {
    id: "wamd",
    en: "Wet (neovascular) macular degeneration",
    zh: "濕性黃斑病變",
    words: [
      "wet AMD",
      "neovascular AMD",
      "neovascular age-related macular degeneration",
      "choroidal neovascularisation",
      "choroidal neovascularization",
      "wet macular degeneration",
      "wet age-related macular degeneration",
    ],
    abbr: ["nAMD", "wAMD", "CNV"],
    zhWords: ["濕性黃斑病變", "濕性黃斑", "脈絡膜新生血管"],
    urgency: "urgent",
    plainEn:
      'In the "wet" form of macular degeneration, abnormal fragile blood vessels grow under the macula and leak fluid or blood, which can quickly distort or blur central vision. Eye-injection treatment can often slow or stabilise the condition, and treatment works best when started early, so any new distortion or blur in central vision should be reported promptly.',
    plainZh:
      "「濕性」黃斑病變是黃斑下方長出脆弱的異常血管，滲漏液體或血液，可令中央視力迅速扭曲或模糊。眼內注射治療往往可減慢或穩定病情，而及早治療效果較佳，因此中央視力如有新的扭曲或模糊，應盡快求診。",
    warnEn:
      "New distortion (straight lines looking wavy) or a new blur in central vision should be checked promptly.",
    warnZh: "如中央視力出現新的扭曲（直線變彎）或模糊，請盡快求診。",
  },
  {
    id: "rd",
    en: "Retinal tear or detachment",
    zh: "視網膜裂孔／脫落",
    words: [
      "retinal detachment",
      "retinal tear",
      "retinal tears",
      "retinal break",
      "retinal hole",
      "rhegmatogenous",
      "giant retinal tear",
      "horseshoe tear",
    ],
    abbr: ["RD", "RRD", "TRD"],
    zhWords: ["視網膜脫落", "視網膜脫離", "視網膜裂孔", "視網膜破孔", "視網膜撕裂", "視網膜裂口"],
    urgency: "emergency",
    plainEn:
      "A retinal tear is a break in the retina (the light-sensing layer at the back of the eye). If fluid passes through the break, the retina can peel away from the wall of the eye, which is called a retinal detachment. This needs prompt specialist treatment, usually with laser or surgery, to protect vision. Typical warning signs are a sudden shower of floaters, flashes of light, or a curtain or shadow over part of your vision.",
    plainZh:
      "視網膜裂孔是視網膜（眼底感光層）出現裂口；當液體經裂口滲入，視網膜便可能與眼球壁分離，即視網膜脫落。這情況需要眼科專科盡快處理，通常以激光或手術保護視力。典型警號包括突然出現大量飛蚊、閃光，或視野中出現如窗簾或陰影般遮擋。",
    warnEn:
      "If you notice many new floaters, flashes of light, or a curtain or shadow over your vision, go to an Accident & Emergency department the same day.",
    warnZh: "如突然出現大量新的飛蚊、閃光，或視野中有如窗簾或陰影般的遮擋，請即日前往急症室。",
  },
  {
    id: "lattice",
    en: "Lattice degeneration of the retina",
    zh: "視網膜格子狀退化",
    words: ["lattice degeneration", "lattice"],
    abbr: [],
    zhWords: ["格子狀變性", "格子樣變性", "格子狀退化", "視網膜格子"],
    urgency: "routine",
    plainEn:
      "Lattice degeneration is an area of thinning at the edge of the retina. It is fairly common and usually causes no symptoms, but thin areas can sometimes develop tears, so your doctor may recommend monitoring or preventive laser. Please know the warning signs of a retinal tear.",
    plainZh:
      "格子狀退化是視網膜邊緣的一片較薄區域，相當常見，通常沒有症狀，但薄弱處有時可能形成裂孔，所以醫生可能建議定期檢查或預防性激光。請留意視網膜裂孔的警號。",
    warnEn:
      "If you notice many new floaters, flashes of light, or a curtain or shadow over your vision, go to an Accident & Emergency department the same day.",
    warnZh: "如突然出現大量新的飛蚊、閃光，或視野中有如窗簾或陰影般的遮擋，請即日前往急症室。",
  },
  {
    id: "pvd",
    en: "Floaters / posterior vitreous detachment",
    zh: "飛蚊症／玻璃體脫離",
    words: [
      "posterior vitreous detachment",
      "vitreous detachment",
      "floaters",
      "floater",
      "vitreous syneresis",
      "weiss ring",
    ],
    abbr: ["PVD"],
    zhWords: ["玻璃體脫離", "玻璃體後脫離", "飛蚊症", "飛蚊", "玻璃體混濁"],
    urgency: "routine",
    plainEn:
      "As we age, the jelly inside the eye (the vitreous) shrinks and can separate from the retina, which often causes floaters (small moving specks or cobwebs) and sometimes flashes. It is common and usually harmless, but because it can occasionally cause a retinal tear, new floaters or flashes should be checked, and you should seek help quickly if they suddenly increase or a shadow appears.",
    plainZh:
      "隨着年齡增長，眼球內的玻璃體（啫喱狀物質）會收縮並與視網膜分離，常引致飛蚊（細小移動的黑點或蜘蛛網）及偶爾閃光。這情況很常見，通常無大礙，但因為偶爾會造成視網膜裂孔，新出現的飛蚊或閃光應該檢查；如飛蚊突然增多或出現陰影，請盡快求醫。",
    warnEn:
      "If you notice many new floaters, flashes of light, or a curtain or shadow over your vision, go to an Accident & Emergency department the same day.",
    warnZh: "如突然出現大量新的飛蚊、閃光，或視野中有如窗簾或陰影般的遮擋，請即日前往急症室。",
  },
  {
    id: "vh",
    en: "Vitreous haemorrhage",
    zh: "玻璃體出血",
    words: ["vitreous haemorrhage", "vitreous hemorrhage"],
    abbr: ["VH"],
    zhWords: ["玻璃體出血"],
    urgency: "urgent",
    plainEn:
      "Blood has leaked into the jelly-like centre of the eye, which can cause floaters, a red haze or sudden blurring. The cause needs to be found; some cases clear on their own while others need laser or surgery. Please report any sudden worsening of vision.",
    plainZh:
      "血液滲入眼球中央的玻璃體，可引致飛蚊、紅色朦朧感或視力突然模糊。醫生需要找出原因；部分情況可自行清除，部分需要激光或手術。如視力突然變差，請盡快求醫。",
  },
  {
    id: "rvo",
    en: "Retinal vein occlusion",
    zh: "視網膜靜脈阻塞",
    words: [
      "retinal vein occlusion",
      "central retinal vein occlusion",
      "branch retinal vein occlusion",
      "vein occlusion",
    ],
    abbr: ["CRVO", "BRVO", "RVO", "HRVO"],
    zhWords: ["視網膜靜脈阻塞", "視網膜靜脈栓塞", "視網膜中央靜脈阻塞", "視網膜分支靜脈阻塞"],
    urgency: "urgent",
    plainEn:
      "A retinal vein occlusion is a blockage of one of the veins that drain blood from the retina. It can cause blurred vision and swelling at the macula. Injections or laser may be used, and your doctor will also look for related health conditions such as high blood pressure, diabetes and high cholesterol.",
    plainZh:
      "視網膜靜脈阻塞是負責運走視網膜血液的靜脈被堵塞，可引致視力模糊及黃斑部腫脹。醫生可能以注射或激光治療，並會檢查有否相關的健康問題，例如高血壓、糖尿病及高膽固醇。",
  },
  {
    id: "crao",
    en: "Retinal artery occlusion",
    zh: "視網膜動脈阻塞（眼中風）",
    words: [
      "central retinal artery occlusion",
      "retinal artery occlusion",
      "branch retinal artery occlusion",
      "cherry red spot",
      "cherry-red spot",
    ],
    abbr: ["CRAO", "BRAO"],
    zhWords: ["視網膜動脈阻塞", "視網膜中央動脈阻塞", "視網膜動脈栓塞", "視網膜中風", "眼中風"],
    urgency: "emergency",
    plainEn:
      'A retinal artery occlusion is a sudden blockage of the blood supply to the retina, often described as a "stroke of the eye". It usually causes sudden painless loss of vision and is an emergency, because it can be linked with problems in the blood vessels of the heart and brain as well.',
    plainZh:
      "視網膜動脈阻塞是視網膜的血液供應突然中斷，常被形容為「眼中風」。通常會突然出現無痛的視力喪失，屬於緊急情況，因為它可能與心臟及腦部血管問題有關。",
    warnEn: "Sudden painless loss of vision in one eye needs emergency assessment the same day.",
    warnZh: "單眼突然失去視力（無痛）需要即日緊急評估。",
  },
  {
    id: "erm",
    en: "Epiretinal membrane (macular pucker)",
    zh: "黃斑前膜",
    words: ["epiretinal membrane", "macular pucker", "cellophane maculopathy"],
    abbr: ["ERM"],
    zhWords: ["黃斑前膜", "黃斑部前膜", "視網膜前膜", "黃斑皺褶"],
    urgency: "semi",
    plainEn:
      "A thin layer of scar-like tissue has formed on the surface of the macula, which can make the retina wrinkle and cause blurred or distorted vision (for example, straight lines looking wavy). Many cases stay stable and are simply observed; surgery may be considered if vision is significantly affected.",
    plainZh:
      "黃斑部表面長出一層薄薄的疤痕狀組織，令視網膜起皺，引致視力模糊或扭曲（例如直線看起來彎曲）。不少個案病情穩定，只需觀察；如視力受到明顯影響，可考慮手術。",
  },
  {
    id: "mh",
    en: "Macular hole",
    zh: "黃斑裂孔",
    words: ["macular hole"],
    abbr: [],
    zhWords: ["黃斑裂孔", "黃斑部裂孔", "黃斑孔"],
    urgency: "semi",
    plainEn:
      "A macular hole is a small break in the centre of the retina, causing blurred or distorted central vision, often with a dark or empty spot in the middle. Surgery can often close the hole and improve vision, particularly when it is done relatively early.",
    plainZh:
      "黃斑裂孔是視網膜中央出現細小裂口，引致中央視力模糊或扭曲，中央常有一片暗點或空白。手術往往可以閉合裂孔並改善視力，尤其在較早階段進行。",
  },
  {
    id: "csc",
    en: "Central serous chorioretinopathy",
    zh: "中心性漿液性脈絡膜視網膜病變",
    words: ["central serous chorioretinopathy", "central serous retinopathy", "central serous"],
    abbr: ["CSC", "CSCR", "CSR"],
    zhWords: ["中心性漿液性脈絡膜視網膜病變", "中心性漿液性", "中心漿液性", "中漿"],
    urgency: "routine",
    plainEn:
      "Fluid collects under the central part of the retina, causing blurred or distorted central vision, often with objects looking smaller or dimmer. It is often linked with stress, and in many people it settles by itself over a few months; some people need treatment.",
    plainZh:
      "液體積聚在視網膜中央部分的下方，令中央視力模糊或扭曲，物件可能看起來較小或較暗。這情況常與壓力有關，不少人會在數月內自行好轉，部分人需要治療。",
  },
  {
    id: "htnr",
    en: "Hypertensive retinopathy",
    zh: "高血壓視網膜病變",
    words: ["hypertensive retinopathy"],
    abbr: [],
    zhWords: ["高血壓視網膜病變", "高血壓性視網膜病變"],
    urgency: "routine",
    plainEn:
      "Long-standing high blood pressure can damage the small blood vessels in the retina. Keeping blood pressure well controlled, as advised by your doctor, helps protect your eyes.",
    plainZh: "長期高血壓可損害視網膜的微細血管。按醫生指示好好控制血壓，有助保護眼睛。",
  },
  {
    id: "myopia",
    en: "Short-sightedness (myopia)",
    zh: "近視",
    words: ["myopia", "myopic", "short-sighted", "short sighted", "shortsightedness"],
    abbr: [],
    zhWords: ["近視", "近视"],
    urgency: "routine",
    plainEn:
      "Short-sightedness (myopia) means near objects look clear but distant ones look blurred, because the eye is slightly too long or focuses too strongly. It can be corrected with glasses, contact lenses or other treatments.",
    plainZh:
      "近視：看近物清楚，看遠處模糊，原因是眼軸偏長或屈光力偏強。可以透過眼鏡、隱形眼鏡或其他方法矯正。",
  },
  {
    id: "highmyopia",
    en: "High (pathological) myopia",
    zh: "高度近視",
    words: [
      "high myopia",
      "pathological myopia",
      "myopic maculopathy",
      "myopic degeneration",
      "degenerative myopia",
      "high degree of myopia",
    ],
    abbr: [],
    zhWords: ["高度近視", "病理性近視", "近視性黃斑", "近視性黃斑病變"],
    urgency: "routine",
    plainEn:
      "Very high short-sightedness lengthens the eyeball and stretches the tissues at the back of the eye, which raises the chance of problems such as retinal tears or detachment, glaucoma, cataract and macular changes. Regular dilated eye checks are recommended, and you should know the warning signs of a retinal tear.",
    plainZh:
      "高度近視令眼球變長，並拉扯眼底組織，增加出現視網膜裂孔或脫落、青光眼、白內障及黃斑病變的機會。建議定期作散瞳眼底檢查，並認識視網膜裂孔的警號。",
    warnEn:
      "If you notice many new floaters, flashes of light, or a curtain or shadow over your vision, go to an Accident & Emergency department the same day.",
    warnZh: "如突然出現大量新的飛蚊、閃光，或視野中有如窗簾或陰影般的遮擋，請即日前往急症室。",
  },
  {
    id: "hyperopia",
    en: "Long-sightedness (hyperopia)",
    zh: "遠視",
    words: [
      "hyperopia",
      "hypermetropia",
      "long-sighted",
      "long sighted",
      "far-sighted",
      "farsighted",
    ],
    abbr: [],
    zhWords: ["遠視", "远视"],
    urgency: "routine",
    plainEn:
      "Long-sightedness (hyperopia) means the eye has to work harder to focus, especially for near tasks, which can cause tired eyes, headaches or blurred vision. It can be corrected with glasses or contact lenses.",
    plainZh:
      "遠視：眼睛需要更用力對焦，尤其是看近物時，可能出現眼疲勞、頭痛或視力模糊。可用眼鏡或隱形眼鏡矯正。",
  },
  {
    id: "astigmatism",
    en: "Astigmatism",
    zh: "散光",
    words: ["astigmatism"],
    abbr: [],
    zhWords: ["散光"],
    urgency: "routine",
    plainEn:
      "Astigmatism means the front surface of the eye (or the lens) is not evenly curved, so images do not focus sharply in every direction and can look blurred or doubled. It can be corrected with glasses, contact lenses or other methods.",
    plainZh:
      "散光：因為角膜或晶體的弧度不均勻，令不同方向的影像未能同時聚焦，看東西模糊或有重影。可用眼鏡、隱形眼鏡或其他方法矯正。",
  },
  {
    id: "presbyopia",
    en: "Presbyopia (age-related near-vision change)",
    zh: "老花",
    words: ["presbyopia", "presbyopic"],
    abbr: [],
    zhWords: ["老花", "老視"],
    urgency: "routine",
    plainEn:
      "With age the lens inside the eye becomes less flexible, so close work such as reading takes more effort. It usually starts in the early to mid 40s and can be corrected with reading glasses or multifocal lenses.",
    plainZh:
      "老花：隨年齡增長，眼睛的晶體失去彈性，看近物（如閱讀）變得吃力。通常在四十多歲開始出現，可透過老花眼鏡或多焦點鏡片矯正。",
  },
  {
    id: "dryeye",
    en: "Dry eye",
    zh: "乾眼症",
    words: [
      "dry eye",
      "dry eyes",
      "keratoconjunctivitis sicca",
      "meibomian gland dysfunction",
      "tear film instability",
      "ocular surface disease",
    ],
    abbr: ["MGD", "DED"],
    zhWords: ["乾眼症", "乾眼", "眼乾", "淚液分泌不足", "瞼板腺功能障礙"],
    urgency: "routine",
    plainEn:
      "Dry eye happens when the eyes do not make enough tears or the tears evaporate too quickly. It can cause a gritty, burning or tired feeling, redness, and sometimes watery or blurred vision. Lubricating drops, warm compresses, lid cleaning, blinking breaks during screen use and a comfortable environment usually help.",
    plainZh:
      "乾眼症是淚液分泌不足或蒸發太快所致，可引致眼睛有砂礫感、灼熱感或疲倦、眼紅，有時反而流眼水或視力模糊。使用潤滑眼藥水、熱敷、清潔眼瞼、看屏幕時多眨眼休息，以及保持舒適的環境，通常都有幫助。",
  },
  {
    id: "blepharitis",
    en: "Blepharitis (eyelid-margin inflammation)",
    zh: "瞼緣炎",
    words: ["blepharitis"],
    abbr: [],
    zhWords: ["瞼緣炎", "眼瞼炎", "眼瞼緣炎"],
    urgency: "routine",
    plainEn:
      "Blepharitis is long-term inflammation of the eyelid margins, causing redness, crusting, itching or a gritty feeling. It tends to come and go, and daily lid cleaning with warm compresses usually keeps it under control.",
    plainZh:
      "瞼緣炎是眼瞼邊緣長期發炎，引致眼紅、結痂、痕癢或有砂礫感，病情時好時壞。每日以熱敷及清潔眼瞼，通常可以控制。",
  },
  {
    id: "conjunctivitis",
    en: "Conjunctivitis",
    zh: "結膜炎",
    words: ["conjunctivitis", "pink eye"],
    abbr: [],
    zhWords: ["結膜炎", "紅眼症", "红眼症"],
    urgency: "routine",
    plainEn:
      "Conjunctivitis is inflammation of the thin clear layer covering the white of the eye and the inside of the eyelids. It causes redness, discharge, itching or a gritty feeling. Allergic, viral and bacterial types are treated differently. Viral and bacterial types can spread, so wash hands often, avoid sharing towels and avoid touching the eyes.",
    plainZh:
      "結膜炎是覆蓋眼白及眼瞼內側的透明薄膜發炎，引致眼紅、分泌物、痕癢或有砂礫感。過敏性、病毒性及細菌性的治療各有不同；病毒性和細菌性可以傳染，所以要勤洗手、不要共用毛巾，並避免觸摸眼睛。",
  },
  {
    id: "allergic",
    en: "Allergic eye disease",
    zh: "過敏性結膜炎",
    words: [
      "allergic conjunctivitis",
      "vernal keratoconjunctivitis",
      "atopic keratoconjunctivitis",
      "vernal",
    ],
    abbr: ["VKC", "AKC"],
    zhWords: ["過敏性結膜炎", "敏感性結膜炎", "春季角結膜炎"],
    urgency: "routine",
    plainEn:
      "Allergic eye disease causes itchy, red, watery eyes triggered by things such as pollen, dust mites or pet dander. Avoiding triggers, not rubbing the eyes and using the treatment advised by your doctor help; rubbing tends to make symptoms worse.",
    plainZh:
      "過敏性結膜炎由花粉、塵蟎或寵物毛髮等引發，令眼睛痕癢、紅腫、流眼水。避開誘因、不要揉眼，並按醫生建議使用治療，有助紓緩；揉眼只會令情況惡化。",
  },
  {
    id: "keratitis",
    en: "Keratitis / corneal ulcer",
    zh: "角膜炎／角膜潰瘍",
    words: [
      "keratitis",
      "corneal ulcer",
      "corneal infiltrate",
      "microbial keratitis",
      "herpetic keratitis",
      "HSV keratitis",
    ],
    abbr: ["HSK", "HZO"],
    zhWords: ["角膜炎", "角膜潰瘍", "角膜溃疡"],
    urgency: "urgent",
    plainEn:
      "Keratitis means inflammation or infection of the cornea, the clear window at the front of the eye. It can cause pain, redness, light sensitivity and blurred vision, and needs prompt treatment to protect the cornea from scarring. Contact lens wearers are usually advised not to wear lenses while the cornea is inflamed, until the doctor says it is safe.",
    plainZh:
      "角膜炎是角膜（眼球前方的透明「窗口」）發炎或受感染，可引致眼痛、眼紅、怕光及視力模糊，需要盡快治療，以免角膜留下疤痕。配戴隱形眼鏡的人，在角膜發炎期間通常需要停戴，直至醫生確認安全為止。",
  },
  {
    id: "abrasion",
    en: "Corneal abrasion / erosion",
    zh: "角膜擦傷",
    words: ["corneal abrasion", "corneal erosion", "recurrent erosion", "corneal scratch"],
    abbr: [],
    zhWords: ["角膜擦傷", "角膜磨損", "角膜上皮脫落"],
    urgency: "routine",
    plainEn:
      "The surface layer of the cornea has been scratched or has come away, which can cause stinging, watering, light sensitivity and a feeling that something is in the eye. It usually heals within a few days, but treatment and review as directed are needed to prevent infection.",
    plainZh:
      "角膜表面的上皮出現擦傷或剝落，可引致刺痛、流淚、怕光及有異物感。通常數日內癒合，但需要按醫生指示用藥及覆診，以防感染。",
  },
  {
    id: "pterygium",
    en: "Pterygium / pinguecula",
    zh: "翼狀胬肉／瞼裂斑",
    words: ["pterygium", "pinguecula"],
    abbr: [],
    zhWords: ["翼狀胬肉", "胬肉", "瞼裂斑"],
    urgency: "routine",
    plainEn:
      "A pterygium is a fleshy, vein-filled growth on the white of the eye that may creep onto the cornea, causing redness, irritation and, if large, blurred vision. A pinguecula is a smaller yellowish bump that does not grow onto the cornea. Sun, wind and dust can aggravate them, and sunglasses help. Surgery may be considered if vision or comfort is affected.",
    plainZh:
      "翼狀胬肉是眼白上長出的一塊帶血管的肉狀組織，可向角膜伸展，引致紅腫、不適，嚴重時影響視力；瞼裂斑則是較小的黃白色隆起，不會長入角膜。紫外線和風沙可能令它們惡化，戴太陽眼鏡有助保護；若影響視力或持續不適，可考慮手術。",
  },
  {
    id: "keratoconus",
    en: "Keratoconus",
    zh: "圓錐角膜",
    words: ["keratoconus", "corneal ectasia"],
    abbr: [],
    zhWords: ["圓錐角膜", "圓錐形角膜"],
    urgency: "routine",
    plainEn:
      "Keratoconus is a condition in which the cornea gradually thins and bulges into a cone shape, causing blurred or distorted vision and increasing astigmatism. Avoid rubbing your eyes. Treatments such as special lenses or corneal cross-linking can help stabilise it.",
    plainZh:
      "圓錐角膜是角膜逐漸變薄並向外凸成圓錐形，引致視力模糊、扭曲及散光加深。應避免揉眼。特殊鏡片或角膜交聯術等治療有助穩定病情。",
  },
  {
    id: "uveitis",
    en: "Uveitis (inflammation inside the eye)",
    zh: "葡萄膜炎",
    words: ["uveitis", "iritis", "iridocyclitis", "anterior uveitis", "posterior uveitis"],
    abbr: [],
    zhWords: ["葡萄膜炎", "虹膜炎", "虹彩炎"],
    urgency: "urgent",
    plainEn:
      "Uveitis is inflammation inside the eye (in the uvea, the middle layer). It can cause redness, pain, light sensitivity, floaters and blurred vision. It needs treatment, commonly with anti-inflammatory eye drops or tablets, to prevent complications, and it may be linked to conditions elsewhere in the body, so your doctor may arrange further tests.",
    plainZh:
      "葡萄膜炎是眼球內部（葡萄膜，即中間一層）發炎，可引致眼紅、眼痛、怕光、飛蚊及視力模糊。需要治療（常用消炎眼藥水或藥丸）以預防併發症，而且可能與身體其他部位的疾病有關，醫生可能安排進一步檢查。",
  },
  {
    id: "scleritis",
    en: "Scleritis / episcleritis",
    zh: "鞏膜炎",
    words: ["scleritis", "episcleritis"],
    abbr: [],
    zhWords: ["鞏膜炎", "表層鞏膜炎"],
    urgency: "urgent",
    plainEn:
      "Scleritis or episcleritis is inflammation of the white wall of the eye. It causes redness and, in scleritis, often deep, severe pain. It needs medical treatment, and your doctor may look for related conditions elsewhere in the body.",
    plainZh:
      "鞏膜炎或表層鞏膜炎是眼白（鞏膜）發炎，引致眼紅；鞏膜炎往往伴隨深層劇痛。需要藥物治療，醫生也可能檢查身體其他部位有否相關疾病。",
  },
  {
    id: "opticneuritis",
    en: "Optic neuritis",
    zh: "視神經炎",
    words: ["optic neuritis", "papillitis", "retrobulbar neuritis"],
    abbr: [],
    zhWords: ["視神經炎"],
    urgency: "urgent",
    plainEn:
      "Optic neuritis is inflammation of the optic nerve. It can cause blurred or reduced vision, colours looking washed out, and pain on moving the eye. It needs prompt assessment and treatment, and your doctor may arrange further tests (such as an MRI scan) to look for the cause.",
    plainZh:
      "視神經炎是視神經發炎，可引致視力模糊或下降、顏色變淡，以及轉動眼球時疼痛。需要盡快評估及治療，醫生可能安排進一步檢查（如磁力共振）以找出原因。",
  },
  {
    id: "papilloedema",
    en: "Swollen optic disc (papilloedema)",
    zh: "視乳頭水腫",
    words: [
      "papilloedema",
      "papilledema",
      "disc swelling",
      "swollen disc",
      "optic disc swelling",
      "disc oedema",
      "disc edema",
    ],
    abbr: [],
    zhWords: ["視乳頭水腫", "視盤水腫", "視乳頭腫脹"],
    urgency: "urgent",
    plainEn:
      "Swelling of the optic disc, where the optic nerve enters the eye, can have several causes, some of which involve pressure inside the head or inflammation. It needs prompt assessment to find the cause.",
    plainZh:
      "視乳頭（視神經進入眼球的位置）腫脹可由多種原因引致，部分涉及顱內壓力或炎症，需要盡快評估以找出原因。",
  },
  {
    id: "opticneuropathy",
    en: "Optic nerve disease (optic neuropathy)",
    zh: "視神經病變",
    words: [
      "ischaemic optic neuropathy",
      "ischemic optic neuropathy",
      "optic neuropathy",
      "optic atrophy",
    ],
    abbr: ["NAION", "AION"],
    zhWords: ["視神經病變", "視神經萎縮", "缺血性視神經病變"],
    urgency: "urgent",
    plainEn:
      "Damage to, or poor function of, the optic nerve (for example from poor blood supply, inflammation or other causes) can reduce vision or the visual field. Your doctor will look for the cause and for related health conditions.",
    plainZh:
      "視神經受損或功能出現問題（例如血液供應不足、炎症或其他原因），可引致視力或視野受損。醫生需要找出成因，並檢查有否相關的健康問題。",
  },
  {
    id: "amblyopia",
    en: "Amblyopia (lazy eye)",
    zh: "弱視",
    words: ["amblyopia", "lazy eye"],
    abbr: [],
    zhWords: ["弱視", "懶惰眼"],
    urgency: "routine",
    plainEn:
      'Amblyopia ("lazy eye") means the brain and one eye have not learnt to work together properly during childhood, so vision in that eye stays reduced even with glasses. It is treated mainly in childhood with glasses, patching or drops, and treatment works best when started early.',
    plainZh:
      "弱視（俗稱「懶惰眼」）是兒童時期大腦與其中一隻眼睛未能好好協調，即使配戴眼鏡，該眼視力仍然偏低。主要在兒童期以眼鏡、遮眼或眼藥水治療，愈早開始效果愈好。",
  },
  {
    id: "strabismus",
    en: "Squint (strabismus)",
    zh: "斜視",
    words: [
      "strabismus",
      "squint",
      "esotropia",
      "exotropia",
      "heterotropia",
      "exophoria",
      "esophoria",
    ],
    abbr: [],
    zhWords: ["斜視", "斜眼", "鬥雞眼", "外斜", "內斜"],
    urgency: "routine",
    plainEn:
      "A squint means the two eyes do not point in the same direction at the same time. It can turn in, out, up or down, in children or adults. Treatment depends on the cause and may include glasses, eye exercises, patching or surgery.",
    plainZh:
      "斜視是兩隻眼睛未能同時朝向同一方向，可能是內斜、外斜、上斜或下斜，可出現於兒童或成人。治療視乎成因，可能包括眼鏡、視覺訓練、遮眼或手術。",
  },
  {
    id: "chalazion",
    en: "Chalazion / stye",
    zh: "霰粒腫／麥粒腫",
    words: ["chalazion", "hordeolum", "stye"],
    abbr: [],
    zhWords: ["麥粒腫", "針眼", "霰粒腫"],
    urgency: "routine",
    plainEn:
      "A chalazion is a lump in the eyelid caused by a blocked oil gland, while a stye is a small, painful infected lump at the eyelid edge. Warm compresses several times a day often help; please do not squeeze the lump. Some lumps that do not settle need minor treatment.",
    plainZh:
      "霰粒腫是眼瞼內油脂腺阻塞形成的硬塊，麥粒腫（針眼）則是眼瞼邊緣細小、疼痛的感染腫塊。每日數次熱敷通常有幫助，請勿擠壓腫塊；部分持續不退的腫塊需要小手術處理。",
  },
  {
    id: "nldo",
    en: "Blocked tear drainage (watering eye)",
    zh: "淚道阻塞（流眼水）",
    words: [
      "nasolacrimal duct obstruction",
      "NLDO",
      "epiphora",
      "blocked tear duct",
      "dacryocystitis",
      "watering eye",
    ],
    abbr: [],
    zhWords: ["淚道阻塞", "淚管阻塞", "淚道堵塞", "流眼水"],
    urgency: "routine",
    plainEn:
      "The tear drainage channel from the eye to the nose is blocked or narrowed, so tears spill over the eyelid (watering eye) and can sometimes lead to infection. Treatment depends on the cause and may include flushing of the tear duct or surgery.",
    plainZh:
      "由眼睛通往鼻腔的淚水排出通道阻塞或收窄，淚水便會溢出眼瞼（流眼水），有時還會引起感染。治療視乎成因，可能包括沖洗淚道或手術。",
  },
  {
    id: "ted",
    en: "Thyroid eye disease",
    zh: "甲狀腺眼病",
    words: [
      "thyroid eye disease",
      "Graves orbitopathy",
      "Graves ophthalmopathy",
      "thyroid orbitopathy",
      "thyroid ophthalmopathy",
    ],
    abbr: ["TED"],
    zhWords: ["甲狀腺眼病", "甲狀腺眼疾", "格雷夫斯眼病"],
    urgency: "semi",
    plainEn:
      "Thyroid eye disease is an immune reaction linked with thyroid problems that affects the muscles and fat around the eye. It can cause bulging, dryness, redness, eyelid retraction or double vision, and is usually followed up by eye and hormone specialists together.",
    plainZh:
      "甲狀腺眼病是與甲狀腺疾病相關的免疫反應，影響眼窩內的肌肉及脂肪組織，可引致眼睛突出、乾澀、眼紅、眼瞼縮上或重影。需要眼科及內分泌科配合跟進。",
  },
  {
    id: "trauma",
    en: "Eye injury",
    zh: "眼外傷",
    words: [
      "ocular trauma",
      "hyphaema",
      "hyphema",
      "globe rupture",
      "open globe",
      "orbital fracture",
      "blow-out fracture",
      "chemical injury",
      "chemical burn",
      "penetrating injury",
      "intraocular foreign body",
    ],
    abbr: [],
    zhWords: ["眼外傷", "眼部外傷", "前房出血", "眼球破裂", "化學灼傷", "眼內異物"],
    urgency: "emergency",
    plainEn:
      "An eye injury can affect the surface of the eye, structures inside the eye, or the bones around it, and needs prompt assessment by an eye doctor because some injuries look minor at first but can affect vision. Please follow the advice about review visits and protecting the injured eye.",
    plainZh:
      "眼外傷可能傷及眼球表面、眼內結構或眼眶，需要盡快由眼科醫生評估，因為有些傷害初時看似輕微，卻可能影響視力。請遵照醫生指示覆診及保護受傷的眼睛。",
  },
  {
    id: "endophthalmitis",
    en: "Endophthalmitis (infection inside the eye)",
    zh: "眼內炎",
    words: ["endophthalmitis"],
    abbr: [],
    zhWords: ["眼內炎"],
    urgency: "emergency",
    plainEn:
      "Endophthalmitis is an infection inside the eye. It is an emergency and needs immediate treatment to protect vision.",
    plainZh: "眼內炎是眼球內部的感染，屬於緊急情況，需要即時治療以保護視力。",
  },
  {
    id: "rp",
    en: "Inherited retinal disease (e.g. retinitis pigmentosa)",
    zh: "遺傳性視網膜病變（如視網膜色素變性）",
    words: ["retinitis pigmentosa", "retinal dystrophy", "inherited retinal"],
    abbr: ["RP"],
    zhWords: ["視網膜色素變性", "視網膜色素病變", "遺傳性視網膜"],
    urgency: "routine",
    plainEn:
      "Inherited retinal diseases such as retinitis pigmentosa gradually damage the light-sensing cells of the retina, often affecting night vision and side vision first. A treatment that reverses the condition is not always available, but regular check-ups, management of complications such as cataract, and good support and information are important.",
    plainZh:
      "視網膜色素變性等遺傳性視網膜病變會令視網膜的感光細胞逐漸受損，常先影響夜間視力及周邊視野。目前不一定有能夠逆轉病情的治療，但定期檢查、處理白內障等併發症，並獲得適當的支援及資訊都很重要。",
  },
  {
    id: "eyelid",
    en: "Eyelid or eyelash position problem",
    zh: "眼瞼／睫毛位置問題",
    words: ["entropion", "ectropion", "trichiasis", "ptosis"],
    abbr: [],
    zhWords: ["眼瞼內翻", "眼瞼外翻", "倒睫", "眼瞼下垂", "上眼瞼下垂"],
    urgency: "routine",
    plainEn:
      "An eyelid or eyelash position problem (for example a drooping lid, a lid turning in or out, or lashes rubbing on the eye) can affect comfort, protection of the eye surface and sometimes vision. A small eyelid procedure is often used when treatment is needed.",
    plainZh:
      "眼瞼或睫毛位置出現問題（例如眼瞼下垂、向內或向外翻，或睫毛倒生刮到眼球），可影響舒適度、眼球表面的保護，有時亦影響視力。有需要時，常以小型眼瞼手術處理。",
  },
];

export const TESTS = [
  {
    id: "oct",
    en: "OCT scan",
    zh: "光學斷層掃描（OCT）",
    words: ["optical coherence tomography", "OCT-A", "OCT angiography"],
    abbr: ["OCT"],
    zhWords: ["光學相干斷層", "光學斷層掃描", "相干光斷層"],
    plainEn:
      "A quick, painless scan that does not touch the eye. It uses light to take detailed cross-section pictures of the retina or optic nerve.",
    plainZh:
      "光學斷層掃描（OCT）是快捷、無痛、不用接觸眼睛的檢查，利用光線拍攝視網膜或視神經的詳細橫切面影像。",
  },
  {
    id: "vf",
    en: "Visual field test",
    zh: "視野檢查",
    words: ["visual field", "visual fields", "perimetry", "automated perimetry"],
    abbr: ["VF", "HVF"],
    zhWords: ["視野檢查", "視野測試", "視野"],
    plainEn:
      "You press a button whenever you see a small flash of light, which maps your side (peripheral) vision and finds any areas of reduced sight. It needs concentration, so results can differ a little from visit to visit.",
    plainZh:
      "每當見到細小閃光便按鈕，用以描繪你的周邊視野，找出視力減退的區域。這項檢查需要集中精神，不同日子的結果可能略有差異。",
  },
  {
    id: "dfe",
    en: "Dilated eye examination",
    zh: "散瞳眼底檢查",
    words: [
      "dilated fundus examination",
      "dilated fundus exam",
      "dilated examination",
      "dilated exam",
      "fundoscopy",
      "fundus examination",
      "fundus exam",
      "dilated",
    ],
    abbr: ["DFE"],
    zhWords: ["散瞳檢查", "散瞳", "眼底檢查"],
    plainEn:
      "Dilating drops enlarge the pupils so the doctor can see the back of the eye clearly. Vision is blurred and lights look bright for some hours afterwards, so please do not drive until you feel it is safe, and consider bringing sunglasses.",
    plainZh:
      "滴入散瞳藥水令瞳孔放大，醫生便能清楚看到眼底。散瞳後數小時視力會模糊及怕光，請在感覺安全前不要駕駛，並可帶備太陽眼鏡。",
  },
  {
    id: "ffa",
    en: "Fluorescein angiography",
    zh: "螢光素血管造影",
    words: [
      "fluorescein angiography",
      "fluorescein angiogram",
      "fundus fluorescein angiography",
      "indocyanine green angiography",
    ],
    abbr: ["FFA", "ICGA"],
    zhWords: ["螢光素血管造影", "熒光血管造影", "眼底血管造影"],
    plainEn:
      "A dye is injected into a vein in your arm, and photographs of the back of the eye are taken as the dye flows through the blood vessels, showing any leaks or blockages. Your skin and urine may look yellow for a day. Please tell staff beforehand about any allergies or kidney problems.",
    plainZh:
      "從手臂靜脈注射螢光染料，並在染料流經眼底血管時拍照，顯示滲漏或阻塞。檢查後皮膚及尿液可能短暫呈黃色。如有任何過敏或腎臟問題，請預先告知醫護人員。",
  },
  {
    id: "fundusphoto",
    en: "Retinal photographs",
    zh: "眼底相",
    words: [
      "fundus photo",
      "fundus photograph",
      "fundus photography",
      "retinal photograph",
      "retinal photo",
      "fundus camera",
    ],
    abbr: [],
    zhWords: ["眼底相", "眼底攝影", "視網膜相片"],
    plainEn:
      "Photographs of the retina and optic nerve are taken with a special camera, to keep a record and compare changes over time.",
    plainZh: "以特殊相機拍攝視網膜及視神經的相片，用作記錄及日後比較。",
  },
  {
    id: "gonio",
    en: "Drainage-angle examination (gonioscopy)",
    zh: "房角鏡檢查",
    words: ["gonioscopy", "gonio"],
    abbr: [],
    zhWords: ["前房角鏡", "房角鏡檢查", "房角鏡"],
    plainEn:
      "After numbing drops, a special lens is placed gently on the eye to look at the drainage angle and see whether it is open or narrow.",
    plainZh: "眼睛麻醉後，輕輕放上一塊特殊鏡片，觀察排水通道（房角）是開放還是狹窄。",
  },
  {
    id: "biometry",
    en: "Eye measurements for lens power (biometry)",
    zh: "生物測量",
    words: ["biometry", "A-scan", "IOL calculation", "axial length"],
    abbr: [],
    zhWords: ["眼軸長度", "生物測量", "人工晶體度數"],
    plainEn:
      "Measurements of the length of the eye and the curve of the cornea, used to choose the power of the artificial lens for cataract surgery.",
    plainZh: "量度眼球長度及角膜弧度，用以選擇白內障手術所用的人工晶體度數。",
  },
  {
    id: "bscan",
    en: "Eye ultrasound",
    zh: "眼部超聲波",
    words: ["B-scan", "ocular ultrasound", "ultrasound of the eye"],
    abbr: [],
    zhWords: ["眼部超聲波", "B超", "眼超聲波"],
    plainEn:
      "Sound waves are used to look at structures inside and behind the eye, which is especially useful when the view into the eye is poor (for example because of cloudiness or bleeding).",
    plainZh: "用聲波檢視眼球內部及後方結構，當眼內較難看清（例如有混濁或出血）時特別有用。",
  },
  {
    id: "topography",
    en: "Corneal mapping (topography)",
    zh: "角膜地形圖",
    words: ["corneal topography", "topography", "corneal tomography"],
    abbr: [],
    zhWords: ["角膜地形圖", "角膜形態圖"],
    plainEn:
      "Light is used to map the shape and thickness of the front surface of the eye, which helps check for conditions such as keratoconus and astigmatism.",
    plainZh: "以光線描繪角膜表面的形狀及厚度，有助檢查圓錐角膜、散光等。",
  },
  {
    id: "pachy",
    en: "Corneal thickness measurement",
    zh: "角膜厚度測量",
    words: ["pachymetry", "central corneal thickness"],
    abbr: ["CCT"],
    zhWords: ["角膜厚度"],
    plainEn:
      "The thickness of the cornea is measured, which helps interpret eye-pressure readings more accurately.",
    plainZh: "量度角膜厚薄，有助更準確地理解眼壓讀數。",
  },
  {
    id: "refraction",
    en: "Glasses prescription check (refraction)",
    zh: "驗光",
    words: ["refraction", "cycloplegic refraction", "autorefraction", "subjective refraction"],
    abbr: [],
    zhWords: ["驗光", "屈光檢查"],
    plainEn: "A check of the glasses prescription you need.",
    plainZh: "檢查你所需的眼鏡度數。",
  },
  {
    id: "schirmer",
    en: "Tear production test",
    zh: "淚液測試",
    words: ["Schirmer", "Schirmer test", "tear break-up time"],
    abbr: ["TBUT"],
    zhWords: ["淚液測試", "淚膜破裂時間"],
    plainEn:
      "A small strip of paper is placed at the edge of the lower eyelid to measure how many tears you make, which helps judge whether you have dry eye.",
    plainZh: "把一小條濾紙放在下眼瞼邊緣，量度淚液分泌量，幫助判斷是否乾眼。",
  },
  {
    id: "imaging",
    en: "Head or orbit scan (MRI / CT)",
    zh: "磁力共振／電腦掃描",
    words: ["MRI", "CT brain", "CT scan", "neuroimaging", "MRI brain", "MRI orbit"],
    abbr: [],
    zhWords: ["磁力共振", "電腦掃描", "電腦斷層"],
    plainEn:
      "Scans of the head or the eye sockets help look for the cause of an eye or vision problem.",
    plainZh: "檢查頭部或眼窩，協助找出眼睛或視力問題的成因。",
  },
  {
    id: "blood",
    en: "Blood tests",
    zh: "驗血",
    words: ["blood test", "blood tests", "HbA1c", "ESR", "CRP", "blood work"],
    abbr: [],
    zhWords: ["驗血", "血液檢查"],
    plainEn:
      "Blood tests may be arranged to check for related health conditions, such as blood sugar and blood fats.",
    plainZh: "檢查與眼睛問題可能相關的健康狀況，例如血糖及血脂。",
  },
];

export const TREATMENTS = [
  {
    id: "slt",
    en: "Laser to the drainage tissue (SLT)",
    zh: "選擇性激光小梁成形術（SLT）",
    words: ["selective laser trabeculoplasty", "laser trabeculoplasty"],
    abbr: ["SLT", "ALT"],
    zhWords: ["選擇性激光小梁", "激光小梁成形", "激光小梁"],
    plainEn:
      "A quick outpatient laser treatment applied to the eye's drainage tissue to help lower eye pressure.",
    plainZh: "一種快捷的門診激光治療，作用於眼睛的排水組織，以幫助降低眼壓。",
  },
  {
    id: "lpi",
    en: "Laser peripheral iridotomy",
    zh: "激光虹膜周邊切開術",
    words: ["laser peripheral iridotomy", "peripheral iridotomy", "iridotomy"],
    abbr: ["LPI"],
    zhWords: ["激光虹膜切開", "虹膜周邊切開", "虹膜切開"],
    plainEn:
      "A laser makes a tiny opening at the edge of the iris to improve the flow of fluid inside the eye and reduce the risk of attacks of angle closure.",
    plainZh: "以激光在虹膜邊緣開一個微細小孔，改善眼內液體流動，減低急性閉角發作的風險。",
  },
  {
    id: "yag",
    en: "YAG laser capsulotomy",
    zh: "YAG 激光後囊切開術",
    words: ["YAG capsulotomy", "YAG laser", "laser capsulotomy", "capsulotomy"],
    abbr: [],
    zhWords: ["後囊切開", "YAG"],
    plainEn:
      "A quick, painless laser that makes a small opening in the cloudy membrane behind the artificial lens so that light can pass through clearly again.",
    plainZh: "以快捷、無痛的激光在人工晶體後方混濁的薄膜上開一個小孔，令光線再次清晰通過。",
  },
  {
    id: "retinallaser",
    en: "Laser treatment to the retina",
    zh: "視網膜激光治療",
    words: [
      "panretinal photocoagulation",
      "pan-retinal photocoagulation",
      "retinal laser",
      "laser photocoagulation",
      "focal laser",
      "grid laser",
      "laser retinopexy",
      "barrier laser",
      "laser demarcation",
      "laser treatment",
      "laser",
    ],
    abbr: ["PRP"],
    zhWords: ["視網膜激光", "全視網膜光凝", "激光光凝", "激光治療", "激光"],
    plainEn:
      "A laser is used to seal, strengthen or treat specific areas of the retina (for example to seal a tear, or to reduce abnormal blood vessels). It is done in the clinic with numbing drops, and your doctor will explain what to expect, including possible changes in night or side vision afterwards.",
    plainZh:
      "以激光封閉、加固或治療視網膜的特定部位（例如封閉裂孔，或減少異常血管）。一般在診所以麻醉眼藥水進行，醫生會解釋預期情況，包括術後夜間視力或周邊視力可能出現的變化。",
  },
  {
    id: "antivegf",
    en: "Eye injection treatment (intravitreal injection)",
    zh: "眼內注射治療",
    words: [
      "anti-VEGF",
      "intravitreal injection",
      "intravitreal injections",
      "intravitreal",
      "intravitreal therapy",
    ],
    abbr: ["IVI", "IVT"],
    zhWords: ["抗血管內皮生長因子", "玻璃體注射", "眼內注射", "眼球注射"],
    plainEn:
      "A small injection of medicine into the jelly of the eye, given under strict clean conditions after the eye has been numbed. It is used for conditions such as wet macular degeneration, diabetic macular swelling and vein blockage, and repeat treatments are often needed. Please seek help promptly if you develop increasing pain, redness or reduced vision afterwards.",
    plainZh:
      "在眼睛麻醉後，於嚴格潔淨的情況下，把藥物注入眼球內的玻璃體。用於濕性黃斑病變、糖尿黃斑水腫及視網膜靜脈阻塞等情況，通常需要重複治療。如注射後出現眼痛加劇、眼紅或視力下降，請盡快求診。",
  },
  {
    id: "cataractsurgery",
    en: "Cataract surgery",
    zh: "白內障手術",
    words: [
      "phacoemulsification",
      "phaco",
      "cataract surgery",
      "cataract extraction",
      "IOL implantation",
      "phaco-IOL",
      "phaco + IOL",
      "phaco/IOL",
      "ECCE",
      "for cataract operation",
    ],
    abbr: [],
    zhWords: ["白內障手術", "超聲乳化", "晶體置換"],
    plainEn:
      "Surgery to remove the cloudy natural lens and replace it with a clear artificial lens, usually through a very small cut and often as a day procedure. Your doctor will explain the benefits and risks, and what to do before and after the operation.",
    plainZh:
      "把混濁的天然晶體取出，並換上透明的人工晶體，通常經很小的切口進行，往往屬日間手術。醫生會解釋手術的好處及風險，以及手術前後需要注意的事項。",
  },
  {
    id: "retinasurgery",
    en: "Retinal / vitreous surgery",
    zh: "視網膜／玻璃體手術",
    words: [
      "vitrectomy",
      "pars plana vitrectomy",
      "scleral buckle",
      "pneumatic retinopexy",
      "retinal detachment surgery",
      "cryotherapy",
      "cryopexy",
    ],
    abbr: ["PPV"],
    zhWords: ["玻璃體切除", "玻璃體手術", "視網膜手術", "鞏膜環扎", "冷凍治療"],
    plainEn:
      "Surgery inside or around the eye to repair the retina or clear problems in the jelly of the eye. Your surgeon will explain the type of operation, the risks, and any positioning and follow-up needed afterwards.",
    plainZh:
      "在眼球內或眼球外進行的手術，用以修復視網膜或清除玻璃體的問題。手術醫生會解釋手術類型、風險，以及術後可能需要的特定姿勢和覆診安排。",
  },
  {
    id: "glaucomasurgery",
    en: "Glaucoma surgery",
    zh: "青光眼手術",
    words: ["trabeculectomy", "tube shunt", "glaucoma drainage device", "glaucoma surgery", "MIGS"],
    abbr: [],
    zhWords: ["小梁切除", "青光眼手術", "引流管"],
    plainEn:
      "Surgery that creates a new drainage route for fluid to leave the eye, to lower eye pressure and protect the optic nerve. Your surgeon will explain the benefits, risks and aftercare.",
    plainZh:
      "手術為眼內液體開闢新的排出途徑，以降低眼壓並保護視神經。手術醫生會解釋好處、風險及術後護理。",
  },
  {
    id: "punctal",
    en: "Tear-duct plugs",
    zh: "淚點栓",
    words: ["punctal plug", "punctal plugs", "punctal occlusion"],
    abbr: [],
    zhWords: ["淚點栓", "淚點塞"],
    plainEn:
      "Tiny plugs are placed in the tear drainage openings so your natural tears stay on the eye surface for longer, which can ease dry eye.",
    plainZh: "把微小的栓子放入淚水排出口，令天然淚水停留在眼球表面較長時間，有助紓緩乾眼。",
  },
  {
    id: "glasses",
    en: "Glasses or contact lenses",
    zh: "眼鏡／隱形眼鏡",
    words: [
      "glasses",
      "spectacles",
      "spectacle correction",
      "new prescription",
      "contact lens",
      "contact lenses",
    ],
    abbr: [],
    zhWords: ["眼鏡", "配鏡", "隱形眼鏡"],
    plainEn:
      "Glasses or contact lenses to correct focusing so that you can see as clearly as possible.",
    plainZh: "以眼鏡或隱形眼鏡矯正對焦，令你盡可能看得清楚。",
  },
  {
    id: "observe",
    en: "Observation with regular check-ups",
    zh: "定期觀察",
    words: ["observe", "observation", "monitor", "monitoring", "watchful waiting"],
    abbr: [],
    zhWords: ["觀察", "定期監察", "監察"],
    plainEn:
      "Your doctor suggests watching the condition with regular check-ups before deciding whether treatment is needed.",
    plainZh: "醫生建議先以定期覆診觀察病情，再決定是否需要治療。",
  },
];

/** INN / generic names mapped to drug classes. Brand names are deliberately not matched. */
export const DROP_CLASSES = [
  {
    id: "iop",
    en: "Eye drops that lower eye pressure",
    zh: "降眼壓眼藥水",
    words: [
      "latanoprost",
      "bimatoprost",
      "travoprost",
      "tafluprost",
      "timolol",
      "betaxolol",
      "levobunolol",
      "carteolol",
      "dorzolamide",
      "brinzolamide",
      "brimonidine",
      "apraclonidine",
      "pilocarpine",
      "antiglaucoma drops",
      "IOP lowering drops",
      "glaucoma drops",
    ],
    zhWords: ["降眼壓眼藥水", "降眼壓藥水", "青光眼眼藥水"],
    noteEn:
      "Please use these exactly as directed, usually every day even when your eyes feel fine.",
    noteZh: "請按指示使用，即使眼睛感覺良好，通常也需要每天使用。",
  },
  {
    id: "oraliop",
    en: "Tablets that lower eye pressure",
    zh: "降眼壓藥丸",
    words: ["acetazolamide", "methazolamide"],
    zhWords: ["降眼壓藥丸"],
    noteEn:
      "Please take these exactly as directed, and ask your doctor or pharmacist if you notice side effects.",
    noteZh: "請按指示服用；如有副作用，請向醫生或藥劑師查詢。",
  },
  {
    id: "steroid",
    en: "Anti-inflammatory (steroid) eye drops",
    zh: "消炎（類固醇）眼藥水",
    words: [
      "dexamethasone",
      "prednisolone",
      "fluorometholone",
      "loteprednol",
      "hydrocortisone",
      "steroid drops",
      "steroid eye drops",
    ],
    zhWords: ["類固醇眼藥水", "消炎眼藥水"],
    noteEn:
      "Please use as directed and do not stop suddenly unless your doctor says so; your doctor may check your eye pressure while you use them.",
    noteZh: "請按指示使用，除非醫生指示，不要自行突然停用；使用期間醫生可能會檢查你的眼壓。",
  },
  {
    id: "nsaid",
    en: "Anti-inflammatory (non-steroid) eye drops",
    zh: "非類固醇消炎眼藥水",
    words: ["ketorolac", "nepafenac", "bromfenac", "diclofenac"],
    zhWords: [],
    noteEn: "Please use as directed.",
    noteZh: "請按指示使用。",
  },
  {
    id: "antibiotic",
    en: "Antibiotic eye drops or ointment",
    zh: "抗生素眼藥水／眼膏",
    words: [
      "chloramphenicol",
      "levofloxacin",
      "moxifloxacin",
      "ofloxacin",
      "ciprofloxacin",
      "tobramycin",
      "gentamicin",
      "fusidic acid",
      "erythromycin",
      "antibiotic drops",
      "antibiotic eye drops",
      "antibiotic ointment",
    ],
    zhWords: ["抗生素眼藥水", "抗生素眼膏", "抗生素"],
    noteEn: "Please finish the course as directed.",
    noteZh: "請按指示完成整個療程。",
  },
  {
    id: "antiviral",
    en: "Antiviral eye treatment",
    zh: "抗病毒眼藥／眼膏",
    words: ["aciclovir", "acyclovir", "ganciclovir", "antiviral"],
    zhWords: ["抗病毒"],
    noteEn: "Please use as directed and complete the course.",
    noteZh: "請按指示使用並完成療程。",
  },
  {
    id: "lubricant",
    en: "Lubricating eye drops (artificial tears)",
    zh: "潤滑眼藥水（人造淚液）",
    words: [
      "sodium hyaluronate",
      "hyaluronate",
      "carbomer",
      "carmellose",
      "hypromellose",
      "polyvinyl alcohol",
      "artificial tears",
      "lubricant",
      "lubricants",
      "lubricating drops",
      "lubricating eye drops",
    ],
    zhWords: ["潤滑眼藥水", "人造淚液", "人工淚液"],
    noteEn:
      "These are safe to use as often as comfortable unless your doctor advises otherwise; preservative-free types are better if you use them many times a day.",
    noteZh: "除非醫生另有指示，可按需要使用；如每日需要多次使用，不含防腐劑的類型較合適。",
  },
  {
    id: "immuno",
    en: "Drops that calm inflammation on the eye surface",
    zh: "調節眼表面炎症的眼藥水",
    words: ["ciclosporin", "cyclosporine", "cyclosporin"],
    zhWords: [],
    noteEn: "These may take several weeks to work, so please keep using them as directed.",
    noteZh: "可能需要數星期才見效，請按指示持續使用。",
  },
  {
    id: "antiallergy",
    en: "Anti-allergy eye drops",
    zh: "抗過敏眼藥水",
    words: [
      "olopatadine",
      "ketotifen",
      "azelastine",
      "epinastine",
      "bepotastine",
      "sodium cromoglicate",
      "cromoglicate",
      "cromoglycate",
      "antihistamine drops",
    ],
    zhWords: ["抗過敏眼藥水"],
    noteEn: "Please use as directed, and try not to rub your eyes.",
    noteZh: "請按指示使用，並盡量不要揉眼。",
  },
  {
    id: "dilating",
    en: "Dilating (pupil-enlarging) drops",
    zh: "散瞳／放鬆睫狀肌眼藥水",
    words: [
      "atropine",
      "cyclopentolate",
      "tropicamide",
      "phenylephrine",
      "homatropine",
      "mydriatic",
      "cycloplegic",
    ],
    zhWords: ["散瞳藥水", "散瞳眼藥水"],
    noteEn:
      "These can blur near vision and make light seem brighter for a while. Your doctor will tell you the purpose of your drops.",
    noteZh: "這類藥水可能令近距離視力模糊，並暫時覺得光線較刺眼。醫生會告訴你使用這些藥水的目的。",
  },
  {
    id: "genericdrops",
    en: "Eye drops",
    zh: "眼藥水",
    words: ["eye drops", "eyedrops", "gutt", "gtt", "drops"],
    zhWords: ["眼藥水", "眼药水", "藥水"],
    noteEn: "Please use exactly as your doctor or pharmacist instructs.",
    noteZh: "請按醫生或藥劑師的指示使用。",
  },
];

export const SYSTEMIC = [
  {
    id: "dm",
    en: "diabetes mellitus",
    zh: "糖尿病",
    rx: [
      "\\bdiabetes\\b",
      "\\bdiabetic\\b",
      "\\bT2DM\\b",
      "\\bT1DM\\b",
      "\\bDM\\b",
      "\\bNIDDM\\b",
      "\\bIDDM\\b",
      "糖尿",
    ],
  },
  {
    id: "htn",
    en: "hypertension",
    zh: "高血壓",
    rx: ["(?<!ocular )(?<!ocular\\s)\\bhypertension\\b", "\\bHTN\\b", "\\bHT\\b", "高血壓"],
  },
  {
    id: "lipid",
    en: "hyperlipidaemia",
    zh: "高血脂",
    rx: [
      "\\bhyperlipid(?:a)?emia\\b",
      "\\bdyslipid(?:a)?emia\\b",
      "\\bhigh cholesterol\\b",
      "\\bHLD\\b",
      "高血脂",
      "高膽固醇",
    ],
  },
  {
    id: "ihd",
    en: "ischaemic heart disease / stroke",
    zh: "缺血性心臟病／中風",
    rx: ["\\bIHD\\b", "\\bstroke\\b", "\\bCVA\\b", "\\bTIA\\b", "心臟病", "中風"],
  },
  {
    id: "ckd",
    en: "chronic kidney disease",
    zh: "慢性腎病",
    rx: ["\\bCKD\\b", "\\brenal impairment\\b", "腎衰竭", "慢性腎病"],
  },
  { id: "asthma", en: "asthma", zh: "哮喘", rx: ["\\basthma\\b", "哮喘"] },
];

export const ALLERGY_RX =
  /\bNKDA\b|\bNKA\b|drug allerg|allergic to|\ballergies\b|過敏史|藥物敏感|藥物過敏|對.{1,12}過敏/i;

export const UNIVERSAL_WARNINGS = {
  en: {
    heading: "When to get help quickly",
    items: [
      "Sudden loss of vision, or marked blurring, in either eye",
      "New flashes of light, a sudden increase in floaters, or a curtain or shadow over your vision",
      "Severe eye pain, especially with redness, headache, nausea or halos around lights",
      "An eye injury, or a splash of chemicals in the eye",
      "New double vision, or pain, redness or discharge that is getting worse",
    ],
    action:
      "Go to the nearest Accident & Emergency department the same day. If you cannot travel safely, call 999.",
  },
  zh: {
    heading: "何時需要盡快求醫",
    items: [
      "任何一隻眼睛突然失去視力或明顯模糊",
      "突然出現閃光、飛蚊明顯增多，或視野中有如窗簾或陰影般的遮擋",
      "劇烈眼痛，特別是伴隨眼紅、頭痛、噁心或見到燈光周圍有光環",
      "眼部受傷，或有化學物質濺入眼內",
      "新出現重影，或眼痛、眼紅、分泌物持續加劇",
    ],
    action: "請即日前往最近的急症室。如無法安全前往，請致電 999。",
  },
};

export function allEnglishTokens() {
  const set = new Set();
  const add = (w) =>
    w
      .toLowerCase()
      .split(/[^a-z]+/)
      .forEach((t) => t && set.add(t));
  for (const group of [CONDITIONS, TESTS, TREATMENTS, DROP_CLASSES]) {
    for (const e of group) {
      (e.words || []).forEach(add);
      (e.abbr || []).forEach(add);
      add(e.en);
    }
  }
  return set;
}
