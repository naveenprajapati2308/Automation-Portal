/** Best-effort read of the logged-in user's email straight out of the JWT stored by the shell
 * (automationPortalAuth.accessToken) — no network round trip, just a base64 payload decode. */
export function currentUserEmail() {
  try {
    const session = JSON.parse(localStorage.getItem('automationPortalAuth') || 'null');
    const token = session?.accessToken;
    if (!token) return '';
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json.email || '';
  } catch {
    return '';
  }
}
