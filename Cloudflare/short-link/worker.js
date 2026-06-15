function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8" }
  });
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}

function randomCode(len = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

const ADMIN_COOKIE_KEY = "admin_auth";
const ADMIN_COOKIE_VAL = "valid_admin_2026";

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;
    const method = req.method;

    // 跨域预检
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": urlObj.origin,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true"
        }
      });
    }

    // 解析Cookie
    function getCookie(name) {
      const cookieStr = req.headers.get("Cookie") || "";
      const cookies = {};
      cookieStr.split(";").forEach(item => {
        const part = item.trim();
        const eq = part.indexOf("=");
        if (eq <= 0) return;
        cookies[part.slice(0, eq)] = part.slice(eq + 1);
      });
      return cookies[name] || "";
    }

    // 登录校验
    function isLogin() {
      return getCookie(ADMIN_COOKIE_KEY).trim() === ADMIN_COOKIE_VAL;
    }

    // 短链跳转
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const dbRes = await env.DB.prepare("SELECT url FROM links WHERE code = ? AND enabled = 1").bind(code).all();
      if (!dbRes.results.length) return new Response("404", { status: 404 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(dbRes.results[0].url, 302);
    }

    // 生成页面
    if (path === "/shortlink") {
      const createPage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>短链接生成</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui;}
body{background:#f5f7fa;padding:20px;}
.box{max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 12px #00000014;}
h2{text-align:center;margin-bottom:20px;}
.item{margin-bottom:16px;}
label{display:block;margin-bottom:6px;color:#444;}
input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:16px;}
button{width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;}
.result{margin-top:20px;padding:16px;background:#ecfdf3;border:1px solid #10b981;border-radius:8px;display:none;}
.copy-btn,.open-btn{width:auto;padding:8px 16px;margin-top:10px;margin-right:8px;}
</style>
</head>
<body>
<div class="box">
  <h2>短链接生成</h2>
  <div class="item">
    <label>原始链接</label>
    <input id="longUrl" placeholder="请输入长链接">
  </div>
  <div class="item">
    <label>自定义短码(选填)</label>
    <input id="customCode" placeholder="留空自动生成">
  </div>
  <button id="submitBtn" onclick="genLink()">立即生成</button>
  <div id="resultBox" class="result">
    <div>生成成功</div>
    <div>短链接：<span id="shortLink"></span></div>
    <button class="copy-btn" onclick="copyLink()">复制</button>
    <button class="open-btn" onclick="openLink()">打开</button>
  </div>
</div>
<script>
const btn = document.getElementById('submitBtn');
async function genLink(){
  const url = document.getElementById('longUrl').value.trim();
  const code = document.getElementById('customCode').value.trim();
  const resBox = document.getElementById('resultBox');
  const linkText = document.getElementById('shortLink');
  if(!url) return alert('请输入链接');
  btn.disabled = true;
  btn.innerText = '生成中...';
  resBox.style.display = 'none';
  try{
    const r = await fetch('/api/create',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url,code})
    });
    const d = await r.json();
    if(d.ok){
      linkText.innerText = d.shortUrl;
      resBox.style.display = 'block';
    }else{
      alert('生成失败');
    }
  }catch(e){
    alert('请求异常');
  }finally{
    btn.disabled = false;
    btn.innerText = '立即生成';
  }
}
async function copyLink(){
  const t = document.getElementById('shortLink').innerText;
  await navigator.clipboard.writeText(t);
  alert('已复制');
}
function openLink(){
  window.open(document.getElementById('shortLink').innerText);
}
</script>
</body>
</html>`;
      return html(createPage);
    }

    // 创建接口
    if (path === "/api/create" && method === "POST") {
      try {
        const body = await req.json();
        const url = body.url || "";
        const code = body.code || randomCode();
        await env.DB.prepare("INSERT OR IGNORE INTO links(code,url,clicks,enabled) VALUES(?,?,0,1)").bind(code, url).run();
        return json({ ok: true, shortUrl: urlObj.origin + "/s/" + code });
      } catch (e) {
        return json({ ok: false }, 500);
      }
    }

    // 登录接口
    if (path === "/api/admin/login" && method === "POST") {
      const body = await req.json();
      if (body.pwd === env.ADMIN_PASSWORD) {
        const resp = json({ ok: true });
        resp.headers.set("Set-Cookie", `${ADMIN_COOKIE_KEY}=${ADMIN_COOKIE_VAL}; Path=/; Max-Age=604800; SameSite=Lax`);
        return resp;
      }
      return json({ ok: false }, 401);
    }

    // 管理后台页面（核心修复：纯前端清Cookie + 极简稳定JS）
    if (path === "/admin") {
      if (!isLogin()) {
        const loginHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>管理员登录</title>

<style>
body{
  background:#f5f6f8;
  color:#111;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:100vh;
  margin:0;
  font-family:system-ui;
}

.login-box{
  background:#fff;
  padding:30px;
  width:90%;
  max-width:360px;
  border-radius:12px;
  box-shadow:0 6px 20px rgba(0,0,0,0.08);
}

h2{
  text-align:center;
  margin-bottom:20px;
}

/* 统一表单节奏 */
input{
  width:100%;
  padding:12px 14px;
  border-radius:8px;
  border:1px solid #ddd;
  margin-bottom:14px;
  font-size:15px;
  outline:none;
  box-sizing:border-box;
}

input:focus{
  border-color:#2563eb;
}

/* 按钮做“视觉更紧凑一点” */
button{
  width:100%;
  padding:11px 14px;
  background:#2563eb;
  color:#fff;
  border:none;
  border-radius:8px;
  font-size:15px;
  cursor:pointer;
  box-sizing:border-box;
}

button:disabled{
  opacity:0.7;
  cursor:not-allowed;
}

.tip{
  color:#e11d48;
  text-align:center;
  margin-bottom:12px;
  display:none;
  font-size:14px;
}
</style>
</head>

<body>

<div class="login-box">
  <h2>后台登录</h2>

  <div class="tip" id="errTip">密码错误</div>

  <input id="pwd" type="password" placeholder="请输入密码" autocomplete="off">

  <button id="loginBtn" onclick="doLogin()">登录</button>
</div>

<script>
const pwdInput = document.getElementById('pwd');
const errTip = document.getElementById('errTip');
const btn = document.getElementById('loginBtn');

// 自动聚焦
pwdInput.focus();

// 输入时隐藏错误提示
pwdInput.addEventListener('input', () => {
  errTip.style.display = 'none';
});

async function doLogin(){
  const pwd = pwdInput.value.trim();
  if(!pwd) return;

  btn.disabled = true;
  const oldText = btn.innerText;
  btn.innerText = '登录中...';

  try {
    const r = await fetch('/api/admin/login',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({pwd})
    });

    const d = await r.json();

    if(d.ok){
      btn.innerText = '登录成功';
      setTimeout(() => location.reload(), 300);
    }else{
      errTip.style.display = 'block';
      pwdInput.focus();
    }

  } catch(e){
    errTip.innerText = '网络错误';
    errTip.style.display = 'block';
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.innerText = oldText;
  }, 800);
}

// 回车登录
pwdInput.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){
    doLogin();
  }
});
</script>

</body>
</html>`;
        return html(loginHtml);
      }

      // 已登录后台主页
      const adminHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>管理后台</title>
