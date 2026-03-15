import { createPostgresState } from "@chat-adapter/state-pg";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat } from "chat";

export const bot = new Chat({
  userName: "ciem",
  adapters: {
    whatsapp: createWhatsAppAdapter(),
  },
  state: createPostgresState(),
  onLockConflict: "force",
})

