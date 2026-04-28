import crypto from "node:crypto";
import { env } from "@/env/server";

export const encrypt = (input: string): string => {
    const iv = crypto.randomBytes(env.IV_LENGTH);

    const cipher = crypto.createCipheriv(
        env.ENCRYPTION_METHOD,
        crypto.scryptSync(env.ENCRYPTION_KEY, env.KDF_SALT, 32),
        iv,
    ) as crypto.CipherGCM;

    let encrypted = cipher.update(input, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`;
};

export const decrypt = (input: string): string => {
    const [ivHex, tagHex, encryptedText] = input.split(":");

    const decipher = crypto.createDecipheriv(
        env.ENCRYPTION_METHOD,
        crypto.scryptSync(env.ENCRYPTION_KEY, env.KDF_SALT, 32),
        Buffer.from(ivHex, "hex"),
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    return (
        decipher.update(encryptedText, "hex", "utf8") + decipher.final("utf8")
    );
};

export const hmacHash = (input: string): string => {
    return crypto
        .createHmac("sha256", env.HMAC_KEY)
        .update(input)
        .digest("hex");
}
