import dotenv from 'dotenv';
dotenv.config();

const mockApiEnabled = process.env.MOCK_API !== 'false';

export const env = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  testEmail: mockApiEnabled ? 'qa@example.test' : process.env.TEST_EMAIL || '',
  testPassword: mockApiEnabled ? 'MockPassword123!' : process.env.TEST_PASSWORD || '',
  registrationName: mockApiEnabled ? 'QA Tester' : process.env.REGISTRATION_NAME || '',
  registrationEmail: mockApiEnabled ? 'new-member@example.test' : process.env.REGISTRATION_EMAIL || '',
  registrationPassword: mockApiEnabled ? 'MockPassword123!' : process.env.REGISTRATION_PASSWORD || '',
};

export const baseUrl = env.baseUrl;
export const apiBaseUrl = env.apiBaseUrl;
export const testEmail = env.testEmail;
export const testPassword = env.testPassword;

function isConfiguredEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPlaceholder(value: string): boolean {
  return /^(อีเมล|รหัสผ่าน|password|email|ที่มีอยู่จริง|สำหรับ|qa-)/i.test(value.trim());
}

export function hasRegistrationAccount(): boolean {
  if (process.env.MOCK_API !== 'false') {
    return true;
  }
  return Boolean(
    env.registrationName &&
    isConfiguredEmail(env.registrationEmail) &&
    env.registrationPassword &&
    !isPlaceholder(env.registrationEmail) &&
    !isPlaceholder(env.registrationPassword)
  );
}

export function uniqueEmail(): string {
  return `test_${Date.now()}@example.com`;
}

export function uniqueRegistrationEmail(): string {
  const configuredEmail = env.registrationEmail.trim().toLowerCase();
  const separator = configuredEmail.includes('@') ? configuredEmail.indexOf('@') : -1;
  if (separator > 0) {
    const localPart = configuredEmail.slice(0, separator);
    const domain = configuredEmail.slice(separator + 1);
    return `${localPart}+pw-${Date.now()}@${domain}`;
  }
  return uniqueEmail();
}

export const STRONG_PASSWORD = 'Str0ng!Passw0rd#2026';
export const MAX_UPLOAD_MB = 5;

export function hasTestAccount(): boolean {
  if (process.env.MOCK_API !== 'false') {
    return true;
  }
  return Boolean(
    isConfiguredEmail(env.testEmail) &&
    env.testPassword &&
    !isPlaceholder(env.testEmail) &&
    !isPlaceholder(env.testPassword)
  );
}