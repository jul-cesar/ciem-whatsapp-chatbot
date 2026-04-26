const SCOPES = "https://www.googleapis.com/auth/calendar";

const getServiceAccount = (): {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
} | null => {
  if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL) {
    return null;
  }
  return {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID || "",
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "",
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
  };
};

const CALENDAR_ID = "c_4210e14b7bfc1c444af99e320ff7ba3e89a999e12ce900728933c45eedea909c@group.calendar.google.com";

function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
  if (!sa) {
    throw new Error("Service account credentials not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: SCOPES,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${headerEncoded}.${payloadEncoded}`;

  let keyPem = sa.private_key;
  if (!keyPem.includes("-----BEGIN")) {
    keyPem = "-----BEGIN PRIVATE KEY-----\n" + keyPem + "\n-----END PRIVATE KEY-----";
  }
  keyPem = keyPem.replace(/\\n/g, "\n");
  
  const keyData = keyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\r?\n/g, "");
  const keyBuffer = Uint8Array.from(Buffer.from(keyData, "base64"));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(toSign));
  const signatureBase64 = base64UrlEncode(Buffer.from(signature).toString("binary"));
  const jwt = `${toSign}.${signatureBase64}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string; error_description?: string };
  
  if (!data.access_token) {
    console.error("Token error:", data);
    throw new Error(data.error_description || data.error || "Failed to get access token");
  }

  return data.access_token;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export async function checkAvailability(
  date: string
): Promise<{ slots: TimeSlot[]; error?: string }> {
  try {
    const accessToken = await getAccessToken();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?` +
      new URLSearchParams({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
      }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json() as { items?: Array<{ start?: { dateTime?: string }; end?: { dateTime?: string } }> };
    const events = data.items || [];
    const slots: TimeSlot[] = [];

    const workingHoursStart = 8;
    const workingHoursEnd = 17;

    for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      const hasConflict = events.some((event) => {
        const eventStart = new Date(event.start?.dateTime || "");
        const eventEnd = new Date(event.end?.dateTime || "");

        return (
          (eventStart >= slotStart && eventStart < slotEnd) ||
          (eventEnd > slotStart && eventEnd <= slotEnd) ||
          (eventStart <= slotStart && eventEnd >= slotEnd)
        );
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !hasConflict,
      });
    }

    return { slots };
  } catch (error) {
    console.error("Error checking availability:", error);
    return { slots: [], error: "Error al consultar disponibilidad" };
  }
}

export interface CreateAppointmentResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

export async function createAppointment(
  date: string,
  time: string,
  userName: string,
  userEmail: string
): Promise<CreateAppointmentResult> {
  try {
    const accessToken = await getAccessToken();

    const appointmentDateTime = new Date(`${date}T${time}:00`);

    const startTime = new Date(appointmentDateTime);
    const endTime = new Date(appointmentDateTime);
    endTime.setHours(endTime.getHours() + 1);

    const event = {
      summary: `Cita CIEM - ${userName}`,
      description: `Cita con estudiante/emprendedor: ${userName}\nCorreo: ${userEmail}\n\nEsta cita fue agendada desde el chatbot de WhatsApp del CIEM.`,
      start: { dateTime: startTime.toISOString(), timeZone: "America/Bogota" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Bogota" },
      attendees: [{ email: userEmail }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json() as { id?: string; htmlLink?: string; error?: { message?: string } };
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return {
      success: true,
      eventId: data.id,
      htmlLink: data.htmlLink,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Error al crear la cita" };
  }
}