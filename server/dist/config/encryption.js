"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptCredentials = encryptCredentials;
exports.decryptCredentials = decryptCredentials;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}
/**
 * Encrypts sensitive data (like cloud credentials)
 */
function encrypt(text) {
    const key = getEncryptionKey();
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Return IV + AuthTag + Encrypted data (all hex encoded)
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
}
/**
 * Decrypts encrypted credential data
 */
function decrypt(encryptedData) {
    const key = getEncryptionKey();
    // Extract IV, AuthTag, and encrypted text
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Encrypts a JSON object (for storing credentials)
 */
function encryptCredentials(credentials) {
    return encrypt(JSON.stringify(credentials));
}
/**
 * Decrypts credentials back to JSON object
 */
function decryptCredentials(encryptedCredentials) {
    return JSON.parse(decrypt(encryptedCredentials));
}
//# sourceMappingURL=encryption.js.map