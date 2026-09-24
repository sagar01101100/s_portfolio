import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error('Usage: node encrypt-private-image.mjs <source> <destination>');
}

const lines = [];
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  lines.push(line);
  if (lines.length === 2) {
    input.close();
    break;
  }
}

const [username, password] = lines;
if (!username || !password) throw new Error('Username and password are required on stdin.');

const magic = Buffer.from('SPS1');
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(Buffer.from(`${username}\0${password}`, 'utf8'), salt, 250000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
cipher.setAAD(magic);
const sourceBytes = readFileSync(resolve(source));
const encrypted = Buffer.concat([cipher.update(sourceBytes), cipher.final()]);
const packed = Buffer.concat([magic, salt, iv, encrypted, cipher.getAuthTag()]);

const verify = (candidateKey) => {
  const decipher = createDecipheriv('aes-256-gcm', candidateKey, iv);
  decipher.setAAD(magic);
  decipher.setAuthTag(packed.subarray(-16));
  return Buffer.concat([decipher.update(packed.subarray(32, -16)), decipher.final()]);
};

if (!verify(key).equals(sourceBytes)) throw new Error('Encrypted image verification failed.');
const wrongKey = pbkdf2Sync(Buffer.from(`${username}\0${password}!`, 'utf8'), salt, 250000, 32, 'sha256');
let wrongCredentialsRejected = false;
try { verify(wrongKey); } catch { wrongCredentialsRejected = true; }
if (!wrongCredentialsRejected) throw new Error('Incorrect credentials were not rejected.');

mkdirSync(dirname(resolve(destination)), { recursive: true });
writeFileSync(resolve(destination), packed, { mode: 0o644 });
process.stdout.write('Credential verification passed.\n');
