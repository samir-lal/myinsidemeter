import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  usedBackupCode?: boolean;
}

/**
 * Generate a new 2FA secret and QR code for setup
 */
export function generateTwoFactorSecret(username: string): TwoFactorSetup {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `InsideMeter Admin (${username})`,
    issuer: 'InsideMeter',
    length: 32,
  });

  // Generate backup codes (10 random 8-digit codes)
  const backupCodes = Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url!,
    backupCodes,
  };
}

/**
 * Generate QR code data URL for display
 */
export async function generateQRCodeDataUrl(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token or backup code
 */
export function verifyTwoFactorToken(
  token: string,
  secret: string,
  backupCodes: string[] = []
): TwoFactorVerification {
  // Clean the token (remove spaces, convert to uppercase)
  const cleanToken = token.replace(/\s/g, '').toUpperCase();

  // First, try to verify as TOTP token
  const totpValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: cleanToken,
    window: 2, // Allow 2 time steps (30s each) of variance
  });

  if (totpValid) {
    return { isValid: true, usedBackupCode: false };
  }

  // If TOTP fails, check backup codes
  const backupCodeValid = backupCodes.includes(cleanToken);
  
  return {
    isValid: backupCodeValid,
    usedBackupCode: backupCodeValid,
  };
}

/**
 * Generate new backup codes (when user requests regeneration)
 */
export function generateNewBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

/**
 * Remove a used backup code from the list
 */
export function removeUsedBackupCode(backupCodes: string[], usedCode: string): string[] {
  return backupCodes.filter(code => code !== usedCode.toUpperCase());
}

/**
 * Check if user has low backup codes (< 3 remaining)
 */
export function hasLowBackupCodes(backupCodes: string[]): boolean {
  return backupCodes.length < 3;
}