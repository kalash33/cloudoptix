/**
 * Encrypts sensitive data (like cloud credentials)
 */
export declare function encrypt(text: string): string;
/**
 * Decrypts encrypted credential data
 */
export declare function decrypt(encryptedData: string): string;
/**
 * Encrypts a JSON object (for storing credentials)
 */
export declare function encryptCredentials(credentials: Record<string, string>): string;
/**
 * Decrypts credentials back to JSON object
 */
export declare function decryptCredentials(encryptedCredentials: string): Record<string, string>;
//# sourceMappingURL=encryption.d.ts.map