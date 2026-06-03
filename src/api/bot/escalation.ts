import { Resend } from "resend";

const COORDINATOR_EMAIL = process.env.COORDINATOR_EMAIL || "centroemprendimiento@cecar.edu.co";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface EscalationData {
  userName: string;
  userEmail: string;
  userPhone: string;
  summary: string;
}

export interface EscalationResult {
  success: boolean;
  error?: string;
}

export async function sendEscalation(data: EscalationData): Promise<EscalationResult> {
  try {
    const client = getResend();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Solicitud de Escalamiento - Chatbot CIEM</h2>
        
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #334155;">Datos del Solicitante</h3>
          <p style="margin: 4px 0;"><strong>Nombre:</strong> ${data.userName}</p>
          <p style="margin: 4px 0;"><strong>Correo:</strong> ${data.userEmail}</p>
          <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${data.userPhone}</p>
        </div>
        
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #334155;">Resumen de la Consulta</h3>
          <p style="margin: 0; white-space: pre-wrap;">${data.summary}</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
          Este correo fue generado automáticamente por el chatbot de WhatsApp del CIEM.
          Por favor responder al correo del solicitante: ${data.userEmail}
        </p>
      </div>
    `;

    const text = `SOLICITUD DE ESCALAMIENTO - CHATBOT CIEM

DATOS DEL SOLICITANTE:
Nombre: ${data.userName}
Correo: ${data.userEmail}
Teléfono: ${data.userPhone}

RESUMEN DE LA CONSULTA:
${data.summary}

---
Este correo fue generado automáticamente por el chatbot de WhatsApp del CIEM.
Por favor responder al correo del solicitante: ${data.userEmail}`;

    await client.emails.send({
      from: `Chatbot CIEM <${SENDER_EMAIL}>`,
      to: COORDINATOR_EMAIL,
      subject: `[Escalamiento CIEM] ${data.userName}`,
      html,
      text,
      replyTo: data.userEmail,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending escalation email:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}
