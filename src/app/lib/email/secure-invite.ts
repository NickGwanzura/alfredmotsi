/**
 * Secure Token-Based Invitation System
 * 
 * This module provides a secure alternative to sending passwords via email.
 * Instead of sending plain-text passwords, we send a secure link with a
 * time-limited token that allows users to set their own password.
 * 
 * SECURITY BENEFITS:
 * - No passwords in email (resistant to interception)
 * - Token expires after set time (default: 24 hours)
 * - Token is single-use (invalidated after first use)
 * - Token is hashed in database (resistant to DB leaks)
 * 
 * USAGE:
 * 1. Generate invitation: generateInvitationToken(email, role)
 * 2. Send email with secure link containing token
 * 3. User visits link, token is validated
 * 4. User sets their password
 * 5. Token is invalidated
 */

import { createHash, randomBytes } from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const INVITE_CONFIG = {
  // Token expiration time (24 hours in milliseconds)
  EXPIRY_MS: 24 * 60 * 60 * 1000,
  
  // Token length in bytes (results in hex string 2x length)
  TOKEN_BYTES: 32,
  
  // Base URL for invitation links
  get BASE_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://splashaircrmzw.site';
  },
  
  // Invitation path
  INVITE_PATH: '/auth/invite',
} as const;

// ============================================
// TYPES
// ============================================

export interface Invitation {
  token: string;        // The secure token (sent to user)
  tokenHash: string;    // Hashed token (stored in DB)
  email: string;        // User's email
  role: string;         // User's role
  expiresAt: Date;      // Token expiration
  usedAt?: Date;        // When token was used
  createdAt: Date;      // When token was created
}

export interface InvitationResult {
  success: boolean;
  token?: string;       // The raw token (only available once, when created)
  inviteUrl?: string;   // Full URL to send to user
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  invitation?: Omit<Invitation, 'token'>;
  error?: string;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return randomBytes(INVITE_CONFIG.TOKEN_BYTES).toString('hex');
}

/**
 * Hash a token for database storage
 * We never store raw tokens, only their hashes
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ============================================
// INVITATION CREATION
// ============================================

/**
 * Generate a new secure invitation
 * 
 * @param email - User's email address
 * @param role - User's role (technician, admin, etc.)
 * @returns InvitationResult with token and URL
 * 
 * EXAMPLE USAGE:
 * ```typescript
 * const result = generateInvitationToken('user@splashaircrmzw.site', 'technician');
 * if (result.success && result.token) {
 *   await sendInvitationEmail(email, result.inviteUrl);
 *   await saveInvitationToDB({
 *     tokenHash: hashToken(result.token),
 *     email,
 *     role,
 *     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
 *   });
 * }
 * ```
 */
export function generateInvitationToken(
  email: string, 
  role: string
): InvitationResult {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!role) {
      return { success: false, error: 'Role is required' };
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Generate secure token
    const token = generateSecureToken();
    
    // Build invitation URL
    const inviteUrl = `${INVITE_CONFIG.BASE_URL}${INVITE_CONFIG.INVITE_PATH}?token=${token}`;
    
    return {
      success: true,
      token,        // ⚠️ ONLY RETURNED ONCE - store securely or send immediately
      inviteUrl,
    };
  } catch (error) {
    console.error('Error generating invitation token:', error);
    return { success: false, error: 'Failed to generate invitation' };
  }
}

/**
 * Create full invitation object for database storage
 */
export function createInvitation(email: string, role: string): Invitation | null {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  
  return {
    token,  // This is returned but should be sent immediately, not stored
    tokenHash,
    email: email.toLowerCase().trim(),
    role,
    expiresAt: new Date(Date.now() + INVITE_CONFIG.EXPIRY_MS),
    createdAt: new Date(),
  };
}

// ============================================
// TOKEN VALIDATION
// ============================================

/**
 * Validate an invitation token
 * 
 * @param token - The token from the URL
 * @param storedInvitation - The invitation data from database
 * @returns ValidationResult indicating if token is valid
 * 
 * EXAMPLE USAGE:
 * ```typescript
 * const stored = await db.invitations.findOne({ email });
 * const result = validateInvitationToken(tokenFromUrl, stored);
 * if (result.valid) {
 *   // Allow user to set password
 * } else {
 *   // Show error: "Invalid or expired invitation"
 * }
 * ```
 */
export function validateInvitationToken(
  token: string,
  storedInvitation: Pick<Invitation, 'tokenHash' | 'expiresAt' | 'usedAt'> | null
): ValidationResult {
  // Check if invitation exists
  if (!storedInvitation) {
    return { valid: false, error: 'Invalid invitation' };
  }
  
  // Check if already used
  if (storedInvitation.usedAt) {
    return { valid: false, error: 'Invitation has already been used' };
  }
  
  // Check expiration
  if (new Date() > new Date(storedInvitation.expiresAt)) {
    return { valid: false, error: 'Invitation has expired' };
  }
  
  // Verify token hash
  const tokenHash = hashToken(token);
  if (tokenHash !== storedInvitation.tokenHash) {
    return { valid: false, error: 'Invalid invitation token' };
  }
  
  return { valid: true };
}

