const CONFIG = {
  MAIN_DOMAIN: '0515364.xyz',
  PROTECTED_EXTS: ['.json', '.js'],
  AUTH_KEYS: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'],
  get ALLOWED_ORIGINS() {
    return [
      'http://localhost',
      'http://127.0.0.1',
      'http://0.0.0.0',
      `https://${this.MAIN_DOMAIN}`,
      `http://${this.MAIN_DOMAIN}`,
    ];
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ext = path.split('.').pop().toLowerCase();
    const isProtected = CONFIG.PROTECTED_EXTS.some(e => path.endsWith(e));
    const origin = request.headers.get('Origin');
    const method = request.method;
    const isOptions = method === 'OPTIONS';
    const now = Date.now();
    const authKey = request.headers.get('X-Auth-Key');

    const fetchDest = request.headers.get('Sec-Fetch-Dest'); // 检查是否 script 加载

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin && CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    // 预检请求
    if (isOptions) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 非受保护文件，正常放行
    if (!isProtected) {
      return fetch(request);
    }

    // ✅ 情况 1：通过 <script src=...> 加载的 JS 文件，放行
    if (ext === 'js' && fetchDest === 'script') {
      return fetch(request);
    }

    // ✅ 情况 2：带合法密钥的请求，放行原始内容（不包 JSON）
    if (CONFIG.AUTH_KEYS.includes(authKey)) {
      const originRes = await fetch(request);
      const contentType = originRes.headers.get("Content-Type") || (ext === "js" ? "application/javascript" : "application/json");

      return new Response(await originRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType
        }
      });
    }

    // ❌ 其他所有情况 ➜ 拒绝访问
    return new Response(JSON.stringify({
      code: 403,
      error: 'Access to this resource is restricted',
      ts: now
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
};
