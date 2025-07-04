const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.js', '.json'],
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'],
  unrestrictedOrigins: ['http://localhost', 'http://127.0.0.1', 'http://0.0.0.0'],
  successStatus: 200,
  errorStatus: 403
};

// 时间戳格式化函数：转为 YYYY-MM-DD HH:mm:ss
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

function isUnrestrictedOrigin(request) {
  const url = new URL(request.url);
  const origin = url.origin.toLowerCase();
  return config.unrestrictedOrigins.some(domain => origin === domain.toLowerCase());
}

function isBrowserDirectAccess(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const hasReferer = request.headers.get('Referer');
  const isBrowser = /Chrome|Firefox|Safari|Edge|MSIE|Trident/i.test(userAgent);
  return isBrowser && (!hasReferer || new URL(request.url).origin === new URL(hasReferer).origin);
}

function createSuccessResponse(data, timestamp) {
  return new Response(JSON.stringify({
    success: true,
    timestamp: formatTimestamp(timestamp),
    data
  }), {
    status: config.successStatus,
    headers: {
      'Content-Type': 'application/json',
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
      'Content-Type': 'application/json',
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

  if (!isSubdomainOfMain(request)) {
    return fetch(request);
  }

  if (isUnrestrictedOrigin(request)) {
    return fetch(request);
  }

  if (isRestrictedFile(url)) {
    if (isBrowserDirectAccess(request)) {
      return createErrorResponse(
        '禁止通过浏览器直接访问.js/.json文件，请通过合法程序携带X-Auth-Key访问',
        timestamp
      );
    }

    if (!hasValidAuthKey(request)) {
      return createErrorResponse('X-Auth-Key无效或未提供', timestamp);
    }

    try {
      const response = await fetch(request);
      const data = await response.text();
      return createSuccessResponse(data, timestamp);
    } catch (error) {
      return createErrorResponse(`资源获取失败: ${error.message}`, timestamp, 500);
    }
  }

  return fetch(request);
}