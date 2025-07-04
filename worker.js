// 配置参数
const config = {
  mainDomain: '0515364.xyz',
  restrictedExtensions: ['.json', '.js'],
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'],
  unrestrictedDomains: ['http://localhost', 'http://127.0.0.1', 'http://0.0.0.0'],
  successStatusCode: 200,
  errorStatusCode: 403
};

// 检查请求是否来自无限制访问域名
function isUnrestrictedDomain(request) {
  const url = new URL(request.url);
  const origin = url.origin.toLowerCase();
  
  return config.unrestrictedDomains.some(domain => 
    origin === domain.toLowerCase()
  );
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
  const authKey = request.headers.get('X-Auth-Key');
  if (!authKey) return false;
  
  return config.authKeys.some(key => key === authKey);
}

// 生成成功响应
function createSuccessResponse(data, timestamp) {
  const responseBody = {
    success: true,
    timestamp: timestamp,
    data: data
  };
  
  return new Response(JSON.stringify(responseBody), {
    status: config.successStatusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 生成错误响应
function createErrorResponse(message, timestamp, statusCode) {
  const responseBody = {
    success: false,
    timestamp: timestamp,
    error: message
  };
  
  return new Response(JSON.stringify(responseBody), {
    status: statusCode || config.errorStatusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 主处理函数
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const timestamp = Date.now();
  
  // 检查是否为主域名
  if (!host.endsWith(config.mainDomain)) {
    // 非主域名直接放行
    return fetch(request);
  }
  
  // 检查是否为无限制访问域名
  if (isUnrestrictedDomain(request)) {
    // 无限制域名直接返回原始数据
    return fetch(request);
  }
  
  // 检查是否访问受限文件类型
  if (isRestrictedFile(url)) {
    // 检查是否通过地址栏直接访问（GET请求且无认证头）
    if (request.method === 'GET' && !hasValidAuthKey(request)) {
      return createErrorResponse(
        '禁止直接从地址栏访问受限文件类型', 
        timestamp
      );
    }
    
    // 检查认证密钥
    if (!hasValidAuthKey(request)) {
      return createErrorResponse(
        '认证密钥无效或未提供', 
        timestamp
      );
    }
    
    // 有效认证，处理请求
    try {
      const response = await fetch(request);
      const data = await response.text();
      return createSuccessResponse(data, timestamp);
    } catch (error) {
      return createErrorResponse(
        `获取数据失败: ${error.message}`, 
        timestamp,
        500
      );
    }
  } else {
    // 非受限文件类型直接放行
    return fetch(request);
  }
}