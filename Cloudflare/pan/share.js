// share.js - 使用标准ES模块导出
import { Buffer } from 'node:buffer';

// 安全比较函数（防止时序攻击）
function safeCompare(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && 
         crypto.subtle.timingSafeEqual(aBuf, bBuf);
}

// 创建分享链接
export async function createShare(request, env, userKey, userRole) {
  // 参数验证和权限检查
  if (userRole !== 'admin' && userRole !== 'upload') {
    return new Response(JSON.stringify({ error: '无权限分享' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { file, expireIn = 259200, password = null } = await request.json();
    
    // 基础验证
    if (!file) throw new Error('缺少文件参数');
    if (password && (password.length < 4 || password.length > 20)) {
      throw new Error('密码长度需为4-20位');
    }

    // 检查文件是否存在
    const fileObj = await env.BUCKET.get(file);
    if (!fileObj) throw new Error('文件不存在');

    // 生成分享令牌
    const token = crypto.randomUUID();
    const expireAt = Date.now() + Math.min(parseInt(expireIn), 2592000) * 1000; // 最大30天

    // 存储分享数据
    await env.BUCKET.put(`shares/${token}`, JSON.stringify({
      file,
      owner: userKey,
      createdAt: Date.now(),
      expireAt,
      password: password ? await hashPassword(password) : null, // 密码哈希存储
      fileName: file.split('/').pop(),
      downloadCount: 0
    }), {
      metadata: { owner: userKey }
    });

    return new Response(JSON.stringify({
      token,
      url: `${new URL(request.url).origin}/d/${token}`,
      expireAt: new Date(expireAt).toISOString()
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取分享信息（供下载前验证）
export async function getShare(env, token, inputPassword = '') {
  try {
    const obj = await env.BUCKET.get(`shares/${token}`);
    if (!obj) return { error: '分享不存在', status: 404 };

    const data = JSON.parse(await obj.text());
    
    // 检查过期
    if (Date.now() > data.expireAt) {
      await env.BUCKET.delete(`shares/${token}`);
      return { error: '分享已过期', status: 410 };
    }

    // 检查密码
    if (data.password && !(await verifyPassword(inputPassword, data.password))) {
      return { error: '密码错误', status: 403 };
    }

    // 返回文件信息
    const file = await env.BUCKET.get(data.file);
    if (!file) return { error: '文件不存在', status: 404 };

    // 更新下载计数
    await env.BUCKET.put(`shares/${token}`, JSON.stringify({
      ...data,
      downloadCount: data.downloadCount + 1
    }));

    return {
      fileStream: file.body,
      fileName: data.fileName,
      fileSize: file.size,
      contentType: file.httpMetadata?.contentType || 'application/octet-stream'
    };
  } catch (err) {
    return { error: '获取分享失败', status: 500 };
  }
}

// 密码处理函数
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + process.env.PASSWORD_SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

async function verifyPassword(input, hashed) {
  const inputHashed = await hashPassword(input);
  return safeCompare(inputHashed, hashed);
}

// 辅助方法：列出用户的所有分享
export async function listSharesByUser(env, userKey) {
  const shares = [];
  const list = await env.BUCKET.list({ prefix: 'shares/' });

  await Promise.all(list.objects.map(async item => {
    const data = await env.BUCKET.get(item.key);
    const share = JSON.parse(await data.text());
    if (share.owner === userKey) {
      shares.push({
        token: item.key.replace('shares/', ''),
        url: `${process.env.BASE_URL}/d/${item.key.replace('shares/', '')}`,
        ...share,
        expireAt: new Date(share.expireAt).toISOString()
      });
    }
  }));

  return shares.sort((a, b) => b.createdAt - a.createdAt);
}

// 辅助方法：取消分享
export async function deleteShare(env, userKey, token) {
  const obj = await env.BUCKET.get(`shares/${token}`);
  if (!obj) return { error: '分享不存在', status: 404 };

  const data = JSON.parse(await obj.text());
  if (data.owner !== userKey) return { error: '无权操作', status: 403 };

  await env.BUCKET.delete(`shares/${token}`);
  return { success: true };
}