// ============================================
// DATABASE SCHEMA (for reference)
// ============================================

/**
 * SQL Schema for invitations table:
 * 
 * ```sql
 * CREATE TABLE user_invitations (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash
 *   email VARCHAR(255) NOT NULL,
 *   role VARCHAR(50) NOT NULL,
 *   expires_at TIMESTAMP NOT NULL,
 *   used_at TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   created_by UUID REFERENCES users(id)
 * );
 * 
 * CREATE INDEX idx_invitations_email ON user_invitations(email);
 * CREATE INDEX idx_invitations_token_hash ON user_invitations(token_hash);
 * CREATE INDEX idx_invitations_expires_at ON user_invitations(expires_at);
 * ```
 * 
 * MongoDB Schema:
 * ```javascript
 * {
 *   tokenHash: String,      // Indexed, unique
 *   email: String,          // Indexed
 *   role: String,
 *   expiresAt: Date,        // TTL index
 *   usedAt: Date,
 *   createdAt: Date,
 *   createdBy: ObjectId
 * }
 * ```
 */

// ============================================
// CLEANUP UTILITIES
// ============================================

/**
 * Check if an invitation is expired
 */
export function isInvitationExpired(invitation: Pick<Invitation, 'expiresAt'>): boolean {
  return new Date() > new Date(invitation.expiresAt);
}

/**
 * Check if an invitation has been used
 */
export function isInvitationUsed(invitation: Pick<Invitation, 'usedAt'>): boolean {
  return !!invitation.usedAt;
}

/**
 * Get time remaining before expiration (in minutes)
 */
export function getInvitationTimeRemaining(
  invitation: Pick<Invitation, 'expiresAt'>
): number {
  const now = new Date().getTime();
  const expires = new Date(invitation.expiresAt).getTime();
  return Math.max(0, Math.floor((expires - now) / 1000 / 60));
}

// ============================================
// MIGRATION GUIDE
// ============================================

/**
 * MIGRATING FROM PASSWORD-IN-EMAIL:
 * 
 * OLD FLOW (insecure):
 * 1. Generate random password
 * 2. Create user with password
 * 3. Send password in email
 * 4. User logs in with password
 * 
 * NEW FLOW (secure):
 * 1. Create user WITHOUT password (or with random, unknown password)
 * 2. Generate invitation token
 * 3. Store token hash in database
 * 4. Send invitation email with secure link
 * 5. User clicks link (token validated)
 * 6. User sets their own password
 * 7. Token marked as used
 * 
 * IMPLEMENTATION STEPS:
 * 1. Create invitations table/collection
 * 2. Implement API endpoint: POST /api/invitations
 * 3. Implement API endpoint: GET /api/invitations/validate?token=xxx
 * 4. Implement API endpoint: POST /api/invitations/accept
 * 5. Create invitation email template
 * 6. Create invitation acceptance page
 * 7. Update user creation flow
 * 8. Test and deploy
 */

// ============================================
// EXAMPLE IMPLEMENTATION
// ============================================

/**
 * EXAMPLE: API Route for creating invitations
 * 
 * ```typescript
 * // app/api/invitations/route.ts
 * import { generateInvitationToken } from '@/lib/email/secure-invite';
 * 
 * export async function POST(req: Request) {
 *   const { email, role } = await req.json();
 *   
 *   // Generate token
 *   const result = generateInvitationToken(email, role);
 *   if (!result.success) {
 *     return Response.json({ error: result.error }, { status: 400 });
 *   }
 *   
 *   // Store hash in database (pseudocode)
 *   await db.invitations.create({
 *     tokenHash: hashToken(result.token!),
 *     email,
 *     role,
 *     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
 *   });
 *   
 *   // Send invitation email
 *   await sendSecureInvitationEmail(email, result.inviteUrl!, role);
 *   
 *   return Response.json({ success: true });
 * }
 * ```
 */

/**
 * EXAMPLE: Invitation email template
 * 
 * ```typescript
 * // templates/SecureInvitationEmail.tsx
 * interface Props {
 *   userName: string;
 *   role: string;
 *   inviteUrl: string;
 *   expiresIn: string;
 * }
 * 
 * export function SecureInvitationEmail({ userName, role, inviteUrl, expiresIn }: Props) {
 *   return (
 *     <Html>
 *       <Preview>You're invited to join Splash Air as {role}</Preview>
 *       <Body>
 *         <Container>
 *           <Heading>Welcome to Splash Air</Heading>
 *           <Text>Hi {userName},</Text>
 *           <Text>
 *             You've been invited to join Splash Air as a {role}. 
 *             Click the button below to set up your account.
 *           </Text>
 *           <Button href={inviteUrl}>Set Up Your Account</Button>
 *           <Text>
 *             This link will expire in {expiresIn}. If you didn't request this, 
 *             please ignore this email.
 *           </Text>
 *           <Text>
 *             Or copy and paste this URL: {inviteUrl}
 *           </Text>
 *         </Container>
 *       </Body>
 *     </Html>
 *   );
 * }
 * ```
 */
