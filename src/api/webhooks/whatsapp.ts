import { Hono } from "hono";
import { bot } from "../bot/main.js";

export const webhooks = new Hono()

webhooks.get('/whatsapp', (c, r) => {
  return bot.getAdapter('whatsapp').handleWebhook(c.req.raw);
});
            
webhooks.post('/whatsapp', (c) => {
  return bot.getAdapter('whatsapp').handleWebhook(c.req.raw );
});
