import { clearUserSessionData } from './supabase';

export interface AppUser {
  uid: string;
  email?: string;
  displayName?: string;
  isAnonymous?: boolean;
  avatarUrl?: string;
  getIdToken?: () => Promise<string>;
}

let activeGetToken: (() => Promise<string | null>) | null = null;
let activeSignOut: (() => Promise<void>) | null = null;

/**
 * Registers active Clerk auth handles so components can retrieve valid JWT tokens anywhere.
 */
export const registerAuthHandlers = (
  getToken: () => Promise<string | null>,
  signOut: () => Promise<void>
) => {
  activeGetToken = getToken;
  activeSignOut = signOut;
};

/**
 * Obtains the active Bearer token for API authentication.
 * Prioritizes verified Clerk session tokens, then guest sessions, with legacy session fallback.
 */
export const getAuthToken = async (): Promise<string> => {
  if (activeGetToken) {
    try {
      const token = await activeGetToken();
      if (token && token.trim() !== '') return token.trim();
    } catch (err) {
      console.warn('[Auth] Failed to acquire Clerk token:', err);
    }
  }

  // Check for guest user session
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const guestRaw = localStorage.getItem('yatra_guest_user');
      if (guestRaw) {
        const parsed = JSON.parse(guestRaw);
        if (parsed.uid) return String(parsed.uid);
      }
    }
  } catch {}

  return '';
};

/**
 * Safely logs out the user, terminating the Clerk session and wiping local storage caches.
 */
export const logoutUser = async (): Promise<void> => {
  if (activeSignOut) {
    try {
      await activeSignOut();
    } catch (err) {
      console.warn('[Auth] Error during Clerk sign-out:', err);
    }
  }

  clearUserSessionData();
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('yatra_guest_user');
  }
};
