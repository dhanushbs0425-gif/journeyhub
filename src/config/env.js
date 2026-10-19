/**
 * Centralized Environment Configuration Loader & Safe Diagnostics
 *
 * Ensures .env is properly discovered and loaded whether located in:
 * 1. backend/.env (Backend directory: C:\Users\Dhanush Kumar\.gemini\antigravity\scratch\journeyhub\backend\.env)
 * 2. .env (Project root directory: C:\Users\Dhanush Kumar\.gemini\antigravity\scratch\journeyhub\.env)
 *
 * Provides safe server-side diagnostics for Gmail SMTP configuration.
 * NEVER leaks secret App Passwords.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function sanitizeEnvValue(val) {
  if (val === undefined || val === null) return '';
  let str = val.toString().trim();
  // Strip surrounding double or single quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

function getCandidateEnvPaths() {
  const rootDir = path.resolve(__dirname, '../../');
  return [
    path.join(rootDir, 'backend', '.env'),
    path.join(rootDir, '.env'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env')
  ];
}

function loadEnv() {
  const candidates = getCandidateEnvPaths();
  let foundAny = false;

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const parsed = dotenv.parse(envContent);
        for (const [key, rawVal] of Object.entries(parsed)) {
          // Preserve test environment overrides during test execution
          if (process.env.NODE_ENV === 'test' && process.env[key] !== undefined) {
            continue;
          }
          const val = sanitizeEnvValue(rawVal);
          if (val !== '') {
            process.env[key] = val;
          } else if (!process.env[key]) {
            process.env[key] = '';
          }
        }
        foundAny = true;
      } catch (e) {
        console.warn(`[ENV] Failed to parse ${envPath}:`, e.message);
      }
    }
  }

  return foundAny;
}

// Initial load on require
loadEnv();

/**
 * Return safe diagnostics regarding environment loading and Gmail SMTP variables.
 * NEVER prints or leaks the secret SMTP_PASS / App Password.
 */
function getEnvDiagnostics() {
  // Re-read .env files to ensure we have the latest state on disk
  loadEnv();

  const rootDir = path.resolve(__dirname, '../../');
  const backendEnvPath = path.join(rootDir, 'backend', '.env');
  const rootEnvPath = path.join(rootDir, '.env');

  const backendEnvExists = fs.existsSync(backendEnvPath);
  const rootEnvExists = fs.existsSync(rootEnvPath);

  const smtpHost = sanitizeEnvValue(process.env.SMTP_HOST) || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = sanitizeEnvValue(process.env.SMTP_USER);
  const smtpPass = sanitizeEnvValue(process.env.SMTP_PASS);
  const smtpSecure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || smtpPort === 465;

  const hasSmtpUser = Boolean(smtpUser && smtpUser.includes('@') && !smtpUser.includes('your_'));
  const hasSmtpPass = Boolean(
    smtpPass &&
    smtpPass.length >= 8 &&
    !smtpPass.includes('your_') &&
    !smtpPass.includes('xxxx') &&
    !smtpPass.includes('placeholder')
  );

  const isConfigured = Boolean(smtpHost && hasSmtpUser && hasSmtpPass);

  // MSG91 SMS Service Diagnostics
  const msg91AuthKey = sanitizeEnvValue(process.env.MSG91_AUTH_KEY);
  const msg91TemplateId = sanitizeEnvValue(process.env.MSG91_TEMPLATE_ID);
  const msg91SenderId = sanitizeEnvValue(process.env.MSG91_SENDER_ID);
  const hasMsg91AuthKey = Boolean(msg91AuthKey && msg91AuthKey.length >= 8 && !msg91AuthKey.includes('your_'));
  const hasMsg91TemplateId = Boolean(msg91TemplateId && msg91TemplateId.length >= 4 && !msg91TemplateId.includes('your_'));
  const isMsg91Configured = Boolean(hasMsg91AuthKey && hasMsg91TemplateId);
  const msg91AuthKeyMasked = hasMsg91AuthKey
    ? msg91AuthKey.slice(0, 4) + '••••••••' + msg91AuthKey.slice(-4)
    : '';

  let activeEnvFile = '(none)';
  if (backendEnvExists) {
    activeEnvFile = backendEnvPath;
  } else if (rootEnvExists) {
    activeEnvFile = rootEnvPath;
  }

  const maskedUser = smtpUser && smtpUser.includes('@')
    ? smtpUser.replace(/^(.)(.*)(@.*)$/, (_, first, middle, rest) => first + '••••' + rest)
    : '';

  return {
    isConfigured,
    backendEnvPath,
    backendEnvExists,
    rootEnvPath,
    rootEnvExists,
    activeEnvFile,
    smtpHost,
    smtpPort,
    smtpSecure,
    hasSmtpUser,
    smtpUserMasked: maskedUser,
    hasSmtpPass,
    smtpPassLength: smtpPass.length,
    hasAuthKey: hasMsg91AuthKey,
    hasTemplateId: hasMsg91TemplateId,
    authKeyLength: msg91AuthKey.length,
    templateIdLength: msg91TemplateId.length,
    isMsg91Configured,
    msg91AuthKeyMasked,
    msg91TemplateId: msg91TemplateId || '',
    msg91SenderId: msg91SenderId || '',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

module.exports = {
  loadEnv,
  getCandidateEnvPaths,
  sanitizeEnvValue,
  getEnvDiagnostics
};
