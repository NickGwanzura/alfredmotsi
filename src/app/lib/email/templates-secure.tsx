/**
 * Secure Email Templates
 * 
 * These templates replace the password-in-email approach with secure
 * token-based invitations. Use these instead of UserInviteEmail when
 * the secure invitation system is implemented.
 */

import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Row,
  Column,
} from '@react-email/components';

// Reuse brand styles from templates-new.tsx
const colors = {
  primary: '#0f62fe',
  primaryDark: '#0043ce',
  success: '#198038',
  warning: '#f1c21b',
  danger: '#da1e28',
  gray: {
    100: '#f4f4f4',
    200: '#e0e0e0',
    300: '#c6c6c6',
    400: '#a8a8a8',
    500: '#8d8d8d',
    600: '#6f6f6f',
    700: '#525252',
    800: '#393939',
    900: '#262626',
  }
};

const main = {
  backgroundColor: colors.gray[100],
  fontFamily: 'IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: colors.primary,
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '300',
  margin: '0',
  letterSpacing: '2px',
};

const tagline = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '12px',
  margin: '8px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '3px',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '48px 32px',
};

const h1 = {
  color: colors.gray[900],
  fontSize: '24px',
  fontWeight: '400',
  margin: '0 0 24px',
  letterSpacing: '-0.5px',
};

const paragraph = {
  color: colors.gray[700],
  fontSize: '14px',
  lineHeight: '1.7',
  margin: '0 0 16px',
};

