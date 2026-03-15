import { Chat } from 'chat';
import { Hono } from 'hono';
import { routes } from './api/routes/routes.js';
import { webhooks } from './api/webhooks/whatsapp.js';


const app = new Hono().basePath("/api")

app.route('/v1', routes)
app.route('/webhooks', webhooks)
  

const bot = Chat.getSingleton()
await bot.initialize()




bot.onNewMention(async (thread, message) => {
  await thread.post("Hello from WhatsApp!");
});

export default app
