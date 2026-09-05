/** Better Auth client plugin for temporary email-only sign-in. */
export function emailOnlyClient() {
  return {
    id: "email-only",
    pathMethods: {
      "/sign-in/email-only": "POST" as const,
    },
    atomListeners: [
      {
        matcher: (path: string) => path === "/sign-in/email-only",
        signal: "$sessionSignal" as const,
      },
    ],
  };
}
