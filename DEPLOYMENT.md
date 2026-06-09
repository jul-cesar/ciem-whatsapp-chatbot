# Estado del Despliegue - CIEM WhatsApp Chatbot

## Fecha de última actualización
Junio 2026

---

## Estado Actual

### Servicios Docker en ejecución

| Servicio | Contenedor | Estado | Puerto Interno | Puerto Externo |
|---|---|---|---|---|
| **Chatbot App** | `chatbot-app` | ✅ Activo | 3000 | — |
| **Nginx Interno** | `chatbot-nginx` | ✅ Activo | 80 | **9000** |
| **PostgreSQL** | `chatbot-postgres` | ✅ Activo (healthy) | 5432 | — |
| **Certbot** | `chatbot-certbot` | ✅ Activo | — | — |

### Servicios del proyecto externo (no tocar)

| Servicio | Contenedor | Puerto Host |
|---|---|---|
| **Nginx Sie-CIEM** | `sie-ciem-nginx` | **8080** → 80 |
| **Backend** | `sie-ciem-backend` | 3000 (interno) |
| **Frontend** | `sie-ciem-frontend` | 3000 (interno) |
| **Redis** | `sie-ciem-redis` | 6379 (interno) |
| **PostgreSQL** | `sie-ciem-postgres` | 5432 (interno) |

---

## Funcionando ✅

1. **Chatbot operativo** — Responde en `http://10.10.14.22:9000`
2. **PostgreSQL local** — Base de datos independiente para el chatbot
3. **Nginx interno** — Reverse proxy para el chatbot (puerto 9000)
4. **Acceso directo por IP** — `curl http://10.10.14.22:9000/privacy-policy` funciona
5. **Contenedores saludables** — Todos los servicios del chatbot están corriendo sin errores

---

## Pendiente ⚠️

### 1. Configuración DNS del dominio

**Qué falta:** El subdominio `chatciem.cecar.edu.co` debe apuntar a la IP de la VPS (`10.10.14.22`).

**Quién lo hace:** Administradores del dominio `cecar.edu.co`.

**Acción requerida:** Crear un registro A:
```
chatciem.cecar.edu.co → 10.10.14.22
```

---

### 2. Integración con Nginx del proyecto Sie-CIEM

**Qué falta:** Agregar un server block en el Nginx existente (`sie-ciem-nginx`) para rutear el tráfico del subdominio al chatbot.

**Por qué es necesario:** El Nginx existente (`sie-ciem-nginx`) es el único servicio que escucha en el puerto **80** del host. Para que `chatciem.cecar.edu.co` funcione, debe redirigir el tráfico al puerto **9000** donde está el chatbot.

**Archivo a modificar:** `/home/deving/opt/sie-ciem/nginx/nginx.conf`

**Configuración a agregar:**

```nginx
server {
    listen 80;
    server_name chatciem.cecar.edu.co;

    location / {
        proxy_pass http://host.docker.internal:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Después de agregar:** Recargar Nginx:
```bash
docker exec sie-ciem-nginx nginx -s reload
```

> **Nota:** Si `host.docker.internal` no funciona en el entorno Docker, usar la IP del gateway de Docker (`172.17.0.1` o la que corresponda).

---

### 3. SSL / HTTPS

**Qué falta:** Configurar certificado SSL para `chatciem.cecar.edu.co`.

**Bloqueado por:**
- Requiere DNS configurado primero
- Requiere que el Nginx del proyecto Sie-CIEM sirva el tráfico del dominio (paso 2)

**Opciones para SSL:**

1. **Let's Encrypt (recomendado)** — Gratuito, renovación automática
2. **Certbot en el Nginx existente** — El admin de `deving` puede obtener el certificado
3. **Cloudflare Tunnel** — Alternativa si no se puede modificar el Nginx existente

---

## Resumen de arquitectura

```
Usuario ──► chatciem.cecar.edu.co (puerto 80)
              │
              ▼
    ┌─────────────────┐
    │  sie-ciem-nginx │  (puerto 8080 del host)
    │   (Nginx        │  ← SOLO si agregan server block
    │    existente)   │
    └─────────────────┘
              │
              ▼ proxy_pass
    ┌─────────────────┐
    │  chatbot-nginx  │  (puerto 9000 del host)
    │  (Nginx interno)│
    └─────────────────┘
              │
              ▼ proxy_pass
    ┌─────────────────┐
    │   chatbot-app   │  (Hono + Node.js)
    │   (puerto 3000) │
    └─────────────────┘
              │
              ▼ queries
    ┌─────────────────┐
    │ chatbot-postgres│  (PostgreSQL local)
    │   (puerto 5432) │
    └─────────────────┘
```

---

## Próximos pasos (en orden)

| Paso | Acción | Responsable | Estado |
|---|---|---|---|
| 1 | Crear registro DNS: `chatciem.cecar.edu.co` → `10.10.14.22` | Admin del dominio | ⏳ Pendiente |
| 2 | Agregar server block en Nginx de Sie-CIEM | `deving` | ⏳ Pendiente |
| 3 | Verificar propagación DNS | `dig chatciem.cecar.edu.co` | ⏳ Bloqueado |
| 4 | Configurar SSL (Let's Encrypt) | `deving` o chatbot | ⏳ Bloqueado |
| 5 | Probar endpoints con dominio | `curl https://chatciem.cecar.edu.co/privacy-policy` | ⏳ Bloqueado |

---

## Acceso temporal (para desarrollo/pruebas)

Mientras tanto, el chatbot está accesible directamente por IP:

```bash
curl http://10.10.14.22:9000/privacy-policy
```

### Verificación de servicios

```bash
# Ver estado de todos los contenedores
docker ps

# Ver logs del chatbot
docker compose logs -f chatbot

# Ver logs del Nginx interno
docker compose logs -f nginx

# Ver logs de PostgreSQL
docker compose logs -f postgres
```

---

## Notas importantes

- **No hay conflictos** con el proyecto Sie-CIEM. El server block con `server_name chatciem.cecar.edu.co` solo intercepta tráfico de ese subdominio específico; todo lo demás sigue yendo al catch-all (`server_name _`).
- **Base de datos independiente:** El chatbot usa su propio PostgreSQL (`chatbot-postgres`), separado del PostgreSQL de Sie-CIEM (`sie-ciem-postgres`).
- **Puerto 9000:** Mapeado directamente del host al Nginx interno del chatbot. No hay conflicto con el puerto 8080 del Sie-CIEM.
- **Certbot:** El contenedor `chatbot-certbot` está en ejecución pero actualmente no hace nada útil, ya que el Nginx interno no maneja SSL directamente. Puede detenerse si se desea ahorrar recursos: `docker compose stop certbot`.

---

## Archivos de configuración clave

| Archivo | Propósito |
|---|---|
| `docker-compose.yml` | Define servicios: postgres, chatbot, nginx, certbot |
| `Dockerfile` | Multi-stage build con Node.js 22 + npm |
| `nginx/nginx.conf` | Configuración del Nginx interno del chatbot |
| `nginx/existing-nginx-chatciem.conf` | Configuración propuesta para el Nginx de Sie-CIEM |
| `.env` | Variables de entorno (WhatsApp, OpenAI, Google, PostgreSQL) |
| `.env.example` | Plantilla de variables de entorno |
| `src/server.ts` | Servidor Hono con `@hono/node-server` |
| `src/api/bot/calendar.ts` | Integración con Google Calendar (usa `GOOGLE_CALENDAR_ID` desde `.env`) |

---

*Última actualización: 2026-06-09*
