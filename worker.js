// 配置参数
const config = {
  restrictedExtensions: ['.js', '.json'], // 受限文件类型
  authKeys: ['tX3$9mGz@7vLq#F!b2R', 'dev-key-1', 'scriptable-key'], // 有效认证密钥
  unrestrictedDomains: ['localhost', '127.0.0.1', '0.0.0.0'], // 无限制访问域名（不含协议）
  successStatus: 200,
  errorStatus: 403
};

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
function isUnrestrictedDomain(host) {
  return config.unrestrictedDomains.some(domain => 
    host === domain || host.endsWith(`.${domain}`)
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
  const host = url.hostname;
  const timestamp = Date.now();
  
  // 1. 检查是否访问受限文件类型（.js/.json）
  if (isRestrictedFile(url)) {
    // 2. 检查是否为无限制访问域名
    if (isUnrestrictedDomain(host)) {
      return fetch(request); // 无限制域名直接放行
    }
    
    // 3. 禁止直接从地址栏访问（无X-Auth-Key的GET请求）
    if (request.method === 'GET' && !hasValidAuthKey(request)) {
      return createErrorResponse(
        '禁止直接访问.js/.json文件，请通过X-Auth-Key认证', 
        timestamp
      );
    }
    
    // 4. 验证认证密钥
    if (!hasValidAuthKey(request)) {
      return createErrorResponse(
        'X-Auth-Key无效或未提供', 
        timestamp
      );
    }
    
    // 5. 认证通过，获取并包装数据
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