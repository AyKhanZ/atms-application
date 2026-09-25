export function shouldRefreshAccessToken(expiresAt: string): boolean {
  const expiresAtMs = new Date(expiresAt).getTime();
  const refreshBeforeMs = 60_000;

  return !Number.isFinite(expiresAtMs) || expiresAtMs - Date.now() <= refreshBeforeMs;
}
