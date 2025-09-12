const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.js', '.json'],
  authKeys: [
    'tX3$9mGz@7vLq#F!b2R',
    'dev-key-1',
    'scriptable-key'
  ],
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

function hasValidAuthKey(request) {
  const key = request.headers.get('X-Auth-Key');
  return key && config.authKeys.includes(key);
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

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const timestamp = Date.now();

  if (isRestrictedFile(url)) {
    // 1. 检查同源访问
    const referer = request.headers.get('Referer');
    const requestOrigin = new URL(request.url).origin;
    const refererOrigin = referer ? new URL(referer).origin : null;

    if (refererOrigin === requestOrigin) {
      // 同源访问，放行
      return fetch(request);
    }
    
    // 来源在白名单内则放行
    if (isAllowedOrigin(request)) {
      return fetch(request);
    }

    // 2. 检查密钥
    if (hasValidAuthKey(request)) {
      return fetch(request);
    }

    // 3. 其他情况一律禁止
    return createErrorResponse(
      '禁止直接访问的文件，请通过本站或合法程序访问',
      timestamp
    );
  }

  // 非受限文件直接放行
  return fetch(request);
}
