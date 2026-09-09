// Session truth guard (Phase 1, step 5/6).
// The server is the only authority on identity. localStorage is a UI cache, not a
// credential: it never expires on its own, while the signed session cookie has a 4h
// TTL. Without this, a lapsed session leaves a fully unlocked terminal rendered over
// a server that correctly refuses every call behind it.
const AUTH_KEYS = ["vixy_auth", "vixy_user_role", "vixy_admin_email", "vixy_user_email"];
let installed = false;
let checking = false;
const clearClientAuth = (reason: string) => {
  try {
    for (const k of AUTH_KEYS) localStorage.removeItem(k);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("vixy:session-expired", { detail: { reason } }));
  } catch {}
  try {
    const last = Number(sessionStorage.getItem("vixy_session_reload_at") || 0);
    if (Date.now() - last > 60000) {
      sessionStorage.setItem("vixy_session_reload_at", String(Date.now()));
      window.location.reload();
    }
  } catch {}
};
const serverSaysLoggedOut = async (): Promise<boolean> => {
  try {
    const r = await fetch("/api/account/me", { credentials: "include" });
    if (r.status === 401) return true;
    if (!r.ok) return false;
    const d = await r.json();
    return d?.authenticated === false;
  } catch {
    return false;
  }
};
export const verifySessionOnBoot = async (): Promise<void> => {
  try {
    if (!localStorage.getItem("vixy_auth")) return;
  } catch {
    return;
  }
  if (await serverSaysLoggedOut()) clearClientAuth("boot-check");
};
export const installSessionGuard = (): void => {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: any, init?: any) => {
    const res = await original(input, init);
    if (res.status === 401 && !checking) {
      let url = "";
      try {
        url = typeof input === "string" ? input : (input?.url ?? "");
      } catch {}
      if (url.indexOf("/api/") !== -1 && url.indexOf("/api/account/me") === -1) {
        checking = true;
        try {
          if (await serverSaysLoggedOut()) clearClientAuth("401");
        } finally {
          checking = false;
        }
      }
    }
    return res;
  };
  void verifySessionOnBoot();
};
