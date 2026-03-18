import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getRawKeyString(): string {
  const key =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.TOKEN_ENC_KEY?.trim();

  if (!key) {
    throw new Error(
      "Missing encryption key. Set ENCRYPTION_KEY (64-char hex) or TOKEN_ENC_KEY (base64 32-byte key)."
    );
  }

  return key;
}

function getKey(): Buffer {
  const raw = getRawKeyString();

  // Support 64-char hex key
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // Support base64-encoded 32-byte key
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) {
      return buf;
    }
  } catch {
    // ignore and throw below
  }

  throw new Error(
    "Encryption key must be either a 64-char hex string or a base64-encoded 32-byte key."
  );
}

/**
 * Output format:
 * base64(iv) : base64(authTag) : base64(ciphertext)
 */
export async function encrypt(plainText: string): Promise<string> {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export async function decrypt(payload: string): Promise<string> {
  const key = getKey();

  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format.");
  }

  const [ivB64, authTagB64, encryptedB64] = parts;

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length.");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}