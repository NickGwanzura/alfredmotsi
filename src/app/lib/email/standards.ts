/**
 * Email Standards & Best Practices Configuration
 * 
 * This module enforces Resend best practices for verified domains:
 * - CAN-SPAM compliance
 * - Deliverability optimization
 * - Security standards
 * - Brand consistency
 */

import { getResend, FROM_EMAIL } from './resend';

// ============================================
// COMPLIANCE CONFIGURATION
// ============================================

export const EMAIL_CONFIG = {
  // From address must use verified domain
  from: FROM_EMAIL,
  
  // Reply-to for customer responses
  replyTo: 'alfred@splashaircrmzw.site',
  
  // Company information (CAN-SPAM compliance)
  company: {
    name: 'Splash Air Conditioning',
    address: 'South Africa', // Update with actual physical address
    email: 'alfred@splashaircrmzw.site',
    website: 'https://splashaircrmzw.site',
    phone: '+27 (0) XX XXX XXXX', // Update with actual phone
  },
  
  // Unsubscribe settings
  unsubscribe: {
    // Transactional emails don't require unsubscribe, but good practice
    enabled: false, // Set to true for marketing emails
    url: 'https://splashaircrmzw.site/unsubscribe',
    email: 'unsubscribe@splashaircrmzw.site',
  },
} as const;

// ============================================
// DELIVERABILITY HEADERS
// ============================================

/**
 * Generate email headers for optimal deliverability
 * These headers help with SPF, DKIM, and DMARC alignment
 */
export function generateEmailHeaders(options?: {
  category?: string;
  campaignId?: string;
  isTransactional?: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = {
    // Identify as transactional (prevents spam flagging)
    'X-Email-Type': options?.isTransactional !== false ? 'transactional' : 'marketing',
    
    // Category for analytics
    'X-Category': options?.category || 'general',
    
    // Prevent threading issues
    'X-Auto-Response-Suppress': 'OOF, AutoReply',
    
    // Priority indication
    'X-Priority': '3', // Normal priority
    'X-MSMail-Priority': 'Normal',
    'Importance': 'normal',
  };
  
  // Add campaign tracking ID if provided
  if (options?.campaignId) {
    headers['X-Campaign-ID'] = options.campaignId;
  }
  
  return headers;
}

/**
 * Generate List-Unsubscribe header for marketing emails
 * Required by Gmail/Yahoo for bulk senders (Feb 2024)
 */
export function generateListUnsubscribeHeader(email: string): string {
  if (!EMAIL_CONFIG.unsubscribe.enabled) {
    return '';
  }
  
  const mailtoLink = `<mailto:${EMAIL_CONFIG.unsubscribe.email}?subject=unsubscribe ${email}>`;
  const webLink = `<${EMAIL_CONFIG.unsubscribe.url}?email=${encodeURIComponent(email)}>`;
  
  return `${mailtoLink}, ${webLink}`;
}

// ============================================
// EMAIL VALIDATION
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format');
  }
  
  // Check for common typos
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const commonTypos: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
  };
  
  if (commonTypos[domain]) {
    errors.push(`Possible typo: did you mean ${commonTypos[domain]}?`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email content before sending
 */
export function validateEmailContent(params: {
  to: string;
  subject: string;
  html: string;
}): ValidationResult {
  const errors: string[] = [];
  
  // Validate recipient
  const emailValidation = validateEmail(params.to);
  if (!emailValidation.valid) {
    errors.push(...emailValidation.errors);
  }
  
  // Validate subject
  if (!params.subject || params.subject.trim() === '') {
    errors.push('Subject is required');
  } else if (params.subject.length > 78) {
    errors.push('Subject should be 78 characters or less for optimal display');
  }
  
  // Check for spammy words
  const spamWords = ['viagra', 'cialis', 'lottery', 'winner', 'free money', 'click here'];
  const lowerSubject = params.subject.toLowerCase();
  const lowerHtml = params.html.toLowerCase();
  
  for (const word of spamWords) {
    if (lowerSubject.includes(word) || lowerHtml.includes(word)) {
      errors.push(`Content contains potential spam word: "${word}"`);
    }
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (params.subject.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    errors.push('Subject has too many exclamation marks (spam indicator)');
  }
  
  // Check for ALL CAPS
  const capsRatio = params.subject.replace(/[^a-zA-Z]/g, '').length > 0 
    ? params.subject.replace(/[^A-Z]/g, '').length / params.subject.replace(/[^a-zA-Z]/g, '').length 
    : 0;
  if (capsRatio > 0.7) {
    errors.push('Subject appears to be mostly ALL CAPS (spam indicator)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// TEXT VERSION GENERATION
// ============================================

/**
 * Convert HTML email to plain text
 * Essential for accessibility and spam score improvement
 */
export function htmlToText(html: string): string {
  return html
    // Replace headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n$1\n===\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n$1\n---\n')
    .replace(/<h[3-6][^>]*>(.*?)<\/h[3-6]>/gi, '\n\n$1\n')
    // Replace paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1')
    // Replace line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace links with text + URL
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    // Replace buttons with link text
    .replace(/<button[^>]*>(.*?)<\/button>/gi, '\n[$1]\n')
    // Replace list items
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n')
    // Replace horizontal rules
    .replace(/<hr[^>]*>/gi, '\n---\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// ============================================
// PREVIEW TEXT UTILITIES
// ============================================

const PREVIEW_TEXT_MAX_LENGTH = 100;
const PREVIEW_TEXT_MIN_LENGTH = 40;

/**
 * Generate optimal preview text from email content
 * Preview text appears after subject in email clients
 */
export function generatePreviewText(html: string, customPreview?: string): string {
  if (customPreview) {
    return truncatePreview(customPreview);
  }
  
  // Extract text from HTML
  const text = htmlToText(html)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return truncatePreview(text);
}

function truncatePreview(text: string): string {
  if (text.length <= PREVIEW_TEXT_MAX_LENGTH) {
    return text;
  }
  
  // Try to end at a sentence
  const truncated = text.substring(0, PREVIEW_TEXT_MAX_LENGTH);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > PREVIEW_TEXT_MIN_LENGTH) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  // Try to end at a word
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > PREVIEW_TEXT_MIN_LENGTH) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Generate hidden preheader text for email
 * This text is invisible but shows in email preview
 */
export function generatePreheaderText(previewText: string): string {
  // Add invisible characters to prevent body text from showing in preview
  const padding = '\u200C'.repeat(100);
  return `${previewText}${padding}`;
}

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Generate secure token for invitation links
 * Replaces sending passwords in email
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitize email content to prevent XSS
 */
export function sanitizeContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 50; // Max emails per hour per recipient

/**
 * Check if email sending should be rate limited
 */
export function checkRateLimit(to: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(to);
  
  if (!entry) {
    rateLimitMap.set(to, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  // Reset if window has passed
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(to, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  // Check limit
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.firstAttempt)) / 1000 / 60);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  entry.count++;
  return { allowed: true };
}

// ============================================
// FOOTER GENERATION
// ============================================

/**
 * Generate CAN-SPAM compliant footer
 */
export function generateFooter(): string {
  const { company, unsubscribe } = EMAIL_CONFIG;
  
  let footer = `
---
${company.name}
Professional HVAC Services
Email: ${company.email}
Website: ${company.website}
`;
  
  if (unsubscribe.enabled) {
    footer += `
To unsubscribe from these emails, visit: ${unsubscribe.url}
or email: ${unsubscribe.email}
`;
  }
  
  return footer;
}
