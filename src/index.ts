import { Hono } from 'hono';
import { routes } from './api/routes/routes.js';
import { webhooks } from './api/webhooks/whatsapp.js';

const app = new Hono()

app.route('/api/v1', routes)
app.route('/api/webhooks', webhooks)

app.get('/privacy-policy', (c) => {
  return c.html(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Política de Privacidad</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; color: #111827; }
      main { max-width: 800px; margin: 0 auto; }
      h1, h2 { color: #0f172a; }
    </style>
  </head>
  <body>
    <main>
      <h1>Política de Privacidad</h1>
      <p>Última actualización: 15 de marzo de 2026</p>

      <h2>1. Información que recopilamos</h2>
      <p>Podemos recopilar información básica de uso y mensajes necesarios para operar el servicio.</p>

      <h2>2. Uso de la información</h2>
      <p>La información se utiliza para responder consultas, mejorar el servicio y mantener seguridad operativa.</p>

      <h2>3. Compartición de datos</h2>
      <p>No vendemos información personal. Podemos compartir datos con proveedores técnicos cuando sea necesario para operar la plataforma.</p>

      <h2>4. Retención y seguridad</h2>
      <p>Conservamos la información durante el tiempo necesario y aplicamos medidas razonables de seguridad.</p>

      <h2>5. Contacto</h2>
      <p>Para consultas sobre privacidad, contáctanos por los canales oficiales del servicio.</p>
    </main>
  </body>
</html>`)
})
  

export default app