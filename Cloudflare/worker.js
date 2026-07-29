const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.js', '.json'],
  get ALLOWED_ORIGINS() {
    return [
      'http://localhost:9898',
      'http://127.0.0.1',
      'http://0.0.0.0',
      `https://${this.mainDomain}`,
      `*.${this.mainDomain}`
    ];
  },
  successStatus: 200,
  errorStatus: 403
};

function formatTimestamp(ts) {
  const date = new Date(ts + 8 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
       + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function isSubdomainOfMain(request) {
  const url = new URL(request.url);
  return url.hostname.endsWith(`.${config.mainDomain}`);
}

function isRestrictedFile(url) {
  const pathname = url.pathname.toLowerCase();
  return config.restrictedExtensions.some(ext => pathname.endsWith(ext));
}

function hasValidAuthKey(request, env) {
  const key = request.headers.get('X-Auth-Key');
  if (!key || !env.AUTH_KEYS) {
    return false;
  }
  return env.AUTH_KEYS
    .split(',')
    .map(k => k.trim())
    .includes(key);
}

function isAllowedOrigin(request) {
  const referer = request.headers.get('Referer');
  const origin = request.headers.get('Origin');
  const sources = [];

  if (referer) {
    try {
      sources.push(new URL(referer).origin.toLowerCase());
    } catch {}
  }
  if (origin) {
    sources.push(origin.toLowerCase());
  }

  return sources.some(source => {
    try {
      const parsed = new URL(source);
      const hostname = parsed.hostname;

      return config.ALLOWED_ORIGINS.some(allowed => {
        if (allowed.startsWith('http://') && source.startsWith(allowed)) {
          return true;
        }
        if (allowed.startsWith('*.')) {
          const base = allowed.slice(2);
          return hostname === base || hostname.endsWith(`.${base}`);
        }
        return source === allowed;
      });
    } catch {
      return false;
    }
  });
}

function isBrowserDirectAccess(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const hasReferer = request.headers.get('Referer');
  const isBrowser = /Chrome|Firefox|Safari|Edge|MSIE|Trident/i.test(userAgent);
  return isBrowser && (!hasReferer || new URL(request.url).origin === new URL(hasReferer).origin);
}

function isSameOrigin(request) {
  const referer = request.headers.get('Referer');
  if (!referer) return false;
  try {
    const requestOrigin = new URL(request.url).origin;
    const refererOrigin = new URL(referer).origin;
    return requestOrigin === refererOrigin;
  } catch {
    return false;
  }
}

function createErrorResponse(message, timestamp, status = config.errorStatus) {
  return new Response(JSON.stringify({
    success: false,
    code: status,
    timestamp: formatTimestamp(timestamp),
    error: message
  }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const timestamp = Date.now();
  
  // 新增：处理OPTIONS预检请求，直接返回允许跨域的响应头
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // 预检请求成功无响应体，用204状态码
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*', // 允许请求来源
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // 允许的方法（包含预检请求的OPTIONS和实际的GET）
        'Access-Control-Allow-Headers': 'X-Auth-Key', // 明确允许客户端携带的x-auth-key头
        'Access-Control-Max-Age': '86400' // 预检结果缓存1天，减少重复预检
      }
    });
  }

 if (isRestrictedFile(url)) {

    const dest = request.headers.get("Sec-Fetch-Dest") || "";
    const site = request.headers.get("Sec-Fetch-Site") || "";
    const referer = request.headers.get("Referer") || "";

    // 同源脚本加载
    if (
        dest === "script" &&
        (
            site === "same-origin" ||
            site === "same-site"
        )
    ) {
        return fetch(request);
    }

    // 允许同源Referer
    if (
        referer &&
        new URL(referer).hostname.endsWith(config.mainDomain)
    ) {
        return fetch(request);
    }

    // 允许密钥访问
    if (hasValidAuthKey(request, env)) {
        return fetch(request);
    }

    return createErrorResponse(
        "禁止直接访问",
        timestamp
    );
}

// 非受限资源
return fetch(request);
}
