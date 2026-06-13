function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function randomCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;

    // ======================
    // 短链接跳转 /s/xxx
    // ======================
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];

      const { results } = await env.DB.prepare(
        "SELECT * FROM links WHERE code = ?"
      ).bind(code).all();

      const link = results[0];

      if (!link) return new Response("Not Found", { status: 404 });

      if (Number(link.enabled) !== 1) {
        return new Response("Disabled", { status: 403 });
      }

      await env.DB.prepare(
        "UPDATE links SET clicks = clicks + 1 WHERE code = ?"
      ).bind(code).run();

      return Response.redirect(link.url, 302);
    }

    // ======================
    // API：创建短链
    // ======================
    if (path === "/api/create" && req.method === "POST") {
      const { url: longUrl, code } = await req.json();

      const shortCode = code || randomCode();

      await env.DB.prepare(
        "INSERT OR IGNORE INTO links (code, url) VALUES (?, ?)"
      ).bind(shortCode, longUrl).run();

      return json({
        ok: true,
        code: shortCode,
        shortUrl: `${urlObj.origin}/s/${shortCode}`
      });
    }

    // ======================
    // API：列表
    // ======================
    if (path === "/api/list") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM links ORDER BY i...