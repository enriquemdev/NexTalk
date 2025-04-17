import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a secure random token for invitation links.
 * @param length Length of the token (default: 32)
 * @returns A random string token
 */
export function generateRandomToken(length: number = 32): string {
  if (typeof window === 'undefined') {
    // Node.js environment
    // Use dynamic import to avoid require()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = eval('require("crypto")');
    return crypto.randomBytes(length).toString('hex');
  } else {
    // Browser environment
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}
