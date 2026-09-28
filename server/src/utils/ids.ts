import crypto from 'crypto';

export function generateApplicationId(existingIds: Set<string>, year = new Date().getFullYear()): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `SM-${year}-${crypto.randomInt(2000, 10000)}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `SM-${year}-${Date.now().toString().slice(-6)}`;
}

export function generateAuditId(): string {
  return `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateTransactionId(): string {
  return `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
