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

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin && CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // 预检请求
    if (isOptions) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 非受保护资源，正常返回
    if (!isProtected) {
      return fetch(request);
    }

    // 验证条件
    const isAllowedOrigin = origin && CONFIG.ALLOWED_ORIGINS.includes(origin);
    const isValidKey = CONFIG.AUTH_KEYS.includes(authKey);

    if (!isAllowedOrigin && !isValidKey) {
      return new Response(JSON.stringify({
        code: 403,
        error: 'Forbidden: Unauthorized access to protected resource',
        ts: now
      }), { status: 403, headers: corsHeaders });
    }

    // 读取原始文件内容
    try {
      const originRes = await fetch(request);
      const rawText = await originRes.text();

      // 返回封装后的 JSON 响应
      return new Response(JSON.stringify({
        code: 200,
        data: rawText,
        ts: now
      }), {
        status: 200,
        headers: corsHeaders
      });
    } catch (e) {
      return new Response(JSON.stringify({
        code: 500,
        error: 'Internal fetch error: ' + e.message,
        ts: now
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
