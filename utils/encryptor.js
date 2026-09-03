
// ------------------------------------------------
// encryptor.js
// AES-256-GCM encryption for sensitive data
// Used for provider API keys stored in DB
// ------------------------------------------------

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Encrypt sensitive string (API keys etc)
const encrypt = (text) => {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

// Decrypt encrypted string
const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const buffer = Buffer.from(encryptedText, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (error) {
    console.log('Decryption error:', error.message);
    return '';
  }
};

module.exports = { encrypt, decrypt };