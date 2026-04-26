# Development

- Local dev: `vc dev` (not npm run dev)
- Build: `vc build`
- Deploy: `vc deploy`

# Tech Stack

- Framework: Hono (not Next.js)
- Runtime: Vercel Functions
- Package manager: pnpm (uses pnpm-lock.yaml)

# Project Structure

- Entry: `src/index.ts`
- Routes: `/api/v1` (routes.ts) and `/api/webhooks` (whatsapp.ts)
- Bot logic: `src/api/bot/`
- WhatsApp integration: uses @chat-adapter/whatsapp and @chat-adapter/state-pg

# Commands

None configured: no test, lint, typecheck, or formatter scripts in package.json.