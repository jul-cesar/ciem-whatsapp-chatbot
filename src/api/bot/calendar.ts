import { Auth, google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const serviceAccount = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
  universe_domain: "googleapis.com",
};

let cachedAuth: Auth.JWT | null = null;

async function getAuth() {
  console.log(process.env.GOOGLE_PRIVATE_KEY);
  if (cachedAuth) return cachedAuth;

  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: SCOPES,
  });
  cachedAuth = auth;
  return auth;
}

const CALENDAR_ID = "primary";

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export async function checkAvailability(
  date: string
): Promise<{ slots: TimeSlot[]; error?: string }> {
  try {
    const auth = await getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    const slots: TimeSlot[] = [];

    const workingHoursStart = 8;
    const workingHoursEnd = 17;

    for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      const hasConflict = events.some((event) => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || "");
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || "");

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
    const auth = await getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const appointmentDateTime = new Date(`${date}T${time}:00`);

    const startTime = new Date(appointmentDateTime);
    const endTime = new Date(appointmentDateTime);
    endTime.setHours(endTime.getHours() + 1);

    const event = {
      summary: `Cita CIEM - ${userName}`,
      description: `Cita con estudiante/emprendedor: ${userName}\nCorreo: ${userEmail}\n\nEsta cita fue agendada desde el chatbot de WhatsApp del CIEM.`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/Bogota",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Bogota",
      },
      attendees: [{ email: userEmail }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
      sendUpdates: "all",
    });

    return {
      success: true,
      eventId: response.data.id ?? undefined,
      htmlLink: response.data.htmlLink ?? undefined,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Error al crear la cita" };
  }
}