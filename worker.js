const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.js', '.json'],
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'],
  unrestrictedOrigins: ['http://localhost', 'http://127.0.0.1', 'http://0.0.0.0'],
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

// ✅ 修改后的：判断请求来源（Referer / Origin）是否在白名单
function isUnrestrictedOrigin(request) {
  const referer = request.headers.get('Referer');
  const origin = request.headers.get('Origin');
  const checkList = [];

  if (referer) {
    try {
      checkList.push(new URL(referer).origin.toLowerCase());
    } catch {}
  }
  if (origin) {
    checkList.push(origin.toLowerCase());
  }

  return checkList.some(source =>
    config.unrestrictedOrigins.includes(source)
  );
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
    version: "v3.2.0",
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

    if (isSameOrigin(request)) {
      return fetch(request); // 同源请求，直接放行
    }

    if (!hasValidAuthKey(request)) {
      return createErrorResponse('X-Auth-Key无效或未提供', timestamp);
    }

    try {
      const response = await fetch(request);
      let data = await response.text();

      // 处理中文支持 & 去掉 \n
      data = data.replace(/\n/g, '');

      return createSuccessResponse(data, timestamp);
    } catch (error) {
      return createErrorResponse(`资源获取失败: ${error.message}`, timestamp, 500);
    }
  }

  return fetch(request);
}