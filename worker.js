const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.js', '.json'],
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'],
  get ALLOWED_ORIGINS() {
    return [
      'http://localhost',
      'http://127.0.0.1',
      'http://0.0.0.0',
      `https://${this.mainDomain}`,
      `*.${this.mainDomain}`
    ];
  },
  successStatus: 200,
  errorStatus: 403
};

// 格式化时间：YYYY-MM-DD HH:mm:ss
function formatTimestamp(ts) {
  const date = new Date(ts);
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

// ✅ 新版：判断是否为允许来源（支持通配符子域名和 localhost:*）
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

// 判断是否是站内 fetch 请求（有 referer 且同源）
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

function createSuccessResponse(data, timestamp) {
  return new Response(JSON.stringify({
    success: true,
    timestamp: formatTimestamp(timestamp),
    data
  }), {
    status: config.successStatus,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function createErrorResponse(message, timestamp, status = config.errorStatus) {
  return new Response(JSON.stringify({
    success: false,
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

  // 非主域子域名直接放行
  if (!isSubdomainOfMain(request)) {
    return fetch(request);
  }

  // 来源在白名单内则放行（支持通配符 + localhost 任意端口）
  if (isAllowedOrigin(request)) {
    return fetch(request);
  }

  // 受限文件
  if (isRestrictedFile(url)) {
    if (isBrowserDirectAccess(request)) {
      return createErrorResponse(
        '禁止通过浏览器直接访问.js/.json文件，请通过合法程序携带X-Auth-Key访问',
        timestamp
      );
    }

    if (isSameOrigin(request)) {
      return fetch(request); // 站内 fetch 直接放行
    }

    if (!hasValidAuthKey(request)) {
      return createErrorResponse('X-Auth-Key无效或未提供', timestamp);
    }

    try {
      const response = await fetch(request);
      let data = await response.text();

      // 移除 \n（防止干扰 json 展示）+ 保证中文可读
      data = data.replace(/\n/g, '');

      return createSuccessResponse(data, timestamp);
    } catch (error) {
      return createErrorResponse(`资源获取失败: ${error.message}`, timestamp, 500);
    }
  }

  // 其他文件类型放行
  return fetch(request);
}