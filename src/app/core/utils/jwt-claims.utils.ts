interface JwtPayload {
  onboarding_completed?: string | boolean;
}

export function hasCompletedOnboarding(accessToken: string | null | undefined): boolean {
  if (!accessToken) {
    return false;
  }

  try {
    const payload = accessToken.split('.')[1];
    if (!payload) {
      return false;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded)) as JwtPayload;
    return claims.onboarding_completed === true || claims.onboarding_completed === 'true';
  } catch {
    return false;
  }
}
