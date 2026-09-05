import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GuestLanding, InvitationBlocked } from "@/components/guest-landing";
import { deviceId } from "@/lib/wedding/qr";
import { openInvitation, peekInvitation } from "@/lib/wedding/server";
import type { InvitationResult } from "@/lib/wedding/types";

export const Route = createFileRoute("/i/$token")({
  loader: async ({ params }) => peekInvitation({ data: params.token }),
  component: InvitationPage,
  pendingComponent: () => (
    <main className="grid min-h-screen place-items-center bg-bg text-fg">
      <p className="text-sm text-muted">Abriendo tu invitación…</p>
    </main>
  ),
});

function InvitationPage() {
  const { token } = Route.useParams();
  const peeked = Route.useLoaderData();
  const [result, setResult] = useState<InvitationResult>(peeked);

  useEffect(() => {
    let cancelled = false;
    void openInvitation({ data: { token, deviceId: deviceId() } }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!result.ok) return <InvitationBlocked reason={result.reason} />;
  return <GuestLanding token={token} view={result} />;
}
