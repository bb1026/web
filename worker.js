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
    const ext = url.pathname.split('.').pop().toLowerCase();
    const origin = request.headers.get('Origin');
    const method = request.method;
    const isOptions = method === 'OPTIONS';
    const now = Date.now();

    const headers = {
      'Access-Control-Allow-Origin': origin && CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (isOptions) {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    // 检查是否是受保护的资源
    const isProtected = CONFIG.PROTECTED_EXTS.some(e => url.pathname.endsWith(e));

    const authKey = request.headers.get('X-Auth-Key');

    // 合法来源直接放行
    const isAllowedOrigin = origin && CONFIG.ALLOWED_ORIGINS.includes(origin);

    // 合法来源访问：允许但不直接返回 .json/.js 内容（防止直接访问）
    if (isProtected && !isAllowedOrigin && !CONFIG.AUTH_KEYS.includes(authKey)) {
      return new Response(JSON.stringify({
        code: 403,
        error: 'Forbidden: Missing or invalid X-Auth-Key',
        ts: now
      }), {
        status: 403,
        headers
      });
    }

    // 如果带上 X-Auth-Key 且合法，返回 OK 信息
    if (CONFIG.AUTH_KEYS.includes(authKey)) {
      return new Response(JSON.stringify({
        code: 200,
        data: 'Access granted',
        ts: now
      }), {
        status: 200,
        headers
      });
    }

    // 默认继续访问原始文件资源（例如，允许 ALLOWED_ORIGINS 访问）
    return fetch(request);
  }
};
