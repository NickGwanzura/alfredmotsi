/**
 * Email Module - Main Exports
 * 
 * This module provides a comprehensive email system for Resend with:
 * - Beautifully branded templates
 * - Security best practices
 * - Deliverability optimization
 * - TypeScript support
 * 
 * @example
 * ```typescript
 * import { sendServiceConfirmation, sendPortalInvite } from '@/lib/email';
 * 
 * await sendServiceConfirmation({
 *   to: 'client@splashaircrmzw.site',
 *   customerName: 'John',
 *   serviceType: 'AC Installation',
 *   // ...
 * });
 * ```
 */

// ============================================
// BRANDED TEMPLATES (Recommended)
// ============================================

export {
  // Client Communication Templates
  ClientPortalInviteEmail,
  ServiceConfirmationEmail,
  ServiceCompletionEmail,
  StatusUpdateEmail,
  ReminderEmail,
  FollowUpEmail,
  WelcomeEmail,
  
  // Staff Communication Templates
  TechnicianAssignmentEmail,
  
  // Reusable Components
  StatusBadge,
  InfoBox,
  DetailCard,
  FeatureList,
  globalStyles,
  theme,
} from './templates-branded';

// ============================================
// BRANDED SEND FUNCTIONS (Recommended)
// ============================================

export {
  // Client Emails
  sendPortalInvite,
  sendServiceConfirmation,
  sendServiceCompletion,
  sendStatusUpdate,
  sendReminder,
  sendFollowUp,
  sendWelcome,
  
  // Staff Emails
  sendTechnicianAssignment,
  
  // Batch Helpers
  sendReminders,
  sendTechnicianAssignments,
} from './send-branded';

// ============================================
// LEGACY TEMPLATES (For backward compatibility)
// ============================================

export {
  JobScheduledEmail,
  JobCompletedEmail,
  PortalInviteEmail,
  TechAssignmentEmail,
  UserInviteEmail,
  StatusUpdateEmail as LegacyStatusUpdateEmail,
} from './templates-new';

// ============================================
// LEGACY SEND FUNCTIONS (For backward compatibility)
// ============================================

export {
  sendJobScheduledEmail,
  sendJobCompletedEmail,
  sendPortalInviteEmail,
  sendTechAssignmentEmail,
  sendUserInviteEmail,
  sendStatusUpdateEmail,
  sendCustomEmail,
} from './send';

// ============================================
// SECURITY TEMPLATES
// ============================================

export {
  SecureUserInvitationEmail,
  PasswordResetEmail,
  InvitationExpiredEmail,
  AccountSetupCompleteEmail,
} from './templates-secure';

// ============================================
// SECURE INVITATION SYSTEM
// ============================================

export {
  // Functions
  generateInvitationToken,
  createInvitation,
  validateInvitationToken,
  isInvitationExpired,
  isInvitationUsed,
  getInvitationTimeRemaining,
  
  // Types
  type Invitation,
  type InvitationResult,
  type ValidationResult,
} from './secure-invite';

// ============================================
// CORE UTILITIES
// ============================================

export {
  // Validation
  validateEmailContent,
  validateEmail,
  
  // Conversion
  htmlToText,
  generatePreviewText,
  generatePreheaderText,
  
  // Headers
  generateEmailHeaders,
  generateListUnsubscribeHeader,
  
  // Rate Limiting
  checkRateLimit,
  
  // Security
  generateSecureToken,
  sanitizeContent,
  
  // Configuration
  EMAIL_CONFIG,
} from './standards';

// ============================================
// RESEND CONFIGURATION
// ============================================

export {
  getResend,
  FROM_EMAIL,
  isEmailEnabled,
} from './resend';

// ============================================
// CORE SEND FUNCTION
// ============================================

export { sendEmailWithBestPractices } from './send';

// ============================================
// VERSION
// ============================================

export const EMAIL_MODULE_VERSION = '2.0.0';

// ============================================
// USAGE GUIDE
// ============================================

/**
 * QUICK START - Client Emails
 * 
 * ```typescript
 * import { sendServiceConfirmation } from '@/lib/email';
 * 
 * await sendServiceConfirmation({
 *   to: 'client@splashaircrmzw.site',
 *   customerName: 'John Smith',
 *   serviceType: 'AC Installation',
 *   serviceDate: 'April 15, 2026',
 *   serviceTime: '09:00 - 11:00',
 *   technicianName: 'Mike Johnson',
 *   technicianPhone: '+27 12 345 6789',
 *   address: '123 Main Street',
 *   referenceNumber: 'JOB-2026-001',
 *   portalUrl: 'https://splashaircrmzw.site/track/JOB-2026-001',
 * });
 * ```

 * QUICK START - Staff Emails
 * 
 * ```typescript
 * import { sendTechnicianAssignment } from '@/lib/email';
 * 
 * await sendTechnicianAssignment({
 *   to: 'tech@splashaircrmzw.site',
 *   technicianName: 'Mike',
 *   customerName: 'John Smith',
 *   serviceType: 'AC Installation',
 *   serviceDate: 'April 15, 2026',
 *   serviceTime: '09:00 - 11:00',
 *   address: '123 Main Street',
 *   jobDescription: 'Install new split system',
 *   referenceNumber: 'JOB-2026-001',
 * });
 * ```

 * SECURE INVITATIONS (Instead of password in email)
 * 
 * ```typescript
 * import { generateInvitationToken } from '@/lib/email';
 * 
 * const result = generateInvitationToken('user@splashaircrmzw.site', 'technician');
 * if (result.success) {
 *   // Store token hash in database
 *   await db.invitations.create({
 *     tokenHash: hashToken(result.token),
 *     email: 'user@splashaircrmzw.site',
 *     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
 *   });
 *   
 *   // Send secure invitation email
 *   await sendSecureInvitationEmail({
 *     to: 'user@splashaircrmzw.site',
 *     inviteUrl: result.inviteUrl,
 *   });
 * }
 * ```
 */
