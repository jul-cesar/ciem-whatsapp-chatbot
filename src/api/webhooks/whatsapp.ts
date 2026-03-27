import { Hono } from "hono";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { bot } from "../bot/main.js";
import { SYSTEM_PROMPT } from "../bot/system-prompt.js";

const MAX_HISTORY = 15;

const WELCOME_MESSAGE = `¡Hola! 👋 Soy el asistente virtual del CIEM de CECAR.

Estoy aquí para ayudarte con:
📋 Información sobre el proceso de emprendimiento
📄 Formulación de planes de negocio
🎓 Opción de grado en emprendimiento
📝 Pre-inscripción al CIEM

¿En qué te puedo ayudar hoy?`;

const UNSUPPORTED_MESSAGE = `Por el momento solo puedo responder mensajes de texto 😊

Si tienes una consulta, escríbela y con gusto te ayudo.`;

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
    // Mejora 3: Manejo de mensajes no texto (audio, imagen, sticker, etc.)
    if (!message.text || message.text.trim() === "") {
      await thread.post(UNSUPPORTED_MESSAGE);
      return;
    }

    await thread.startTyping();

    // Construir historial desde mensajes persistidos (sin incluir el actual)
    const allMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for await (const msg of thread.messages) {
      if (msg.id === message.id) continue;
      allMessages.push({
        role: msg.author.isMe ? "assistant" : "user",
        content: msg.text,
      });
    }

    // Limitar historial a los últimos MAX_HISTORY mensajes (en orden cronológico)
    const history = allMessages.slice(-MAX_HISTORY);

    // Mejora 2: Mensaje de bienvenida si es el primer mensaje del usuario
    if (history.length === 0) {
      await thread.post(WELCOME_MESSAGE);
    }

    // Agregar el mensaje actual del usuario al final
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