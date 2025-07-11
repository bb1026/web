import { detectRoleFromPassword, jsonResponse } from './utils.js';

export async function handleAuth(request, accessMap) {
  const pwd = (await request.text()).trim();
  const { role, remark } = detectRoleFromPassword(accessMap, pwd);
  return jsonResponse({ role, remark });
}