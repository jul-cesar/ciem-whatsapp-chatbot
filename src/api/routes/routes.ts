import { Hono } from "hono";

export const routes = new Hono()

routes.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'CIEM API',
  })
})

routes.get('/health', (c) => {
  return c.json({ ok: true })
})