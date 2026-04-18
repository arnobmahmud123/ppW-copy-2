import crypto from "crypto";

const DEFAULT_PASSPHRASE = process.env.APP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "local-dev-key";

function getKeyMaterial() {
  return crypto.scryptSync(DEFAULT_PASSPHRASE, "ppw-messaging-security", 32);
}

export function encryptString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKeyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [ivHex, encryptedHex] = value.split(":");
  if (!ivHex || !encryptedHex) {
    return value;
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getKeyMaterial(),
      Buffer.from(ivHex, "hex")
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function getSecurityPosture() {
  return {
    encryptionAtRestEnabled: Boolean(process.env.APP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET),
    ssoProviders: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      microsoft: Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID),
    },
    compliance: {
      gdpr: true,
      hipaa: process.env.HIPAA_MODE === "true",
      auditLogging: true,
      dataEncryption: true,
    },
  };
}
