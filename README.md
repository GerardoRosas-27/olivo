# Olivo

Aplicación para crear invitaciones digitales de bodas.

Cada invitado recibe un enlace único con código QR. Desde el panel se arma la boda, se envían las invitaciones por WhatsApp, se recogen confirmaciones y se controla el acceso en la puerta.

## Qué incluye

- Invitación personalizada por invitado (enlace + QR)
- Envío por WhatsApp con plantilla editable
- Confirmación de asistencia (RSVP)
- Lista de invitados, grupos y aforo
- Escáner de puerta para check-in
- Detección de enlaces compartidos o clonados
- Acceso al panel con correo (sin contraseña)
- Opcional: prueba de 15 días + verificación por NIP vía email-server

## Stack

TanStack Start, React, Tailwind, Better Auth, Postgres (Neon o PGLite local).

## Cómo correrla

```bash
npm install
npm run dev
```

Abre [http://localhost:8080](http://localhost:8080).

Sin `DATABASE_URL` usa una base Postgres embebida (PGLite), suficiente para desarrollo. En producción configura Neon u otro Postgres.

Ver la sección **Auth en producción (Railway)** más abajo para las variables.

```bash
npm run build
npm run typecheck
```

## Auth en producción (Railway)

El acceso principal es **correo sin contraseña** (validación local del formato). OAuth es opcional.

### Variables requeridas

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres. Si falta, PGLite. Migraciones también al arrancar (`ensureDbReady`). |
| `BETTER_AUTH_SECRET` | Secreto de sesión (largo y aleatorio). También pepper del hash del NIP. |
| `BETTER_AUTH_URL` | Origen público https, p.ej. `https://olivo-production.up.railway.app`. |
| `VITE_AUTH_ENABLED` | `true` en el deploy (el cliente muestra el login). |

### Verificación por correo (opcional, flag)

Por defecto **desactivada** (`EMAIL_VERIFICATION_ENABLED` unset o `false`): email-only login, sin bloqueo de TrialGate, Cuenta informativa, sin llamadas a `/send-nip`.

Para activar la prueba de 15 días + NIP:

| Variable | Uso |
| --- | --- |
| `EMAIL_VERIFICATION_ENABLED` | `true` para activar TrialGate + UI de envío/confirmación de NIP. Default: `false`. |
| `EMAIL_SERVER_URL` | Base URL del email-server en Railway, p.ej. `https://email-server-production.up.railway.app`. Obligatorio si la verificación está activada. |

Comportamiento con el flag en `true`:

1. En `/login` el usuario escribe su correo y continúa (sin contraseña).
2. Nuevas cuentas reciben 15 días de prueba (`user_trials`).
3. Mientras la prueba esté activa **o** el correo esté verificado: acceso completo al admin.
4. Tras la prueba sin verificar: solo `/admin/cuenta` (enviar NIP + confirmar).
5. **Enviar NIP**: Olivo hace `POST ${EMAIL_SERVER_URL}/send-nip` con `{ email, userName }`. El email-server **genera** el NIP y lo envía; Olivo toma `nip` de la respuesta, lo hashea y lo guarda (~20 min). El NIP crudo **nunca** vuelve al navegador.
6. **Confirmar NIP**: el usuario escribe el código en Cuenta → se marca verificado.

Health del email-server: `GET ${EMAIL_SERVER_URL}/health`.

El cliente lee `verificationEnabled` desde el RPC `getTrialStatus` (un solo env de servidor; no hace falta flag Vite).

**Desactivar / volver al modo sin verificación:** quita `EMAIL_VERIFICATION_ENABLED` o ponla en `false` y redespliega. No hace falta quitar `EMAIL_SERVER_URL`.

`RESEND_API_KEY` / `EMAIL_FROM` no son necesarios para el flujo NIP (usa el email-server).

### OAuth opcional

Los botones Google/X solo aparecen con credenciales reales y flags del cliente:

| Variable | Uso |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google nativo. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | X nativo. |
| `VITE_AUTH_SOCIAL` | `true` para botones nativos. |
| `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | Broker Grok real (nunca preview en Railway). |
| `VITE_AUTH_BROKER` | `true` para botones del broker. |

Redirect URIs nativos: `/api/auth/callback/google` y `/api/auth/callback/twitter` bajo el origen público.

Con `DATABASE_URL` el preview broker no se usa (provoca 500 en Railway).
