/**
 * Temporary passwordless email-only sign-in (no OTP / Resend).
 * Find-or-create user by email, mint Better Auth session + cookie.
 */
import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthEndpoint,
  formCsrfMiddleware,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { isValidEmailFormat, normalizeEmail } from "./email-only";

const bodySchema = z.object({
  email: z.string().min(1),
});

export function emailOnlyPlugin(): BetterAuthPlugin {
  return {
    id: "email-only",
    endpoints: {
      signInEmailOnly: createAuthEndpoint(
        "/sign-in/email-only",
        {
          method: "POST",
          use: [formCsrfMiddleware],
          body: bodySchema,
          metadata: {
            openapi: {
              operationId: "signInEmailOnly",
              description:
                "Sign in or register with email only (temporary, no OTP)",
              responses: {
                200: {
                  description: "Session created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          token: { type: "string" },
                          user: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        async (ctx) => {
          const email = normalizeEmail(ctx.body.email);
          if (!email || !isValidEmailFormat(email)) {
            throw APIError.fromStatus("BAD_REQUEST", {
              message: "Correo inválido",
            });
          }

          let user = await ctx.context.internalAdapter
            .findUserByEmail(email)
            .then((res) => res?.user);

          if (!user) {
            const local = email.split("@")[0] || "Usuario";
            user = await ctx.context.internalAdapter.createUser({
              email,
              emailVerified: true,
              name: local,
            });
            if (!user) {
              throw APIError.fromStatus("INTERNAL_SERVER_ERROR", {
                message: "No se pudo crear la cuenta",
              });
            }
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          if (!session) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", {
              message: "No se pudo crear la sesión",
            });
          }

          await setSessionCookie(ctx, { session, user });

          return ctx.json({
            token: session.token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              image: user.image ?? null,
            },
          });
        },
      ),
    },
  };
}
