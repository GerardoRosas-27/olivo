import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

async function handleAuth(request: Request): Promise<Response> {
  try {
    return await auth.handler(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth] handler failed", {
      method: request.method,
      url: request.url,
      message,
    });
    throw err;
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
