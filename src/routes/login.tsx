import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-[11px] tracking-[0.28em] text-muted uppercase">Olivo</p>
        <h1 className="font-display text-4xl italic">Entrar al panel</h1>
        {authEnabled ? (
          <div className="flex flex-col gap-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                className="h-11 rounded-[var(--radius)] border border-border bg-surface"
                onClick={() => signIn(p.providerId, { callbackURL: "/admin" })}
              >
                Continuar con {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">El acceso está desactivado.</p>
        )}
        <Link to="/" className="block text-sm text-olive">
          Volver
        </Link>
      </div>
    </main>
  );
}
