let allElements = [];

/* 加载元素数据 */
async function loadElements() {

    try {

        const response =
            await fetch(
                "https://api.periodictableofelements.org/elements/"
            );

        allElements =
            await response.json();

        renderAll();

    } catch (err) {

        console.error(err);

        alert("元素数据加载失败");
    }
}

/* 分类转换为CSS类 */
function cssCategory(category) {

    if (!category)
        return "unknown";

    return category
        .replace(/\s+/g, "_")
        .replace(/-/g, "_")
        .toLowerCase();
}

/* 元素卡片 */
function createCard(el) {

    const card =
        document.createElement("div");

    card.className =
        "element " +
        cssCategory(el.category);

    let mass = "-";

    if (el.atomic_mass) {

        mass =
            Number(el.atomic_mass)
            .toFixed(4)
            .substring(0, 6);
    }

    card.innerHTML = `
        <div class="atomic">
            ${el.atomic_number}
        </div>

        <div class="symbol">
            ${el.symbol}
        </div>

        <div class="name">
            ${el.name}
        </div>

        <div class="mass">
            ${mass}
        </div>
    `;

    card.onclick =
        () => showDetail(el);

    return card;
}

/* 渲染全部元素 */
function renderAll() {

    const table =
        document.getElementById("table");

    const lanthanides =
        document.getElementById("lanthanides");

    const actinides =
        document.getElementById("actinides");

    table.innerHTML = "";
    lanthanides.innerHTML = "";
    actinides.innerHTML = "";

    /* 主周期表 */
    const mainElements =
        allElements.filter(e =>

            e.atomic_number < 57 ||

            (
                e.atomic_number > 71 &&
                e.atomic_number < 89
            ) ||

            e.atomic_number > 103
        );

    /* 镧系 */
    const lanthSeries =
        allElements.filter(e =>

            e.atomic_number >= 57 &&
            e.atomic_number <= 71
        );

    /* 锕系 */
    const actSeries =
        allElements.filter(e =>

            e.atomic_number >= 89 &&
            e.atomic_number <= 103
        );

    mainElements.forEach(el => {

        const card =
            createCard(el);

        if (el.group_number) {

            card.style.gridColumn =
                el.group_number;
        }

        if (el.period) {

            card.style.gridRow =
                el.period;
        }

        table.appendChild(card);
    });

    lanthSeries.forEach(el => {

        lanthanides.appendChild(
            createCard(el)
        );
    });

    actSeries.forEach(el => {

        actinides.appendChild(
            createCard(el)
        );
    });
}

/* 搜索 */
function handleSearch(keyword) {

    const text =
        keyword.trim()
            .toLowerCase();

    if (!text) {

        renderAll();
        return;
    }

    const result =
        allElements.filter(el =>

            el.name
                .toLowerCase()
                .includes(text)

            ||

            el.symbol
                .toLowerCase()
                .includes(text)

            ||

            String(
                el.atomic_number
            ).includes(text)
        );

    const table =
        document.getElementById("table");

    const lanthanides =
        document.getElementById("lanthanides");

    const actinides =
        document.getElementById("actinides");

    table.innerHTML = "";
    lanthanides.innerHTML = "";
    actinides.innerHTML = "";

    result.forEach(el => {

        table.appendChild(
            createCard(el)
        );
    });
}

/* 显示详情 */
async function showDetail(el) {

    document.getElementById("title")
        .innerText =
        `${el.name} (${el.symbol})`;

    document.getElementById("atomic")
        .innerText =
        el.atomic_number || "-";

    document.getElementById("mass")
        .innerText =
        el.atomic_mass || "-";

    document.getElementById("category")
        .innerText =
        el.category || "-";

    document.getElementById("period")
        .innerText =
        el.period || "-";

    document.getElementById("group")
        .innerText =
        el.group_number || "-";

    document.getElementById("density")
        .innerText =
        el.density || "-";

    document.getElementById("melting")
        .innerText =
        el.melting_point || "-";

    document.getElementById("boiling")
        .innerText =
        el.boiling_point || "-";

    const wikiText =
        document.getElementById("wikiText");

    const wikiImage =
        document.getElementById("wikiImage");

    wikiText.innerHTML =
        "正在加载资料...";

    wikiImage.src = "";

    wikiImage.style.display =
        "none";

    try {

        const response =
            await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${el.name}`
            );

        const wiki =
            await response.json();

        wikiText.innerHTML =
            wiki.extract ||
            "暂无介绍";

        if (
            wiki.thumbnail &&
            wiki.thumbnail.source
        ) {

            wikiImage.src =
                wiki.thumbnail.source;

            wikiImage.style.display =
                "block";
        }

    } catch {

        wikiText.innerHTML =
            "Wikipedia资料加载失败";
    }
}

/* 搜索框事件 */
document
    .getElementById("search")
    .addEventListener(
        "input",
        function () {

            handleSearch(
                this.value
            );
        }
    );

/* 页面加载 */
window.addEventListener(
    "load",
    () => {

        const search =
            document.getElementById(
                "search"
            );

        search.value = "";

        loadElements();
    }
);