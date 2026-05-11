import { ReactElement } from 'react';
import { AnnouncementEmail } from '@/app/lib/email/templates-new';

/**
 * Announcement email template for the major data persistence fixes.
 * Sent to all users (admins + technicians).
 */
export function BigFixesEmail(params: {
  recipientName: string;
}): ReactElement {
  const { recipientName } = params;

  return AnnouncementEmail({
    recipientName,
    preview: 'Critical data integrity and audit trail improvements have been deployed.',
    headline: 'Important: Data Integrity & Audit Fixes Deployed',
    kind: 'update',
    intro:
      'We\'ve just completed a comprehensive set of backend fixes that significantly ' +
      'improve data accuracy, prevent data loss, and strengthen our audit capabilities. ' +
      'These changes protect the integrity of all business records.',
    callout: {
      title: 'What\'s been fixed',
      body:
        'Multiple critical issues in how the system persists and tracks data have been resolved. ' +
        'This ensures your data remains accurate, complete, and fully auditable.',
    },
    sections: [
      {
        title: '✅ Gas inventory is now accurate and race-condition-proof',
        bullets: [
          'Stock levels can never go negative — atomic updates prevent overselling',
          'Concurrent usage logs no longer create inventory discrepancies',
          'All gas transactions are fully atomic and reliable',
        ],
      },
      {
        title: '✅ User deletions preserve history (no more cascading data loss)',
        bullets: [
          'Deleting a user no longer removes their gas usage records, consumables, or audit logs',
          'Historical data is preserved with user set to null for accountability',
          'Business intelligence and compliance records remain intact',
        ],
      },
      {
        title: '✅ Diagnostic data is now saved correctly',
        bullets: [
          'Voltage, current, pressures, refrigerant quantities, and system status are persisted',
          'Comments and job history entries are stored reliably',
          'ODS reports now contain complete diagnostic information',
        ],
      },
      {
        title: '✅ Manual stock adjustments are fully audited',
        bullets: [
          'Admins can adjust stock levels with a reason',
          'Every adjustment is logged with full context (who, when, why, old→new)',
          'No more silent or lost correction records',
        ],
      },
      {
        title: '✅ Optimistic locking prevents concurrent edit conflicts',
        bullets: [
          'Jobs now have a version number',
          'If two people edit the same job simultaneously, the second is prompted to refresh',
          'No more silent overwrites of each other\'s changes',
        ],
      },
      {
        title: '✅ Comprehensive audit trail extended',
        bullets: [
          'Customer creation, gas stock changes, consumable additions, user management — all now audited',
          'Audit logs include IP and user-agent where available',
          'Full traceability of all significant system actions',
        ],
      },
      {
        title: '✅ Performance & reliability improvements',
        bullets: [
          'New database indexes on foreign keys speed up queries',
          'CHECK constraints prevent negative quantities at the database level',
          'Audit logging resilient with retry and local queue fallback',
        ],
      },
      {
        title: '✅ Job deletion is atomic and fully audited',
        bullets: [
          'Audit record and job deletion happen in a single transaction',
          'No chance of orphaned or missing audit entries on delete',
        ],
      },
    ],
    ctaLabel: 'Log into Splash Air CRM',
    ctaUrl: 'https://splashaircrmzw.site',
    closing:
      'These fixes were implemented to ensure your data is always accurate, complete, and secure. ' +
      'If you notice anything unusual or have questions about the changes, please reach out.',
  });
}
