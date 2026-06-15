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

    // OPTIONS 跨域预检
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": urlObj.origin,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // 修复 Cookie 解析
    function getCookie(name) {
      const cookieStr = req.headers.get("Cookie") || "";
      const cookies = {};
      cookieStr.split(";").forEach(item => {
        const part = item.trim();
        const eqIndex = part.indexOf("=");
        if (eqIndex <= 0) return;
        const key = part.slice(0, eqIndex);
        const val = part.slice(eqIndex + 1);
        cookies[key] = val;
      });
      return cookies[name] ?? "";
    }

    // 严格登录校验
    function isLogin() {
      const val = getCookie(ADMIN_COOKIE_KEY).trim();
      return val === ADMIN_COOKIE_VAL;
    }

    // 短链跳转
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const dbRes = await env.DB.prepare("SELECT url FROM links WHERE code = ? AND enabled = 1").bind(code).all();
      if (dbRes.results.length === 0) return new Response("404 短链接不存在或已禁用", { status: 404 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(dbRes.results[0].url, 302);
    }

    // 短链接生成页面
    if (path === "/shortlink") {
      const createPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>短链接生成器</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif;}
body{background:#f5f7fa;padding:20px 16px;min-height:100vh;}
.box{background:#fff;padding:24px 20px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;margin:0 auto;}
h2{margin-bottom:22px;color:#222;font-size:22px;text-align:center;}
.input-item{margin-bottom:16px;}
label{display:block;margin-bottom:6px;color:#444;font-size:15px;}
input{width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:8px;font-size:16px;outline:none;transition:border 0.2s;}
input:focus{border-color:#2563eb;}
#submitBtn{width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;transition:background 0.2s;}
#submitBtn:hover{background:#1d4ed8;}
#submitBtn:disabled{background:#94b3f0;cursor:not-allowed;}
.result{margin-top:20px;padding:16px;border-radius:8px;display:none;word-break:break-all;}
.success{background:#ecfdf3;border:1px solid #10b981;color:#047857;}
.copy-btn{margin-top:12px;padding:9px 18px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;}
.copy-btn:active{opacity:0.85;}
.open-btn{margin-left:10px;padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;}
.open-btn:active{opacity:0.85;}
</style>
</head>
<body>
<div class="box">
  <h2>快速生成短链接</h2>
  <div class="input-item">
    <label>原始长链接</label>
    <input id="longUrl" placeholder="https://example.com">
  </div>
  <div class="input-item">
    <label>自定义短码（留空自动随机生成）</label>
    <input id="customCode" placeholder="可选填写">
  </div>
  <button id="submitBtn" onclick="genLink()">立即生成</button>

  <div id="resultBox" class="result success">
    <div>✅ 生成成功！</div>
    <div style="margin:8px 0;">短链接：<span id="shortLink"></span></div>
    <button class="copy-btn" onclick="copyLink()">复制链接</button>
    <button class="open-btn" onclick="openLink()">打开链接</button>
  </div>
</div>

<script>
const btn = document.getElementById('submitBtn');
async function genLink(){
  const longUrl = document.getElementById('longUrl').value.trim();
  const customCode = document.getElementById('customCode').value.trim();
  const resBox = document.getElementById('resultBox');
  const linkText = document.getElementById('shortLink');
  if (!longUrl) {
    alert('请填写原始长链接');
    return;
  }
  btn.disabled = true;
  btn.textContent = '生成中...';
  resBox.style.display = 'none';
  try {
    const resp = await fetch('/api/create', {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({url:longUrl,code:customCode})
    });
    if (!resp.ok) throw new Error('服务端异常');
    const data = await resp.json();
    if (!data.ok) {
      alert('生成失败');
      return;
    }
    linkText.textContent = data.shortUrl;
    resBox.style.display = 'block';
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '立即生成';
  }
}
async function copyLink(){
  const text = document.getElementById('shortLink').innerText.trim();
  try {
    await navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板！');
  } catch(e) {
    alert('复制失败，请手动复制');
  }
}
function openLink(){
  const target = document.getElementById('shortLink').innerText.trim();
  window.open(target, '_blank');
}
</script>
</body>
</html>`;
      return html(createPage);
    }

    // 创建短链接口
    if (path === "/api/create" && method === "POST") {
      try {
        const body = await req.json();
        const longUrl = body.url || "";
        const code = body.code || randomCode();
        await env.DB.prepare("INSERT OR IGNORE INTO links (code, url, clicks, enabled) VALUES (?, ?, 0, 1)").bind(code, longUrl).run();
        return json({ ok: true, code: code, shortUrl: urlObj.origin + "/s/" + code });
      } catch (e) {
        return json({ ok: false, err: e.message }, 500);
      }
    }

    // 登录接口
    if (path === "/api/admin/login" && method === "POST") {
      const body = await req.json();
      if (body.pwd === env.ADMIN_PASSWORD) {
        const resp = json({ ok: true });
        resp.headers.set(
          "Set-Cookie",
          `${ADMIN_COOKIE_KEY}=${ADMIN_COOKIE_VAL}; Path=/; Max-Age=604800; SameSite=Lax`
        );
        return resp;
      } else {
        return json({ ok: false, msg: "密码错误" }, 401);
      }
    }

    // 退出登录接口
    if (path === "/api/admin/logout" && method === "POST") {
      const resp = json({ ok: true });
      resp.headers.set(
        "Set-Cookie",
        `${ADMIN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax; Secure`
      );
      return resp;
    }

    // 管理后台页面
    if (path === "/admin") {
      if (!isLogin()) {
        // 登录页
        const loginHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理员登录</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui}
body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;}
.login-box{background:#1e1e1e;padding:30px 24px;border-radius:10px;width:100%;max-width:380px;}
h2{text-align:center;margin-bottom:24px;font-size:20px;}
input{width:100%;padding:13px 14px;border-radius:8px;border:none;font-size:16px;margin-bottom:16px;outline:none;}
#loginBtn{width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;}
#loginBtn:active{opacity:0.9}
.err-tip{color:#ff6b6b;margin-bottom:12px;text-align:center;display:none;}
</style>
</head>
<body>
<div class="login-box">
  <h2>后台管理员登录</h2>
  <div id="errTip" class="err-tip">密码不正确</div>
  <input id="pwdInput" type="password" placeholder="请输入管理密码">
  <button id="loginBtn">登录</button>
</div>
<script>
const errTip = document.getElementById('errTip');
document.getElementById('loginBtn').onclick = async ()=>{
  const pwd = document.getElementById('pwdInput').value.trim();
  if(!pwd) return;
  const res = await fetch('/api/admin/login',{
    method:'POST',
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pwd:pwd})
  });
  const data = await res.json();
  if(data.ok){
    location.reload();
  }else{
    errTip.style.display='block';
  }
}
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>短链接管理后台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;}
body{background:#ffffff;color:#222;padding:20px;line-height:1.6;}
.top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
h2{color:#111;}
.search-bar{margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
#keyword{padding:9px 12px;border:1px solid #ddd;border-radius:6px;flex:1;min-width:220px;font-size:15px;}
#searchBtn{padding:9px 16px;background:#0d6efd;color:#fff;border:none;border-radius:6px;cursor:pointer;}
.page-size-wrap{margin-bottom:16px;display:flex;align-items:center;gap:8px;}
#pageSize{padding:8px;border:1px solid #ddd;border-radius:6px;}
.card{background:#f8f9fa;border:1px solid #e9ecef;padding:14px;border-radius:8px;margin-bottom:12px;}
.card b{color:#0d6efd;font-size:16px;}
.card button{margin:4px 6px 0 0;padding:7px 12px;border:none;border-radius:6px;cursor:pointer;font-size:14px;}
.btn-toggle{background:#198754;color:#fff;}
.btn-del{background:#fd7e14;color:#fff;}
.pagination{margin-top:20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.pagination button{padding:8px 14px;border:1px solid #dee2e6;background:#fff;border-radius:6px;cursor:pointer;}
.pagination button:disabled{opacity:0.5;cursor:not-allowed;}
.load-tip{color:#666;padding:12px;}
</style>
</head>
<body>
<div class="top-bar">
  <h2>短链接管理后台</h2>
  <button onclick="doLogout()" style="padding:10px 22px;background:#dc3545;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;">🚪 退出登录</button>
</div>

<div class="search-bar">
  <input id="keyword" placeholder="输入短码 / 长链接关键词搜索">
  <button id="searchBtn">搜索</button>
</div>

<div class="page-size-wrap">
  <span>每页显示：</span>
  <select id="pageSize">
    <option value="10">10条</option>
    <option value="20">20条</option>
    <option value="50">50条</option>
  </select>
</div>

<div id="list" class="load-tip">正在加载数据...</div>
<div class="pagination" id="pageBox"></div>

<script>
function doLogout() {
  const key = "admin_auth";
  document.cookie = key + "=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = key + "=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie = key + "=; Max-Age=0";
  window.location.href = "/admin?t=" + Date.now();
}

let currentPage = 1;
let keyword = "";

async function loadData(){
  const listDom = document.getElementById('list');
  const pageBoxDom = document.getElementById('pageBox');
  listDom.innerHTML = "正在加载数据...";

  try {
    const ps = document.getElementById('pageSize').value || 10;
    let url = "/api/list?page=" + currentPage + "&size=" + ps;
    if(keyword.trim()){
      url += "&kw=" + encodeURIComponent(keyword);
    }

    const res = await fetch(url, { credentials: 'include' });
    if(res.status === 401){
      listDom.innerHTML = "登录已失效，跳转中...";
      setTimeout(()=> location.href="/admin?t="+Date.now(), 1200);
      return;
    }

    const jsonData = await res.json();
    const { data = [], total = 0, totalPage = 0 } = jsonData;

    let htmlStr = "";
    if(data.length > 0){
      data.forEach(item => {
        htmlStr += '<div class="card">' +
          '<b>' + item.code + '</b><br>' +
          '原链接：' + item.url + '<br>' +
          '点击量：' + item.clicks + ' | 状态：' + (item.enabled ? '启用' : '禁用') + '<br>' +
          '<button class="btn-toggle" onclick="toggle(\'' + item.code + '\')">启用/禁用</button>' +
          '<button class="btn-del" onclick="del(\'' + item.code + '\')">删除</button>' +
        '</div>';
      });
    } else {
      htmlStr = '<div class="load-tip">暂无匹配数据</div>';
    }
    listDom.innerHTML = htmlStr;

    let pageHtml = "";
    pageHtml += '<button ' + (currentPage<=1 ? 'disabled' : '') + ' onclick="goPage(' + (currentPage-1) + ')">上一页</button>';
    pageHtml += '<span>第 ' + currentPage + '/' + totalPage + ' 页（共' + total + '条）</span>';
    pageHtml += '<button ' + (currentPage>=totalPage ? 'disabled' : '') + ' onclick="goPage(' + (currentPage+1) + ')">下一页</button>';
    pageBoxDom.innerHTML = pageHtml;

  } catch (err) {
    listDom.innerHTML = "数据加载失败";
    console.error("加载异常：", err);
  }
}

function goPage(p){
  currentPage = p;
  loadData();
}

document.getElementById('searchBtn').addEventListener('click', function(){
  keyword = document.getElementById('keyword').value.trim();
  currentPage = 1;
  loadData();
});

document.getElementById('pageSize').addEventListener('change', function(){
  currentPage = 1;
  loadData();
});

async function del(code){
  if(!confirm('确定删除该短链接？')) return;
  try {
    await fetch('/api/delete/' + code, {
      method: "POST",
      credentials: "include"
    });
    loadData();
  } catch(e) {
    alert("删除失败");
  }
}

async function toggle(code){
  try {
    await fetch('/api/toggle/' + code, {
      method: "POST",
      credentials: "include"
    });
    loadData();
  } catch(e) {
    alert("操作失败");
  }
}

window.addEventListener('DOMContentLoaded', loadData);
</script>
</body>
</html>`;
      return html(adminHtml);
    }

    // 分页列表接口
    if (path === "/api/list") {
      if (!isLogin()) return json({ ok: false }, 401);
      try {
        const params = new URLSearchParams(urlObj.search);
        const page = parseInt(params.get('page')) || 1;
        let size = parseInt(params.get('size')) || 10;
        const kw = params.get('kw') || '';
        size = Math.min(size, 50);
        const offset = (page - 1) * size;

        let totalSql, dataSql;
        let bindTotal = [];
        let bindData = [];

        if (kw.trim() !== '') {
          const likeVal = `%${kw}%`;
          totalSql = "SELECT COUNT(*) AS cnt FROM links WHERE code LIKE ? OR url LIKE ?";
          bindTotal.push(likeVal, likeVal);
          dataSql = "SELECT * FROM links WHERE code LIKE ? OR url LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?";
          bindData.push(likeVal, likeVal, size, offset);
        } else {
          totalSql = "SELECT COUNT(*) AS cnt FROM links";
          dataSql = "SELECT * FROM links ORDER BY id DESC LIMIT ? OFFSET ?";
          bindData.push(size, offset);
        }

        const totalRes = await env.DB.prepare(totalSql).bind(...bindTotal).first();
        const total = totalRes?.cnt || 0;
        const totalPage = Math.ceil(total / size);
        const dbRes = await env.DB.prepare(dataSql).bind(...bindData).all();
        return json({ data: dbRes.results, total, totalPage });
      } catch (errInner) {
        return json({ ok: false, msg: errInner.message }, 500);
      }
    }

    // 删除接口
    if (path.startsWith("/api/delete/") && method === "POST") {
      if (!isLogin()) return json({ ok: false }, 401);
      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?").bind(code).run();
      return json({ ok: true });
    }

    // 启用/禁用接口
    if (path.startsWith("/api/toggle/") && method === "POST") {
      if (!isLogin()) return json({ ok: false }, 401);
      const code = path.split("/api/toggle/")[1];
      await env.DB.prepare("UPDATE links SET enabled = NOT enabled WHERE code = ?").bind(code).run();
      return json({ ok: true });
    }

    return new Response("页面不存在", { status: 404 });
  }
};