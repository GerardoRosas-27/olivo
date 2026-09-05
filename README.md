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

## Stack

TanStack Start, React, Tailwind, Better Auth, Postgres (Neon o PGLite local).

## Cómo correrla

```bash
npm install
npm run dev
```

Abre [http://localhost:8080](http://localhost:8080).

Sin `DATABASE_URL` usa una base Postgres embebida (PGLite), suficiente para desarrollo. En producción configura Neon u otro Postgres.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres. Si falta, corre con PGLite. |
| `BETTER_AUTH_SECRET` | Secreto de sesión en producción. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Entrar con Google. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Entrar con X. |

```bash
npm run build
npm run typecheck
```