const button = {
  backgroundColor: colors.primary,
  color: '#ffffff',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const buttonSecondary = {
  ...button,
  backgroundColor: 'transparent',
  color: colors.primary,
  border: `2px solid ${colors.primary}`,
};

const link = {
  color: colors.primary,
  textDecoration: 'none',
};

const divider = {
  borderColor: colors.gray[200],
  margin: '40px 0 24px',
};

const footer = {
  color: colors.gray[500],
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
  lineHeight: '1.6',
};

const footerLink = {
  color: colors.gray[600],
  textDecoration: 'none',
  margin: '0 12px',
  fontSize: '12px',
};

const alertBox = {
  backgroundColor: '#fff8e1',
  border: `1px solid ${colors.warning}`,
  padding: '16px 20px',
  margin: '20px 0',
};

const successBox = {
  backgroundColor: '#e8f5e9',
  border: `1px solid ${colors.success}`,
  padding: '16px 20px',
  margin: '20px 0',
};

const infoBox = {
  backgroundColor: '#e3f2fd',
  border: `1px solid ${colors.primary}`,
  padding: '16px 20px',
  margin: '20px 0',
};

const urlBox = {
  backgroundColor: colors.gray[100],
  padding: '16px',
  borderRadius: '4px',
  wordBreak: 'break-all' as const,
  fontSize: '12px',
  color: colors.gray[600],
  margin: '16px 0',
};

// ============================================
// SECURE USER INVITATION EMAIL (REPLACES UserInviteEmail)
// ============================================

interface SecureUserInvitationEmailProps {
  userName: string;
  userEmail: string;
  role: string;
  inviteUrl: string;
  expiresInHours?: number;
}

/**
 * SECURE INVITATION EMAIL
 * 
 * Use this template instead of UserInviteEmail to send secure token-based
 * invitations. This eliminates the security risk of sending passwords via email.
 * 
 * BENEFITS:
 * - No password in email (secure against interception)
 * - Token expires after set time (default: 24 hours)
 * - User sets their own password
 * - Token is single-use
 * 
 * REQUIRED: Implement secure-invite.ts token generation before using this template
 */
export function SecureUserInvitationEmail({
  userName,
  userEmail,
  role,
  inviteUrl,
  expiresInHours = 24,
}: SecureUserInvitationEmailProps) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return (
    <Html>
      <Head />
      <Preview>You're invited to join Splash Air as {roleDisplay}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Welcome to the Team</Heading>
            
            <Text style={paragraph}>Hi {userName},</Text>
            
            <Text style={paragraph}>
              You&apos;ve been invited to join Splash Air Conditioning as a <strong>{roleDisplay}</strong>. 
              We&apos;re excited to have you on board!
            </Text>
            
            <Section style={successBox}>
              <Text style={{ ...paragraph, margin: 0, color: colors.success }}>
                ✓ Your account has been created
              </Text>
            </Section>
            
            <Text style={paragraph}>
              Click the button below to set up your account and create your password. 
              This is a secure, one-time link that expires in {expiresInHours} hours.
            </Text>
            
            <Button style={button} href={inviteUrl}>
              Set Up Your Account
            </Button>
            
            <Text style={{ ...paragraph, fontSize: '12px', color: colors.gray[500] }}>
              Button not working? Copy and paste this link into your browser:
            </Text>
            
            <Section style={urlBox}>
              <Text style={{ margin: 0, fontFamily: 'monospace' }}>
                {inviteUrl}
              </Text>
            </Section>
            
            <Section style={alertBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Important:</strong> This link expires in {expiresInHours} hours and can only be used once. 
                If you don&apos;t set up your account in time, you&apos;ll need to request a new invitation.
              </Text>
            </Section>
            
            <Section style={infoBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Your login email:</strong> {userEmail}
              </Text>
            </Section>
            
            <Text style={paragraph}>
              After setting up your account, you&apos;ll have access to the Splash Air 
              Field Service Management System where you can view your assignments, 
              update job status, and communicate with the team.
            </Text>
            
            <Text style={paragraph}>
              If you have any questions or didn&apos;t expect this invitation, please 
              contact our support team at{' '}
              <a href="mailto:alfred@splashaircrmzw.site" style={link}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

interface PasswordResetEmailProps {
  userName: string;
  userEmail: string;
  resetUrl: string;
  expiresInHours?: number;
}

/**
 * PASSWORD RESET EMAIL
 * 
 * Secure password reset with time-limited token.
 * Similar to invitation but for existing users.
 */
export function PasswordResetEmail({
  userName,
  userEmail,
  resetUrl,
  expiresInHours = 1,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Splash Air password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Password Reset Request</Heading>
            
            <Text style={paragraph}>Hi {userName},</Text>
            
            <Text style={paragraph}>
              We received a request to reset the password for your Splash Air account 
              associated with <strong>{userEmail}</strong>.
            </Text>
            
            <Text style={paragraph}>
              Click the button below to reset your password. This link expires in {expiresInHours} hour{expiresInHours > 1 ? 's' : ''}.
            </Text>
            
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
            
            <Text style={{ ...paragraph, fontSize: '12px', color: colors.gray[500] }}>
              Button not working? Copy and paste this link:
            </Text>
            
            <Section style={urlBox}>
              <Text style={{ margin: 0, fontFamily: 'monospace' }}>
                {resetUrl}
              </Text>
            </Section>
            
            <Section style={alertBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Didn&apos;t request this?</strong> If you didn&apos;t request a password reset, 
                you can safely ignore this email. Your password will remain unchanged.
              </Text>
            </Section>
            
            <Text style={paragraph}>
              For security, this link will expire in {expiresInHours} hour{expiresInHours > 1 ? 's' : ''} and can only be used once. 
              After that, you&apos;ll need to request a new password reset.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// INVITATION EXPIRED NOTIFICATION
// ============================================

interface InvitationExpiredEmailProps {
  userName: string;
  userEmail: string;
  role: string;
  requestNewUrl?: string;
}

/**
 * INVITATION EXPIRED EMAIL
 * 
 * Sent when a user tries to use an expired invitation link.
 * Provides option to request a new invitation.
 */
export function InvitationExpiredEmail({
  userName,
  userEmail,
  role,
  requestNewUrl,
}: InvitationExpiredEmailProps) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return (
    <Html>
      <Head />
      <Preview>Your Splash Air invitation has expired</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Invitation Expired</Heading>
            
            <Text style={paragraph}>Hi {userName},</Text>
            
            <Text style={paragraph}>
              Your invitation to join Splash Air as a <strong>{roleDisplay}</strong> has expired.
            </Text>
            
            <Section style={alertBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                Invitations expire after 24 hours for security reasons.
              </Text>
            </Section>
            
            {requestNewUrl && (
              <>
                <Text style={paragraph}>
                  You can request a new invitation by clicking the button below:
                </Text>
                
                <Button style={buttonSecondary} href={requestNewUrl}>
                  Request New Invitation
                </Button>
              </>
            )}
            
            <Text style={paragraph}>
              If you&apos;re having trouble or didn&apos;t expect this invitation, 
              please contact our support team at{' '}
              <a href="mailto:alfred@splashaircrmzw.site" style={link}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// ACCOUNT SETUP COMPLETE EMAIL
// ============================================

interface AccountSetupCompleteEmailProps {
  userName: string;
  userEmail: string;
  role: string;
  loginUrl: string;
}

/**
 * ACCOUNT SETUP COMPLETE EMAIL
 * 
 * Confirmation sent after user successfully sets up their account.
 */
export function AccountSetupCompleteEmail({
  userName,
  userEmail,
  role,
  loginUrl,
}: AccountSetupCompleteEmailProps) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return (
    <Html>
      <Head />
      <Preview>Your Splash Air account is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Account Setup Complete</Heading>
            
            <Text style={paragraph}>Hi {userName},</Text>
            
            <Section style={successBox}>
              <Text style={{ ...paragraph, margin: 0, color: colors.success }}>
                ✓ Your account has been successfully set up
              </Text>
            </Section>
            
            <Text style={paragraph}>
              Your Splash Air <strong>{roleDisplay}</strong> account is now active and ready to use.
            </Text>
            
            <Section style={infoBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Login email:</strong> {userEmail}
              </Text>
            </Section>
            
            <Text style={paragraph}>
              You can now log in to access the Field Service Management System:
            </Text>
            
            <Button style={button} href={loginUrl}>
              Log In Now
            </Button>
            
            <Text style={paragraph}>
              Welcome to the team! If you have any questions, please don&apos;t hesitate to reach out.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>
                alfred@splashaircrmzw.site
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// All templates exported inline above
