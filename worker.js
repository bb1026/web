// 配置参数
const config = {
  mainDomain: '0515364.xyz',          // 主域名，匹配所有子域名
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
  const authKey = request.headers.get('X-Auth-Key');
  return authKey && config.authKeys.includes(authKey);
}

// 检查是否为无限制访问域名
function isUnrestrictedOrigin(request) {
  const url = new URL(request.url);
  const origin = url.origin.toLowerCase();
  return config.unrestrictedOrigins.some(domain => 
    origin === domain.toLowerCase()
  );
}

// 生成成功响应
function createSuccessResponse(data, timestamp) {
  return new Response(JSON.stringify({
    success: true,
    timestamp,
    data
  }), {
    status: config.successStatus,
    headers: { 'Content-Type': 'application/json' }
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
    headers: { 'Content-Type': 'application/json' }
  });
}

// 主处理函数
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const timestamp = Date.now();
  
  // 1. 检查是否属于主域名的子域名（如 a.0515364.xyz）
  if (!isSubdomainOfMain(request)) {
    return fetch(request); // 非子域名直接放行
  }
  
  // 2. 无限制访问域名直接返回原始数据
  if (isUnrestrictedOrigin(request)) {
    return fetch(request);
  }
  
  // 3. 检查是否访问受限文件类型（.js/.json）
  if (isRestrictedFile(url)) {
    // 禁止直接从地址栏访问（无X-Auth-Key的GET请求）
    if (request.method === 'GET' && !hasValidAuthKey(request)) {
      return createErrorResponse(
        '禁止直接访问.js/.json文件，请通过X-Auth-Key认证', 
        timestamp
      );
    }
    
    // 验证认证密钥
    if (!hasValidAuthKey(request)) {
      return createErrorResponse(
        'X-Auth-Key无效或未提供', 
        timestamp
      );
    }
    
    // 认证通过，获取并包装数据
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