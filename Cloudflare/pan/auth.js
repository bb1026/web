import { jsonResponse } from './utils.js';

export async function handleAuth(request, accessMap) {
  if (request.method === 'POST') {
    const key = (await request.text()).trim();
    const role = accessMap[key] || '';
    return jsonResponse({ role });
  }
  return new Response('Method Not Allowed', { status: 405 });
}