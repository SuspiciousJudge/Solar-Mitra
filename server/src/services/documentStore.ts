import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { ALLOWED_DOCUMENT_MIMES, MAX_DOCUMENT_BYTES } from '../validators/providerRules';
import { AppError } from '../utils/AppError';

const ROOT = path.resolve(process.cwd(), 'var', 'provider-docs');

function ensureRoot(): void {
  fs.mkdirSync(ROOT, { recursive: true });
}

export function documentPath(storedName: string): string {
  return path.join(ROOT, storedName);
}

export function assertSafeStoredName(storedName: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(storedName) || storedName.includes('..')) {
    throw new AppError(400, 'Invalid document reference');
  }
  return storedName;
}

export function extensionForMime(mime: string): string {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  return '';
}

export function assertUpload(file: { mimetype: string; size: number; originalname: string }): void {
  if (!(ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(file.mimetype)) {
    throw new AppError(400, 'Only PDF, JPG and PNG files are accepted');
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new AppError(400, 'Each file must be 5 MB or smaller');
  }
  if (!file.originalname || file.originalname.length > 180) {
    throw new AppError(400, 'Please choose a valid file');
  }
}

export function writeDocumentFile(buffer: Buffer, mime: string): string {
  ensureRoot();
  const storedName = `${crypto.randomBytes(16).toString('hex')}${extensionForMime(mime)}`;
  fs.writeFileSync(documentPath(storedName), buffer);
  return storedName;
}

export function readDocumentFile(storedName: string): Buffer | null {
  const safe = assertSafeStoredName(storedName);
  const file = documentPath(safe);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

export function deleteDocumentFile(storedName: string): void {
  try {
    const file = documentPath(assertSafeStoredName(storedName));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    if (!env.isTest) {
      /* ignore missing files on reset */
    }
  }
}

export function resetDocumentDir(): void {
  if (!fs.existsSync(ROOT)) return;
  for (const entry of fs.readdirSync(ROOT)) {
    fs.unlinkSync(path.join(ROOT, entry));
  }
}

/** Tiny valid PDF used as a demo placeholder (no personal data). */
export const PLACEHOLDER_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 200 80]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 40 Td (SolarMitra demo document) Tj ET\nendstream\nendobj\nxref\n0 5\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n0\n%%EOF\n',
);

/** 1×1 PNG. */
export const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