<style>
body{padding:20px;margin:0;font-family:system-ui;}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.btn-logout{padding:8px 16px;background:#dc3545;color:#fff;border:none;border-radius:6px;cursor:pointer;}
.search{margin-bottom:16px;}
#keyword{padding:8px;width:240px;}
#searchBtn{padding:8px 12px;cursor:pointer;}
.card{border:1px solid #eee;padding:12px;border-radius:6px;margin-bottom:10px;}
.btn{margin-right:8px;padding:6px 10px;cursor:pointer;border:none;border-radius:4px;}
.btn-del{background:#fd7e14;color:#fff;}
.btn-toggle{background:#198754;color:#fff;}
</style>
</head>
<body>
<div class="top">
  <h3>短链接列表</h3>
  <button class="btn-logout" onclick="doLogout()">退出登录</button>
</div>
<div class="search">
  <input id="keyword" placeholder="搜索短码/链接">
  <button id="searchBtn">搜索</button>
  <select id="pageSize">
    <option value="10">10条/页</option>
    <option value="20">20条/页</option>
  </select>
</div>
<div id="list">正在加载数据...</div>

<script>
// 全局退出函数，解决 doLogout 未定义
function doLogout(){
  document.cookie = "admin_auth=; Path=/; Max-Age=0; SameSite=Lax";
  location.href = "/admin";
}

let page = 1;
let kw = "";

// 加载列表
function loadList(){
  const listDom = document.getElementById("list");
  listDom.innerText = "正在加载数据...";
  const size = document.getElementById("pageSize").value;
  let url = "/api/list?page="+page+"&size="+size;
  if(kw){
    url += "&kw="+encodeURIComponent(kw);
  }

  fetch(url, {
    method: "GET",
    credentials: "include"
  })
  .then(function(res){
    if(res.status === 401){
      listDom.innerText = "登录失效，跳转中...";
      setTimeout(()=> location.href="/admin",1000);
      return null;
    }
    return res.json();
  })
  .then(function(data){
    if(!data) return;
    let arr = Array.isArray(data.data) ? data.data : [];
    if(arr.length === 0){
      listDom.innerText = "暂无数据";
      return;
    }
    let html = "";
    for(let i = 0; i < arr.length; i++){
      let item = arr[i];
      let status = item.enabled ? "启用" : "禁用";
      html += '<div class="card">';
      html += '短码：' + (item.code || "") + '<br>';
      html += '链接：' + (item.url || "") + '<br>';
      html += '访问量：' + (item.clicks || 0) + ' | 状态：' + status + '<br>';
      // 修复引号语法错误
      html += '<button class="btn btn-toggle" data-code="' + item.code + '">切换状态</button>';
      html += '<button class="btn btn-del" data-code="' + item.code + '">删除</button>';
      html += '</div>';
    }
    listDom.innerHTML = html;
  })
  .catch(function(err){
    listDom.innerText = "数据加载异常";
    console.error("加载错误：", err);
  });
}

// 全局方法
function delItem(code){
  if(!confirm("确定删除该短链接？")) return;

  fetch("/api/delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  }).then(() => loadList());
}

function changeStatus(code){
  fetch("/api/toggle", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  }).then(() => loadList());
}

// 搜索
document.getElementById("searchBtn").onclick = function(){
  kw = document.getElementById("keyword").value.trim();
  page = 1;
  loadList();
};

// 切换每页条数
document.getElementById("pageSize").onchange = function(){
  page = 1;
  loadList();
};

document.addEventListener("click", function(e){
  const delBtn = e.target.closest(".btn-del");
  const toggleBtn = e.target.closest(".btn-toggle");

  if(delBtn){
    const code = delBtn.dataset.code;
    delItem(code);
  }

  if(toggleBtn){
    const code = toggleBtn.dataset.code;
    changeStatus(code);
  }
});

// 初始化
window.onload = loadList;
</script>
</body>
</html>`;
      return html(adminHtml);
    }

    // 列表接口
    if (path === "/api/list") {
      if (!isLogin()) return json({ data: [] }, 401);
      try {
        const params = new URLSearchParams(urlObj.search);
        const page = parseInt(params.get("page")) || 1;
        const size = Math.min(parseInt(params.get("size")) || 10, 50);
        const kw = params.get("kw") || "";
        const offset = (page - 1) * size;

        let totalSql, dataSql, bindTotal = [], bindData = [];
        if (kw) {
          const like = `%${kw}%`;
          totalSql = "SELECT COUNT(*) cnt FROM links WHERE code LIKE ? OR url LIKE ?";
          bindTotal.push(like, like);
          dataSql = "SELECT * FROM links WHERE code LIKE ? OR url LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?";
          bindData.push(like, like, size, offset);
        } else {
          totalSql = "SELECT COUNT(*) cnt FROM links";
          dataSql = "SELECT * FROM links ORDER BY id DESC LIMIT ? OFFSET ?";
          bindData.push(size, offset);
        }
        const total = (await env.DB.prepare(totalSql).bind(...bindTotal).first()).cnt || 0;
        const list = await env.DB.prepare(dataSql).bind(...bindData).all();
        return json({ data: list.results, total });
      } catch (e) {
        return json({ data: [] }, 500);
      }
    }

if (path === "/api/toggle" && method === "POST") {
  if (!isLogin()) return json({}, 401);

  const body = await req.json();
  const code = body.code;

  await env.DB.prepare(
    "UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE code = ?"
  ).bind(code).run();

  return json({ ok: true });
}

if (path === "/api/delete" && method === "POST") {
  if (!isLogin()) return json({}, 401);

  const body = await req.json();
  const code = body.code;

  await env.DB.prepare(
    "DELETE FROM links WHERE code = ?"
  ).bind(code).run();

  return json({ ok: true });
}
}

    return new Response("404 Not Found", { status: 404 });
  }
};
