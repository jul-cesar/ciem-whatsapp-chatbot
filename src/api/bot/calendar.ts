import { Auth, google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const serviceAccount = {
  type: "service_account",
  project_id: "direct-outlet-459217-t5",
  private_key_id: "b4446b6b1ad5d65f6e6401d48e439706fc2a9cd2",
  private_key:
    "nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCy4R72aMZX7Plz\nC/pHZJM4ZLFWNs3cNdC89fKqCd/MomDU7GU0VIdknVTpbZbnI54OhS+0TKFCUIzC\nswGLJCbREMvE1QwOX9xrch5l7yfH+XKe0b4G1nWZzLZHhlJUyedUtFTQAJJbhnGm\nDocE27UjpRyG0Fk1zMgdFkofApp/70uJxnsWK8f94lThpRV5zbGBVgHuZYUrQKPb\nCI4BJP7du7vNwhQrF+bJzy7ez78yTY3h1BojBo9b6k/6Eo96BIwQAs2JyjhdYWc+\no1JQ/13v1CT4fiVhJfbH2VU3LKeJz7b+ZIHbOGfF7rNB2F8ghWzIxjsWMeSsDH46\nll5MUfftAgMBAAECggEACPcAWsAYhKqTO+FTS0WunSpqutPnUEyAKCA5Z600Aqj2\nqmUok01TNccuzL4ZzH67+qVRJTub71tjGpTnFGac7WhmlfhJcOT8AoSHInuwZjTJ\nukzvtZ8E6M7aKc6BDM/LoLKi94O30g90XaqnuKYcN2uceOMzPV+EffSyhUhXnua1\nUj8+WyfIp3hEDKOhB7NbGXnTDLNvZH1FFC0vM0Kgba89Ehq7ItMynAQeTg7B7YYh\naMSbmGHnrTkm87A0/E6NAMGtEfDtlVM4IFMy0cfTFIysNEGxkeSZ//wOp6OSTrb8\nszzoqJAME5/lrm/VkTByPwNKQ5oRli16bWRTe2DIHwKBgQDZMU/uf2l549cJfxXs\nM0S4+1QC7RDyRje/DQDKYXlyLQ3OinktC4jZqMCfySiHRrjqJcA9T/0iB8k5/n7c\njI3uR8K5/5Cai0S6OgEnev+Y2G/+ToZyBbm+xNOU7VfQ7VshWjhxwi06Z0FQu2s5\ngb8jve/yewRvp+cE57jnO36U/wKBgQDS107yWZBR+qPJRLuJMj118eyZXfcnOVDy\nGRtWUIid7hWlw2/G7c5OY4YEzVF7ySAzHdqz8dLm8mdMPiB8wcYrurajrytt3eWJ\nKVGaaUxH2UB5DdGtsxgMyU1UcMjg4I26N6snt2fM3Uu9JTtNhky9c6CFaMMhNaJo\nEdeDK3YXEwKBgCPayypBKGVx4nbz3ueeUxMCkozlG+4S/3Lvr5i5XLYnj+bv3y87\nfz0Hab03FRS37SDiWIkGonAyvtpvE/xOy8NxX0kbUoDgyti/aJ9e48EUwfBGgFVk\ncpR2o8MrJ1sbQ/cOkNDe0F6a2yJ7vijBLY+19F2gR0wzeKTLqC+sF6p7AoGBAKTq\nnoOfTwp09DWvbBU2VLJna95Qm+bGGlZgop0dmitXtaqVUL1RMoniSRDvxVXEbqsIQ\n8gaaersGlGIAnmy3LQj7bOyvkarITEhzN08uWepBNrr5Yi8ZzRADTSdlaNrtCi7E\naG4SeXC3EA0M2EwVZmUx0jdH8IlDaJs6iXYiQqZdAoGATHj+ZD4sYcDlrRy3by0e\nAkz4gskkQULqE2iOfNHLlN4KSO3D26nu+N28Koq3XlbaYUqd2EP+HXd+hg8JpknK\nWCTgwkclfr6THk4IhAqBvyAV8swS6ragvJsnihVY2eTRebT4me5tnktlTqoVZ1wB\nRbWOCdjgXrhflT7y7aCe7z0=\n-----END PRIVATE KEY-----\n",
  client_email: "ciem-435@direct-outlet-459217-t5.iam.gserviceaccount.com",
  client_id: "101320183039774886515",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/ciem-435%40direct-outlet-459217-t5.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

let cachedAuth: Auth.JWT | null = null;

async function getAuth() {
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
    const slotDuration = 60;

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