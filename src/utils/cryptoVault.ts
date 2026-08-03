// Web Crypto API PBKDF2 Passcode Hashing Utility for Private Vault

const SALT_KEY = "galleyar_vault_salt";
const VERIFIER_KEY = "galleyar_vault_verifier";

/**
 * Derives a PBKDF2 hash verifier from a numeric passcode string using Web Crypto API.
 */
async function derivePinVerifier(pin: string, saltBytes: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    pinData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Checks if a Vault PIN is configured in local storage.
 */
export function isPinConfigured(): boolean {
  try {
    const salt = localStorage.getItem(SALT_KEY);
    const verifier = localStorage.getItem(VERIFIER_KEY);
    return Boolean(salt && verifier);
  } catch {
    return false;
  }
}

/**
 * Configures or changes the Vault PIN by generating a cryptographic salt and storing the PBKDF2 verifier.
 */
export async function savePin(pin: string): Promise<boolean> {
  try {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const verifier = await derivePinVerifier(pin, salt);

    const saltHex = Array.from(salt)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    localStorage.setItem(SALT_KEY, saltHex);
    localStorage.setItem(VERIFIER_KEY, verifier);

    // Clean up any legacy plaintext PIN keys
    localStorage.removeItem("vaultPin");
    localStorage.removeItem("galleyar_vault_pin");
    return true;
  } catch (err) {
    console.error("Failed to save PIN", err);
    return false;
  }
}

/**
 * Verifies an entered PIN against the stored PBKDF2 verifier.
 */
export async function verifyPin(enteredPin: string): Promise<boolean> {
  try {
    const saltHex = localStorage.getItem(SALT_KEY);
    const storedVerifier = localStorage.getItem(VERIFIER_KEY);
    if (!saltHex || !storedVerifier) return false;

    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const enteredVerifier = await derivePinVerifier(enteredPin, saltBytes);
    return enteredVerifier === storedVerifier;
  } catch (err) {
    return false;
  }
}

/**
 * Removes the Vault PIN configuration.
 */
export function removePin(): void {
  try {
    localStorage.removeItem(SALT_KEY);
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem("vaultPin");
    localStorage.removeItem("galleyar_vault_pin");
  } catch {}
}
