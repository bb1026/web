// share.js - 纯分享功能实现
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// 创建分享
export async function createShare(request, env, userKey, userRole) {
  if (userRole !== 'admin' && userRole !== 'upload') {
    return new Response(JSON.stringify({ error: '无权限分享' }), {
      status: 403,
      headers: corsHeaders
    });
  }

  try {
    const { file, expireIn = 259200, password = null } = await request.json();
    
    // 参数验证
    if (!file) throw new Error('缺少文件参数');
    if (password && password.length < 4) throw new Error('密码至少4位');

    // 检查文件是否存在
    const fileObj = await env.BUCKET.get(file);
    if (!fileObj) throw new Error('文件不存在');

    // 生成分享令牌
    const token = crypto.randomUUID();
    const expireAt = Date.now() + (Math.min(parseInt(expireIn), 2592000) * 1000); // 最大30天

    await env.BUCKET.put(`shares/${token}`, JSON.stringify({
      file,
      owner: userKey,
      createdAt: Date.now(),
      expireAt,
      password,
      fileName: file.split('/').pop()
    }));

    return new Response(JSON.stringify({
      token,
      url: `${new URL(request.url).origin}/d/${token}`,
      expireAt
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: corsHeaders
    });
  }
}

// 取消分享
export async function deleteShare(request, env, userKey) {
  try {
    const { token } = await request.json();
    if (!token) throw new Error('缺少token参数');

    // 验证分享所有权
    const share = await env.BUCKET.get(`shares/${token}`);
    if (!share) throw new Error('分享不存在');
    
    const shareData = JSON.parse(await share.text());
    if (shareData.owner !== userKey) throw new Error('无权操作');

    await env.BUCKET.delete(`shares/${token}`);
    return new Response(JSON.stringify({ success: true }), { 
      headers: corsHeaders 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: corsHeaders
    });
  }
}

// 获取分享信息
export async function getShareInfo(env, token) {
  const obj = await env.BUCKET.get(`shares/${token}`);
  if (!obj) return null;

  const data = JSON.parse(await obj.text());
  if (Date.now() > data.expireAt) {
    await env.BUCKET.delete(`shares/${token}`);
    return null;
  }
  return data;
}

// 验证分享密码
export async function verifyShare(env, token, password) {
  const share = await getShareInfo(env, token);
  if (!share) return false;
  if (!share.password) return true;
  return share.password === password;
}

// 列出用户的所有分享
export async function listUserShares(env, userKey) {
  const shares = [];
  const list = await env.BUCKET.list({ prefix: 'shares/' });

  for (const item of list.objects) {
    const data = await env.BUCKET.get(item.key);
    const share = JSON.parse(await data.text());
    if (share.owner === userKey) {
      shares.push({
        token: item.key.replace('shares/', ''),
        ...share
      });
    }
  }

  return shares.sort((a, b) => b.createdAt - a.createdAt);
}