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
      `*.${this.MAIN_DOMAIN}`
    ];
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const method = request.method;

    // 检查来源是否合法
    const isAllowedOrigin = CONFIG.ALLOWED_ORIGINS.some(o => {
      if (o.startsWith('*.')) {
        return origin.endsWith(o.replace('*.', 'https://'));
      }
      return origin === o || origin.startsWith(`${o}:`);
    });

    // 处理预检请求
    if (method === 'OPTIONS') {
      if (!isAllowedOrigin) {
        return jsonError('Origin not allowed', 403);
      }
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Auth-Key',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    // 是否是受保护文件
    const fileExt = url.pathname.toLowerCase().match(/\.\w+$/)?.[0] || '';
    const isProtected = CONFIG.PROTECTED_EXTS.includes(fileExt);

    const authKey = request.headers.get('X-Auth-Key') || '';
    const hasValidKey = CONFIG.AUTH_KEYS.includes(authKey);

    if (isProtected && !hasValidKey) {
      return jsonError('Invalid or missing X-Auth-Key', 403);
    }

    // 请求转发
    const upstreamResponse = await fetch(request);
    const contentType = upstreamResponse.headers.get('Content-Type') || '';
    const headers = new Headers(upstreamResponse.headers);

    if (isAllowedOrigin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }

    // 如果使用了密钥访问，返回包裹后的 JSON 数据
    if (hasValidKey) {
      const content = await upstreamResponse.text();

      return new Response(JSON.stringify({
        success: true,
        timestamp: Date.now(),
        contentType,
        data: content
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Vary': 'Origin'
        }
      });
    }

    // 非密钥访问，直接返回原始内容
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers
    });
  }
};

// 错误响应统一封装
function jsonError(message, code) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    code,
    timestamp: Date.now()
  }), {
    status: code,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}