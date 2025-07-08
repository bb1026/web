// share.js - 处理临时分享逻辑

const SHARE_PREFIX = '__share__'; // 存储在 R2 中的分享前缀
const SHARE_TTL = {
  '60m': 60 * 60,
  '24h': 24 * 60 * 60,
  'forever': 10 * 365 * 24 * 60 * 60 // 10年
};

// 创建分享
async function createShare(BUCKET, item, password, expire, uploader) {
  const id = crypto.randomUUID();
  const data = {
    id,
    item,
    password,
    uploader,
    created: Date.now(),
    expire: SHARE_TTL[expire] || SHARE_TTL['24h']
  };
  const key = `${SHARE_PREFIX}/${id}.json`;
  await BUCKET.put(key, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { uploader }
  });
  return data;
}

// 获取分享详情
async function getShare(BUCKET, id) {
  const key = `${SHARE_PREFIX}/${id}.json`;
  const obj = await BUCKET.get(key);
  if (!obj) return null;
  try {
    const json = await obj.json();
    const now = Date.now();
    if (now > json.created + json.expire * 1000) {
      await BUCKET.delete(key); // 自动清理过期
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

// 获取当前用户所有分享
async function listShares(BUCKET, uploader) {
  const list = await BUCKET.list({ prefix: SHARE_PREFIX + '/', limit: 1000 });
  const result = [];
  for (const obj of list.objects) {
    try {
      const data = await BUCKET.get(obj.key);
      if (!data) continue;
      const json = await data.json();
      if (json.uploader === uploader) {
        const expired = Date.now() > json.created + json.expire * 1000;
        result.push({
          id: json.id,
          item: json.item,
          expired,
          expireAt: json.created + json.expire * 1000
        });
      }
    } catch {}
  }
  return result;
}

// 删除分享
async function cancelShare(BUCKET, id, uploader) {
  const key = `${SHARE_PREFIX}/${id}.json`;
  const obj = await BUCKET.get(key);
  if (!obj) return false;
  const json = await obj.json();
  if (json.uploader !== uploader) return false;
  await BUCKET.delete(key);
  return true;
}

export { createShare, getShare, listShares, cancelShare };