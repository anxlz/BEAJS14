import crypto from "node:crypto";
import { ENC_KEY, IV_LENGTH } from "../../config.js";

export const encryption = async (plaintext: string): Promise<string> => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipherIv = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);
    let cipherText = cipherIv.update(plaintext, "utf-8", "hex");
    cipherText += cipherIv.final("hex");
    return `${iv.toString("hex")}::${cipherText}`;
};

export const decryption = async (cipherText: string): Promise<string> => {
    const [hexIV, encryptedData] = cipherText.split("::");
    const iv = Buffer.from(hexIV as string, "hex");
    const decipherIv = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, iv);
    let plaintext = decipherIv.update(encryptedData as string, "hex", "utf-8");
    plaintext += decipherIv.final("utf-8");
    return plaintext;
};
