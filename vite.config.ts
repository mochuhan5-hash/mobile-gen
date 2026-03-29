import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const DEFAULT_OPENAI_BASE = 'http://143.198.222.179:8317/v1';

/** Trim and strip one pair of surrounding quotes (common .env typo). */
function normalizeEnvValue(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  let s = v.trim();
  if (s.length >= 2) {
    const q = s[0];
    if ((q === '"' || q === "'") && s[s.length - 1] === q) {
      s = s.slice(1, -1).trim();
    }
  }
  return s;
}

function openAiProxyFromEnv(openaiBaseUrl: string | undefined) {
  const raw = openaiBaseUrl || DEFAULT_OPENAI_BASE;
  try {
    const u = new URL(raw);
    const pathPrefix = u.pathname.replace(/\/$/, '') || '/v1';
    return { target: u.origin, pathPrefix };
  } catch {
    return { target: 'http://143.198.222.179:8317', pathPrefix: '/v1' };
  }
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY) ?? '';
  const openaiBase = normalizeEnvValue(env.OPENAI_BASE_URL);
  const { target: openAiProxyTarget, pathPrefix: openAiProxyPathPrefix } =
    openAiProxyFromEnv(openaiBase);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.OPENAI_API_KEY': JSON.stringify(openaiKey),
      'process.env.OPENAI_BASE_URL': JSON.stringify(openaiBase ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Browser -> remote OpenAI-compatible API is cross-origin; without CORS the request fails.
      // Proxy through dev server so the client only calls same-origin /openai-v1.
      proxy: {
        '/openai-v1': {
          target: openAiProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/openai-v1/, openAiProxyPathPrefix),
        },
      },
    },
  };
});
