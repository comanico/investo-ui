/**
 * Sign-out sequence used by `src/lib/auth/client.ts`.
 *
 * Kept as a dependency-free module so `node --test` can cover it without a
 * browser or Better Auth.
 *
 * Live preview: the session is a bearer token we can drop locally. The popup
 * is already open during pre-sign-in, so the server call is bounded at 1.5s
 * and we always continue.
 *
 * Deployed: the session is an HttpOnly cookie only the server can clear.
 * Timing out or failing must reject so OAuth / a "signed out" redirect does
 * not run with the old session still live.
 */

/** @typedef {{
 *   livePreview: boolean,
 *   hasBearer: boolean,
 *   requestSignOut: () => Promise<unknown>,
 *   clearToken: () => void,
 * }} PreSignInSignOutInput */

/** @typedef {PreSignInSignOutInput & { redirect: () => void }} SignOutInput */

export const PREVIEW_SIGN_OUT_MS = 1500;
export const DEPLOYED_SIGN_OUT_MS = 8000;

/**
 * @param {Promise<unknown>} promise
 * @param {number} ms
 */
function withBudget(promise, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Sign-out timed out")), ms);
  });
  return Promise.race([Promise.resolve().then(() => promise), timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * @param {PreSignInSignOutInput} input
 * @param {{ redirect?: () => void }} [extra]
 */
async function settle({ livePreview, requestSignOut, clearToken }, extra = {}) {
  const budget = livePreview ? PREVIEW_SIGN_OUT_MS : DEPLOYED_SIGN_OUT_MS;
  try {
    await withBudget(requestSignOut(), budget);
    clearToken();
    extra.redirect?.();
  } catch (error) {
    if (livePreview) {
      clearToken();
      extra.redirect?.();
      return;
    }
    throw error;
  }
}

/** @param {PreSignInSignOutInput} input */
export async function runPreSignInSignOut(input) {
  await settle(input);
}

/** @param {SignOutInput} input */
export async function runSignOut(input) {
  await settle(input, { redirect: input.redirect });
}
