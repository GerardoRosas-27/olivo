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
- Acceso al panel solo con correo (sin contraseña), prueba de 15 días y verificación con NIP

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

El acceso principal es **correo sin contraseña** (OTP / código de 6 dígitos). OAuth es opcional.

### Variables requeridas

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres. Si falta, corre con PGLite. |
| `BETTER_AUTH_SECRET` | Secreto de sesión (largo y aleatorio). |
| `BETTER_AUTH_URL` | Origen público https, p.ej. `https://olivo-production.up.railway.app`. |
| `VITE_AUTH_ENABLED` | `true` en el deploy (el cliente muestra el login). |

### Correo (OTP de login + NIP de verificación)

| Variable | Uso |
| --- | --- |
| `RESEND_API_KEY` | API key de Resend. Si falta, el servidor imprime el código/NIP en los logs. |
| `EMAIL_FROM` | Remitente Resend, p.ej. `Olivo <noreply@tudominio.com>`. Default: `Olivo <onboarding@resend.dev>`. |

### Comportamiento

1. En `/login` el usuario escribe su correo, recibe un código y entra.
2. Cuentas nuevas: **15 días de prueba** (`user_trials`). `emailVerified` falso hasta el NIP.
3. Con prueba activa o correo verificado: acceso completo al panel.
4. Tras la prueba sin verificar: solo `/admin/cuenta` (enviar NIP + confirmar).
5. Al confirmar NIP: `user_trials.verified_at` y `user.emailVerified = true`.

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
