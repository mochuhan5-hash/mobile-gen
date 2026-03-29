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

type KioskStagePayload = {
  statusCode: 1 | 2 | 3 | 4 | 5;
  nextStage?: 1 | 2 | 3 | 4 | 5;
  symptom?: string;
  department?: string;
  selectedDoctor?: string;
  source?: string;
  ts?: number;
};

let latestKioskStage: KioskStagePayload | null = null;
let latestUserProfile: Record<string, unknown> | null = null;

/**
 * Vite dev 中提供手机端本地 API：
 * - POST /api/kiosk-stage 接收一体机状态码
 * - GET  /api/kiosk-stage 返回最新状态
 */
function kioskStageApiPlugin() {
  return {
    name: 'kiosk-stage-api-plugin',
    configureServer(server: { middlewares: { use: (handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const isKioskStage = req.url?.startsWith('/api/kiosk-stage');
        const isUserProfile = req.url?.startsWith('/api/user-profile');
        if (!isKioskStage && !isUserProfile) return next();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: true,
              data: isKioskStage ? latestKioskStage : latestUserProfile,
            })
          );
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
          return;
        }

        let raw = '';
        req.on('data', (chunk) => {
          raw += String(chunk);
        });
        req.on('end', () => {
          try {
            if (isKioskStage) {
              const parsed = JSON.parse(raw || '{}') as Partial<KioskStagePayload>;
              const statusCode = Number(parsed.statusCode);
              if (![1, 2, 3, 4, 5].includes(statusCode)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'statusCode must be 1..5' }));
                return;
              }
              latestKioskStage = {
                statusCode: statusCode as 1 | 2 | 3 | 4 | 5,
                nextStage: parsed.nextStage,
                symptom: parsed.symptom ?? '',
                department: parsed.department ?? '',
                selectedDoctor: parsed.selectedDoctor ?? '',
                source: parsed.source ?? 'kiosk',
                ts: parsed.ts ?? Date.now(),
              };
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, data: latestKioskStage }));
              return;
            }

            const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
            latestUserProfile = parsed;
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data: latestUserProfile }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY) ?? '';
  const openaiBase = normalizeEnvValue(env.OPENAI_BASE_URL);
  const { target: openAiProxyTarget, pathPrefix: openAiProxyPathPrefix } =
    openAiProxyFromEnv(openaiBase);

  return {
    plugins: [react(), tailwindcss(), kioskStageApiPlugin()],
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
