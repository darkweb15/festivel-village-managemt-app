/**
 * Marker for "this session was just minted from a one-time recovery link".
 *
 * `/auth/confirm` sets it only after Supabase has verified the emailed token,
 * and `/admin/account` reads it to allow a password change without the old
 * password — which is the whole purpose of a reset link.
 *
 * It is httpOnly, so page scripts cannot read or forge it, and short-lived, so
 * a recovery landing that is left open does not stay privileged. The cookie is
 * deleted the moment the password is actually changed.
 */
export const RECOVERY_COOKIE = "sv_pw_recovery";

/** Long enough to choose a password, short enough not to linger. */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;

export const RECOVERY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: RECOVERY_COOKIE_MAX_AGE,
} as const;
