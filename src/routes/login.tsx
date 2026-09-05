import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  authEnabled,
  emailOtpEnabled,
  getSignInProviders,
  signIn,
} from "@/lib/auth/client";
import { EmailOtpForm } from "@/lib/auth/email-otp-form";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const providers = getSignInProviders();
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-[11px] tracking-[0.28em] text-muted uppercase">Olivo</p>
        <h1 className="font-display text-4xl italic">Entrar al panel</h1>
        {authEnabled ? (
          <div className="flex flex-col gap-4">
            {emailOtpEnabled ? <EmailOtpForm callbackURL="/admin" /> : null}
            {providers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {emailOtpEnabled ? (
                  <p className="text-center text-xs text-muted">o continúa con</p>
                ) : null}
                {providers.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    className="h-11 rounded-[var(--radius)] border border-border bg-surface"
                    onClick={() =>
                      signIn(p.providerId, { callbackURL: "/admin", kind: p.kind })
                    }
                  >
                    Continuar con {p.label}
                  </button>
                ))}
              </div>
            ) : emailOtpEnabled ? null : (
              <p className="text-sm text-muted">
                El acceso no está configurado en este deploy.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">El acceso está desactivado.</p>
        )}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-olive">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Link>
      </div>
    </main>
  );
}
