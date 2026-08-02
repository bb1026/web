const cnNameMap = {
    H:"氢", He:"氦", Li:"锂", Be:"铍", B:"硼", C:"碳", N:"氮", O:"氧", F:"氟", Ne:"氖", Na:"钠", Mg:"镁", Al:"铝", Si:"硅", P:"磷", S:"硫", Cl:"氯", Ar:"氩", K:"钾", Ca:"钙", Sc:"钪", Ti:"钛", V:"钒", Cr:"铬", Mn:"锰", Fe:"铁", Co:"钴", Ni:"镍", Cu:"铜", Zn:"锌", Ga:"镓", Ge:"锗", As:"砷", Se:"硒", Br:"溴", Kr:"氪", Rb:"铷", Sr:"锶", Y:"钇", Zr:"锆", Nb:"铌", Mo:"钼", Tc:"锝", Ru:"钌", Rh:"铑", Pd:"钯", Ag:"银", Cd:"镉", In:"铟", Sn:"锡", Sb:"锑", Te:"碲", I:"碘", Xe:"氙", Cs:"铯", Ba:"钡", La:"镧", Ce:"铈", Pr:"镨", Nd:"钕", Pm:"钷", Sm:"钐", Eu:"铕", Gd:"钆", Tb:"铽", Dy:"镝", Ho:"钬", Er:"铒", Tm:"铥", Yb:"镱", Lu:"镥", Hf:"铪", Ta:"钽", W:"钨", Re:"铼", Os:"锇", Ir:"铱", Pt:"铂", Au:"金", Hg:"汞", Tl:"铊", Pb:"铅", Bi:"铋", Po:"钋", At:"砹", Rn:"氡", Fr:"钫", Ra:"镭", Ac:"锕", Th:"钍", Pa:"镤", U:"铀", Np:"镎", Pu:"钚", Am:"镅", Cm:"锔", Bk:"锫", Cf:"锎", Es:"锿", Fm:"镄", Md:"钔", No:"锘", Lr:"铹", Rf:"𬬻", Db:"𬭊", Sg:"𬭳", Bh:"𬭛", Hs:"𬭶", Mt:"䥑", Ds:"鐽", Rg:"錀", Cn:"鎶",  Nh:"鉨", Fl:"鈇", Mc:"镆", Lv:"鉝", Ts:"鿬", Og:"鿫"
};

const fieldMap = {
    atomicNumber: { cn: "原子序数", en: "Atomic Number" },
    atomicMass: { cn: "原子量", en: "Atomic Mass" },
    category: { cn: "元素分类", en: "Category" },
    period: { cn: "周期", en: "Period" },
    group: { cn: "族", en: "Group" },
    density: { cn: "密度", en: "Density" },
    melting: { cn: "熔点", en: "Melting Point" },
    boiling: { cn: "沸点", en: "Boiling Point" }
};

const categoryMap = {
    alkali_metal: "碱金属",
    alkaline_earth_metal: "碱土金属",
    transition_metal: "过渡金属",
    post_transition_metal: "后过渡金属",
    metalloid: "类金属",
    nonmetal: "非金属",
    halogen: "卤素",
    noble_gas: "稀有气体",
    lanthanide: "镧系元素",
    lanthanoid: "镧系元素",
    actinide: "锕系元素",
    actinoid: "锕系元素",
    unknown: "未知"
};

let allElements = [];
/* 加载元素数据 */
async function loadElements() {
    try {
 const response = await fetch("https://api.periodictableofelements.org/elements/");
 allElements = await response.json();
 renderAll();
    } catch (err) {
 console.error(err);
 alert("元素数据加载失败");
    }
}

/* 分类转换为CSS类 */
function cssCategory(category) {
    if (!category) return "unknown";
    return category.replace(/\s+/g, "_").replace(/-/g, "_").toLowerCase();}

/* 创建元素卡片 */
function createCard(el) {
    const card = document.createElement("div");
    card.className = "element " + cssCategory(el.category);
    const cnName = cnNameMap[el.symbol] || "";
    let mass = "-";
    if (el.atomic_mass) {mass = Number(el.atomic_mass).toPrecision(6);}
    card.innerHTML = `<div class="atomic">${el.atomic_number}</div>
 <div class="symbol">${el.symbol} </div>
 <div class="cn-name">${cnName}</div>
 <div class="en-name">${el.name}</div>
 <div class="mass">${mass}</div>`;
    card.onclick = () => showDetail(el);
    return card;
}

