import { onRequestGet as healthGet } from '../functions/api/health.js';
import { onRequestGet as stateGet } from '../functions/api/state.js';
import { onRequestPost as mutationsPost } from '../functions/api/mutations.js';
import { onRequestPost as loginPost, onRequestGet as authGet, onRequestDelete as logoutDelete } from '../functions/api/auth-login.js';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'same-origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return withCors(await healthGet({ request, env, ctx }));
      }
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        return withCors(await loginPost({ request, env, ctx }));
      }
      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
        return withCors(await authGet({ request, env, ctx }));
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'DELETE') {
        return withCors(await logoutDelete({ request, env, ctx }));
      }
      if (url.pathname === '/api/state' && request.method === 'GET') {
        return withCors(await stateGet({ request, env, ctx }));
      }
      if (url.pathname === '/api/mutations' && request.method === 'POST') {
        return withCors(await mutationsPost({ request, env, ctx }));
      }

      // All non-API routes are served by Vite's built SPA assets.
      return env.ASSETS.fetch(request);
    } catch (error) {
      return withCors(new Response(JSON.stringify({
        error: error?.message || String(error),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }));
    }
  },
};
