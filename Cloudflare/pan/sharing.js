import { createShare, getShare, listShares, cancelShare } from './share.js';
import { jsonResponse } from './utils.js';

export async function handleShare(path, request, env, key, role, accessMap) {
  if (path === 'share/create') return createShare(request, env, key, role);
  if (path === 'share/get') return getShare(request, env);
  if (path === 'share/list') return listShares(request, env, role);
  if (path === 'share/cancel') return cancelShare(request, env, role);
  return new Response('未知分享操作', { status: 404 });
}