/* 渲染全部 */
function renderAll() {
    const table = document.getElementById("table");
    const lanthanides = document.getElementById("lanthanides");
    const actinides = document.getElementById("actinides");
    table.innerHTML = "";
    lanthanides.innerHTML = "";
    actinides.innerHTML = "";
    const mainElements = allElements.filter(e => e.atomic_number < 57 || (e.atomic_number > 71 && e.atomic_number < 89) || e.atomic_number > 103);

    const lanthSeries = allElements.filter(e => e.atomic_number >= 57 && e.atomic_number <= 71);
    const actSeries = allElements.filter(e => e.atomic_number >= 89 && e.atomic_number <= 103);
    mainElements.forEach(el => {
 const card = createCard(el);
 if (el.group_number) {
     card.style.gridColumn = el.group_number;
 }

 if (el.period) {
     card.style.gridRow = el.period;
 }
 table.appendChild(card);

 /* La-Lu 占位 */
 if (el.atomic_number === 56) {
     const lanBox =  document.createElement("div");
     lanBox.className =  "series-placeholder lan-placeholder";
     lanBox.style.gridColumn = 3;
     lanBox.style.gridRow = 6;
     lanBox.innerHTML = `<div>La-Lu</div><div class="series-range">57-71</div>`;
     table.appendChild(lanBox);
 }

 /* Ac-Lr 占位 */
 if (el.atomic_number === 88) {
     const actBox = document.createElement("div");
     actBox.className = "series-placeholder act-placeholder";
     actBox.style.gridColumn = 3;
     actBox.style.gridRow = 7;
     actBox.innerHTML = `<div>Ac-Lr</div><div class="series-range">89-103</div>`;
     table.appendChild(actBox);
 }
    });
    lanthSeries.forEach(el => {lanthanides.appendChild(createCard(el));
    });
    actSeries.forEach(el => {actinides.appendChild(createCard(el));
    });
}

/* 搜索 */
function handleSearch(keyword) {
    const text = keyword.trim().toLowerCase();
    if (!text) {
 renderAll();
 return;
    }
    const result = allElements.filter(el => {
     const cnName = cnNameMap[el.symbol] || "";
     return (
  el.name.toLowerCase().includes(text) || el.symbol.toLowerCase().includes(text) || cnName.includes(text) || String(el.atomic_number).includes(text)
     );
 });
    const table = document.getElementById("table");
    const lanthanides = document.getElementById("lanthanides");
    const actinides = document.getElementById("actinides");
    table.innerHTML = "";
    lanthanides.innerHTML = "";
    actinides.innerHTML = "";

    result.forEach(el => {
 table.appendChild(createCard(el) );
    });
}

/* 详情 */
async function showDetail(el) {
    const cnName = cnNameMap[el.symbol] || el.name;
    document.getElementById("title").innerHTML = `${cnName} (${el.symbol})<br><span class="title-en">${el.name}</span>`;
    document.getElementById("atomic").innerHTML =`${el.atomic_number}<br><span class="field-en">Atomic Number</span>`;
    document.getElementById("mass").innerHTML =`${el.atomic_mass || "-"}<br><span class="field-en">Atomic Mass</span>`;
    document.getElementById("category").innerHTML =`${categoryMap[cssCategory(el.category)] || el.category}<br><span class="field-en"> ${el.category || "-"}</span>`;
    document.getElementById("period").innerHTML =`${el.period}<br><span class="field-en">Period</span>`;
    document.getElementById("group").innerHTML =`${el.group_number || "-"}<br><span class="field-en">Group</span>`;
    document.getElementById("density").innerHTML =`${el.density || "-"}<br><span class="field-en">g/cm³</span>`;
    document.getElementById("melting").innerHTML =`${el.melting_point || "-"} K<br><span class="field-en">Melting Point</span>`;
    document.getElementById("boiling").innerHTML =`${el.boiling_point || "-"} K<br><span class="field-en">Boiling Point</span>`;
    const wikiText = document.getElementById("wikiText");
    const wikiImage = document.getElementById("wikiImage");
    wikiText.innerHTML = "正在加载资料...";
    wikiImage.src = "";
    wikiImage.style.display = "none";
    try {
 let cnWiki = null;
 let enWiki = null;

 /* 中文 */
 try {
     const cnResponse = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cnName)}`);
     if (cnResponse.ok) {
  cnWiki =await cnResponse.json();
     }
 } catch {}
 /* 英文 */
 try {
     const enResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(el.name)}`);
     if (enResponse.ok) {
  enWiki = await enResponse.json();
     }
 } catch {}
 /* 图片优先英文 */
 const image = enWiki?.thumbnail?.source || cnWiki?.thumbnail?.source;
 if (image) {
     wikiImage.src = image;
     wikiImage.style.display = "block";
 }

const cnText = cnWiki?.extract || "暂无中文介绍";
const enText = enWiki?.extract || "No English description available.";
let translatedText = "";
if (
    enWiki && enWiki.extract
) {
    translatedText =
        await translateText(enWiki.extract);
}

 wikiText.innerHTML = `
<div class="wiki-section">
    <h3>中文维基介绍</h3>
    <p class="wiki-cn">${cnText}</p></div>
<hr>
<div class="wiki-section">
    <h3>英文维基翻译</h3>
    <p class="wiki-cn">
        ${translatedText}
    </p>
</div>
<hr>
<div class="wiki-section">
    <h3>English Description</h3>
    <p class="wiki-en">${enText}</p></div>`;
    } catch (error) {
 console.error(error);
 wikiText.innerHTML = `<div class="wiki-cn">暂无资料</div>`;
    }
}

async function translateText(text) {
    try {
        const response = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
        );
        const data = await response.json();
        return data[0].map(item => item[0]).join("");
    } catch {
        return "翻译失败";
    }
}

/* 搜索框 */
document.getElementById("search").addEventListener("input",
 function () {
     handleSearch(this.value);
 }
    );

/* 初始化 */
window.addEventListener(
    "load",
    () => {
 document.getElementById("search").value = "";
 loadElements();
    }
);
