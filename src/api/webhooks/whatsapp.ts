import { Hono } from "hono";
import { waitUntil } from "@vercel/functions";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { bot } from "../bot/main.js";
import { SYSTEM_PROMPT } from "../bot/system-prompt.js";
import { checkAvailability, createAppointment } from "../bot/calendar.js";
import { z } from "zod";

const MAX_HISTORY = 15;

const WELCOME_MESSAGE = `¡Hola! 👋 Soy el asistente virtual del CIEM de CECAR.

Estoy aquí para ayudarte con:
📋 Información sobre el proceso de emprendimiento
📄 Formulación de planes de negocio
🎓 Opción de grado en emprendimiento
📝 Pre-inscripción al CIEM
📅 Agendar citas de atención

¿En qué te puedo ayudar hoy?`;

const UNSUPPORTED_MESSAGE = `Por el momento solo puedo responder mensajes de texto 😊

Si tienes una consulta, escríbela y con gusto te ayudo.`;

const tools = {
  checkAvailability: tool({
    description:
      "Consulta los horarios disponibles para agendar una cita en el CIEM. Se usa cuando el usuario quiere agendar una cita o consulta la disponibilidad.",
    inputSchema: z.object({
      date: z
        .string()
        .describe(
          "La fecha en formato YYYY-MM-DD. Por ejemplo: 2026-04-28 para el 28 de abril de 2026."
        ),
    }),
    execute: async ({ date }) => {
      console.log("checkAvailability called with date:", date);
      const result = await checkAvailability(date);
      console.log("checkAvailability result:", result);
      if (result.error) {
        return { error: result.error };
      }
      const availableSlots = result.slots
        .filter((s) => s.available)
        .map((s) => {
          const time = new Date(s.start).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return time;
        });
      if (availableSlots.length === 0) {
        return { available: false, slots: [], message: "No hay horarios disponibles" };
      }
      return {
        available: true,
        slots: availableSlots,
        message: `Horarios disponibles: ${availableSlots.join(", ")}`,
      };
    },
  }),
  createAppointment: tool({
    description:
      "Crea una cita en el calendario del CIEM. Se usa después de que el usuario confirme el horario deseado.",
    inputSchema: z.object({
      date: z
        .string()
        .describe(
          "La fecha en formato YYYY-MM-DD. Por ejemplo: 2026-04-28 para el 28 de abril de 2026."
        ),
      time: z
        .string()
        .describe(
          "La hora en formato HH:MM. Por ejemplo: 09:00 para las 9 AM, 14:00 para las 2 PM."
        ),
      userName: z.string().describe("Nombre completo del usuario"),
      userEmail: z
        .string()
        .describe("Correo electrónico del usuario"),
    }),
    execute: async ({ date, time, userName, userEmail }) => {
      console.log("createAppointment called:", { date, time, userName, userEmail });
      const result = await createAppointment(date, time, userName, userEmail);
      console.log("createAppointment result:", result);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        message: `✅ Cita programada exitosamente para el ${date} a las ${time}`,
        eventLink: result.htmlLink,
      };
    },
  }),
};

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
    if (!message.text || message.text.trim() === "") {
      await thread.post(UNSUPPORTED_MESSAGE);
      return;
    }

    await thread.startTyping();

    const allMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for await (const msg of thread.messages) {
      if (msg.id === message.id) continue;
      allMessages.push({
        role: msg.author.isMe ? "assistant" : "user",
        content: msg.text,
      });
    }

    const history = allMessages.reverse().slice(-MAX_HISTORY);

    if (history.length === 0) {
      await thread.post(WELCOME_MESSAGE);
    }

    history.push({ role: "user", content: message.text });

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: history,
      tools,
    });

    let responseText = result.text;

    if (!responseText || responseText.trim() === "") {
      console.log("No text response, checking toolResults:", result.toolResults);
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0] as any;
        const res = toolResult?.result;
        console.log("Tool result:", res);
        if (res?.available === true) {
          responseText = `✅ ${res.message}`;
        } else if (res?.available === false) {
          responseText = `😕 ${res.message || "No hay horarios disponibles para esa fecha."}`;
        } else if (res?.success === true) {
          responseText = `✅ ${res.message}`;
        } else if (res?.error) {
          responseText = `❌ Error: ${res.error}`;
        } else {
          responseText = "He procesado tu solicitud. ¿Hay algo más en lo que pueda ayudarte?";
        }
      }
    }

    if (!responseText || responseText.trim() === "") {
      responseText = "He procesado tu solicitud. ¿Hay algo más en lo que pueda ayudarte?";
    }

    await thread.post(responseText);
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