// Reads how a Supabase session was started from its access token. Kept apart from store.js so it can be tested.

// The ways in that prove someone can read the account's email. Coming in this way is how a forgotten password
// is replaced, so it is the only case where a new password may be set without giving the current one.
const EMAIL_LINK = new Set(['otp', 'magiclink', 'recovery']);

// True unless the token clearly says the session began with an emailed link. Anything missing, unreadable or
// unfamiliar counts as needing the current password: when in doubt, ask.
export function needsCurrentPassword(accessToken) {
  try {
    const claims = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    // "amr" lists the ways this session was authenticated; refreshing the session does not count as one.
    const ways = (claims.amr || []).filter((w) => w && w.method !== 'token_refresh').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return !(ways.length && EMAIL_LINK.has(ways[0].method));
  } catch (err) {
    return true;
  }
}
