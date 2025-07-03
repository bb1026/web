const CONFIG = {
  MAIN_DOMAIN: '0515364.xyz',
  PROTECTED_EXTS: ['.json', '.js'],
  AUTH_KEYS: [
    'tX3$9mGz@7vLq#F!b2R',
    'dev-key-1',
    'scriptable-key'
  ],
  get ALLOWED_ORIGINS() {
    return [
      'http://localhost',
      'http://127.0.0.1',
      'http://0.0.0.0',
      `https://${this.MAIN_DOMAIN}`,
      `http://${this.MAIN_DOMAIN}`,
      `*.${this.MAIN_DOMAIN}`
    ];
  }
}; 

function isOriginAllowed(origin) {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return CONFIG.ALLOWED_ORIGINS.some(allowed => {
      if (allowed.startsWith('*.')) {
        const base = allowed.replace('*.', '');
        return host === base || host.endsWith(`.${base}`);
      }
      return origin === allowed || origin.startsWith(`${allowed}:`);
    });
  } catch {
    return false;
  }
} 

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const pathname = url.pathname.toLowerCase();
    const fileExt = pathname.match(/\.\w+($|\?|#)/)?.[0]?.replace(/\?|#/, '') || '';
    const isAllowedOrigin = isOriginAllowed(origin);
    const needsAuth = CONFIG.PROTECTED_EXTS.includes(fileExt);

    // === 1. 调试日志 ===
    console.log({ pathname, fileExt, needsAuth, origin, isAllowedOrigin });

    // === 2. CORS 预检请求 ===
    if (method === 'OPTIONS') {
      if (!isAllowedOrigin) {
        return new Response('403 Forbidden: Origin not allowed', { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Auth-Key',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    // === 3. 密钥校验 ===
    if (needsAuth) {
      const authKey = request.headers.get('X-Auth-Key');
      if (!CONFIG.AUTH_KEYS.includes(authKey)) {
        return new Response('403 Forbidden: Invalid or missing X-Auth-Key', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
        });
      }
    }

    // === 4. 转发请求 ===
    try {
      const originResponse = await fetch(request);
      const headers = new Headers(originResponse.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      if (isAllowedOrigin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
      }
      headers.set('Cache-Control', needsAuth ? 'no-store' : 'public, max-age=3600');
      return new Response(originResponse.body, { status: originResponse.status, headers });
    } catch (err) {
      return new Response('500 Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
      });
    }
  } 
}; 