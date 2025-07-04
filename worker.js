// 配置参数
const config = {
  mainDomain: '0515364.xyz',          // 主域名（所有子域名都会被限制）
  restrictedExtensions: ['.js', '.json'], // 受限文件类型
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'], // 有效认证密钥
  unrestrictedOrigins: ['http://localhost', 'http://127.0.0.1', 'http://0.0.0.0'], // 无限制访问域名
  successStatus: 200,
  errorStatus: 403
};

// 检查请求是否属于主域名的子域名
function isSubdomainOfMain(request) {
  const url = new URL(request.url);
  return url.hostname.endsWith(`.${config.mainDomain}`);
}

// 检查请求是否访问受限文件类型
function isRestrictedFile(url) {
  const pathname = url.pathname.toLowerCase();
  return config.restrictedExtensions.some(ext => 
    pathname.endsWith(ext)
  );
}

// 检查请求是否包含有效认证密钥
function hasValidAuthKey(request) {
  return request.headers.get('X-Auth-Key') && 
         config.authKeys.includes(request.headers.get('X-Auth-Key'));
}

// 检查是否为无限制访问域名
function isUnrestrictedOrigin(request) {
  const url = new URL(request.url);
  const origin = url.origin.toLowerCase();
  return config.unrestrictedOrigins.some(domain => 
    origin === domain.toLowerCase()
  );
}

// 检查是否为浏览器直接访问（简单检测：无Referer或常见浏览器User-Agent）
function isBrowserDirectAccess(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const isBrowser = /Chrome|Firefox|Safari|Edge|MSIE|Trident/i.test(userAgent);
  const hasReferer = request.headers.get('Referer');
  
  // 浏览器直接访问特征：是浏览器UA且Referer为空或与当前域名相同
  return isBrowser && (!hasReferer || 
    new URL(request.url).origin === new URL(hasReferer).origin);
}

// 生成成功响应
function createSuccessResponse(data, timestamp) {
  return new Response(JSON.stringify({
    success: true,
    timestamp,
    data
  }), {
    status: config.successStatus,
    headers: { 
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// 生成错误响应
function createErrorResponse(message, timestamp, status = config.errorStatus) {
  return new Response(JSON.stringify({
    success: false,
    timestamp,
    error: message
  }), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// 主处理函数
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const timestamp = Date.now();
  
  // 1. 非主域名子域名直接放行
  if (!isSubdomainOfMain(request)) {
    return fetch(request);
  }
  
  // 2. 无限制访问域名直接返回原始数据
  if (isUnrestrictedOrigin(request)) {
    return fetch(request);
  }
  
  // 3. 检查是否访问受限文件类型（.js/.json）
  if (isRestrictedFile(url)) {
    // 4. 禁止浏览器直接访问（无论是否为GET请求）
    if (isBrowserDirectAccess(request)) {
      return createErrorResponse(
        '禁止通过浏览器直接访问.js/.json文件，请通过合法程序携带X-Auth-Key访问', 
        timestamp
      );
    }
    
    // 5. 验证认证密钥（所有请求必须携带）
    if (!hasValidAuthKey(request)) {
      return createErrorResponse(
        'X-Auth-Key无效或未提供', 
        timestamp
      );
    }
    
    // 6. 认证通过，获取并包装数据
    try {
      const response = await fetch(request);
      const data = await response.text();
      return createSuccessResponse(data, timestamp);
    } catch (error) {
      return createErrorResponse(
        `资源获取失败: ${error.message}`, 
        timestamp,
        500
      );
    }
  } else {
    // 非受限文件类型直接放行
    return fetch(request);
  }
}