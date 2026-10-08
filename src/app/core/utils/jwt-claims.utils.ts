interface JwtPayload {
  sub?: string;
  onboarding_completed?: string | boolean;
}

export function hasCompletedOnboarding(accessToken: string | null | undefined): boolean {
  const claims = readClaims(accessToken);
  return claims?.onboarding_completed === true || claims?.onboarding_completed === 'true';
}

// null if no token or it doesnt decode
export function tokenSubject(accessToken: string | null | undefined): string | null {
  return readClaims(accessToken)?.sub ?? null;
}

function readClaims(accessToken: string | null | undefined): JwtPayload | null {
  if (!accessToken) {
    return null;
  }

  try {
    const payload = accessToken.split('.')[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}
