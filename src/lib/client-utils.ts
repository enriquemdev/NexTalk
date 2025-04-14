/**
 * Generates a random string of specified length
 */
export function randomString(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Decodes a passphrase for E2EE (end-to-end encryption)
 */
export function decodePassphrase(urlFragment: string): string | undefined {
  if (!urlFragment) return undefined;
  try {
    return decodeURIComponent(urlFragment);
  } catch (e) {
    console.error('failed to decode e2ee URI fragment', e);
    return undefined;
  }
} 