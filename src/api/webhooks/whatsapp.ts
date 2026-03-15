import { Hono } from "hono";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { bot } from "../bot/main.js";
import { SYSTEM_PROMPT } from "../bot/system-prompt.js";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await bot.initialize();

    bot.onDirectMessage(async (thread, message) => {
      await thread.subscribe();
      await handleMessage(thread, message);
    });

    bot.onSubscribedMessage(async (thread, message) => {
      await handleMessage(thread, message);
    });

    initialized = true;
  }
}

async function handleMessage(
  thread: Parameters<Parameters<typeof bot.onDirectMessage>[0]>[0],
  message: Parameters<Parameters<typeof bot.onDirectMessage>[0]>[1]
) {
  try {
    await thread.startTyping();

    // Construir historial desde mensajes persistidos (sin incluir el actual)
    const history: Array<{ role: "user" | "assistant"; content: string }> = [];
    for await (const msg of thread.messages) {
      // Saltar el mensaje actual, lo agregamos aparte al final
      if (msg.id === message.id) continue;
      history.push({
        role: msg.author.isMe ? "assistant" : "user",
        content: msg.text,
      });
    }
    history.reverse();

    // Agregar el mensaje actual del usuario al final (siempre presente)
    history.push({ role: "user", content: message.text });

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: history,
    });

    await thread.post(text);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
    await thread.post(
      "Disculpa, tuve un problema procesando tu mensaje. Por favor intenta de nuevo."
    );
  }
}

export const webhooks = new Hono();

webhooks.get("/whatsapp", async (c) => {
  return bot.getAdapter("whatsapp").handleWebhook(c.req.raw);
});
webhooks.post("/whatsapp", async (c) => {
  await ensureInitialized();
  return bot.getAdapter("whatsapp").handleWebhook(c.req.raw, { waitUntil });
});
