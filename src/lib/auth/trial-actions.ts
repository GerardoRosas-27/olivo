/**
 * Trial + post-trial email NIP (createServerFn RPC surface).
 *
 * Client routes may import these functions. Handlers dynamically load
 * `trial-actions.server.ts` so Vite import-protection never pulls
 * `*.server.*` / `node:crypto` into the browser graph.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "./middleware";
import type { TrialStatus } from "./trial";

export const getTrialStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TrialStatus> => {
    const { getTrialStatusForUser } = await import("./trial-actions.server");
    return getTrialStatusForUser(context.userId);
  });

export const sendVerificationNip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; delivered: "email-server" }> => {
    const { sendVerificationNipForUser } = await import("./trial-actions.server");
    return sendVerificationNipForUser(context.userId);
  });

export const confirmVerificationNip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ nip: z.string().trim().regex(/^\d{6}$/) }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { confirmVerificationNipForUser } = await import("./trial-actions.server");
    return confirmVerificationNipForUser(context.userId, data.nip);
  });
