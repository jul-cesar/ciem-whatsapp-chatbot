import { Hono } from "hono";

export const routes = new Hono()

routes.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'Hello Hono!',
    docs: 'https://vercel.com/docs/frameworks/backend/hono'
  })
})

routes.get('/health', (c) => {
  return c.json({ ok: true })
})