import { AsyncLocalStorage } from "node:async_hooks";

/**
 * @typedef {Object} CaptureStorage
 * @property {(data: { token: string, url: string }) => void} resolveMagicLink
 * @property {(data: string) => void} resolveOTP
 */

/** 
 * Bit of a magic hack to pass the generated magicLink+token or OTP around.
 * 
 * `resolveMagicLink` and `resolveOTP` **MUST** be set before calling the respective plugin endpoints
 * 
 * @type {AsyncLocalStorage<CaptureStorage>}
 */
export const authCaptureStorage = new AsyncLocalStorage();
