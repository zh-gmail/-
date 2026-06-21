import type { Context } from 'hono';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com';

export async function proxyHandler(c: Context): Promise<Response> {
  const path = c.req.path.replace(/^\/api\/proxy\/dashscope/, '');
  const targetUrl = `${DASHSCOPE_BASE}${path}`;

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'DASHSCOPE_API_KEY not configured on server' }, 502);
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
  };

  const contentType = c.req.header('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const xDashScope = c.req.header('X-DashScope-Async');
  if (xDashScope) headers['X-DashScope-Async'] = xDashScope;

  const accept = c.req.header('accept');
  if (accept) headers['Accept'] = accept;

  const body = c.req.method === 'GET' || c.req.method === 'HEAD'
    ? undefined
    : await c.req.text();

  try {
    const res = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body,
    });

    const resBody = await res.text();
    return new Response(resBody, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    console.error('DashScope proxy error:', err);
    return c.json({ error: 'Failed to proxy request to DashScope' }, 502);
  }
}
