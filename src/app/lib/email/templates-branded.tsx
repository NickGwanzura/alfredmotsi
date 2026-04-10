/**
 * Branded Email Templates
 * 
 * A comprehensive collection of beautifully designed email templates
 * for client communications, notifications, and invitations.
 * 
 * Design System:
 * - Clean, modern aesthetic with professional HVAC industry styling
 * - Accessible color contrast (WCAG compliant)
 * - Mobile-first responsive design
 * - Consistent branding across all touchpoints
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
  Img,
  Row,
  Column,
  Link,
} from '@react-email/components';

// ============================================
// DESIGN SYSTEM
// ============================================

const theme = {
  colors: {
    // Primary brand colors
    primary: '#0ea5e9',        // Sky blue (HVAC/air feel)
    primaryDark: '#0284c7',    // Darker sky
    primaryLight: '#e0f2fe',   // Light sky background
    
    // Secondary accents
    accent: '#f59e0b',         // Amber/warmth
    accentDark: '#d97706',     // Darker amber
    
    // Status colors
    success: '#10b981',        // Emerald
    warning: '#f59e0b',        // Amber
    error: '#ef4444',          // Red
    info: '#0ea5e9',           // Sky
    
    // Neutral grays
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    
    // Background
    background: '#f8fafc',
    surface: '#ffffff',
  },
  
  fonts: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    mono: 'JetBrains Mono, Consolas, monospace',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
};

// ============================================
// GLOBAL STYLES
// ============================================

const globalStyles = {
  main: {
    backgroundColor: theme.colors.background,
    fontFamily: theme.fonts.sans,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  
  container: {
    margin: '0 auto',
    padding: `${theme.spacing.xl} ${theme.spacing.md}`,
    maxWidth: '600px',
  },
  
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  },
  
  header: {
    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
    padding: `${theme.spacing['2xl']} ${theme.spacing.xl}`,
    textAlign: 'center' as const,
  },
  
  logo: {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: '700',
    margin: '0',
    letterSpacing: '-0.5px',
  },
  
  logoIcon: {
    display: 'inline-block',
    marginRight: '8px',
    fontSize: '28px',
  },
  
  tagline: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    margin: `${theme.spacing.sm} 0 0`,
    fontWeight: '400',
    letterSpacing: '0.5px',
  },
  
  content: {
    padding: `${theme.spacing['2xl']} ${theme.spacing.xl}`,
  },
  
  heading1: {
    color: theme.colors.gray[900],
    fontSize: '28px',
    fontWeight: '700',
    margin: `0 0 ${theme.spacing.lg}`,
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
  },
  
  heading2: {
    color: theme.colors.gray[800],
    fontSize: '20px',
    fontWeight: '600',
    margin: `${theme.spacing.xl} 0 ${theme.spacing.md}`,
    lineHeight: '1.3',
  },
  
  heading3: {
    color: theme.colors.gray[700],
    fontSize: '16px',
    fontWeight: '600',
    margin: `${theme.spacing.lg} 0 ${theme.spacing.sm}`,
  },
  
  paragraph: {
    color: theme.colors.gray[600],
    fontSize: '16px',
    lineHeight: '1.6',
    margin: `0 0 ${theme.spacing.md}`,
  },
  
  button: {
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center' as const,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: theme.colors.primary,
    border: `2px solid ${theme.colors.primary}`,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center' as const,
  },
  
  link: {
    color: theme.colors.primary,
    textDecoration: 'none',
    fontWeight: '500',
  },
  
  divider: {
    borderColor: theme.colors.gray[200],
    margin: `${theme.spacing.xl} 0`,
  },
  
  footer: {
    backgroundColor: theme.colors.gray[50],
    padding: `${theme.spacing.xl} ${theme.spacing.lg}`,
    textAlign: 'center' as const,
  },
  
  footerText: {
    color: theme.colors.gray[500],
    fontSize: '14px',
    margin: `0 0 ${theme.spacing.sm}`,
    lineHeight: '1.5',
  },
  
  footerLink: {
    color: theme.colors.gray[500],
    textDecoration: 'none',
    fontSize: '14px',
  },
};

// ============================================
// COMPONENT: Status Badge
// ============================================

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: React.ReactNode;
}

const statusColors = {
  success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  warning: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  info: { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
  pending: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

function StatusBadge({ status, children }: StatusBadgeProps) {
  const colors = statusColors[status];
  return (
    <Section
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: theme.borderRadius.full,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        display: 'inline-block',
        marginBottom: theme.spacing.lg,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: '14px',
          fontWeight: '600',
          margin: 0,
          textTransform: 'capitalize' as const,
        }}
      >
        {status === 'success' && '✓ '}
        {status === 'error' && '✕ '}
        {status === 'warning' && '⚠ '}
        {status === 'info' && 'ℹ '}
        {children}
      </Text>
    </Section>
  );
}

// ============================================
// COMPONENT: Info Box
// ============================================

interface InfoBoxProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
}

const infoBoxStyles = {
  default: { bg: theme.colors.gray[50], border: theme.colors.gray[200], icon: '' },
  success: { bg: '#f0fdf4', border: '#86efac', icon: '✓ ' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠ ' },
  error: { bg: '#fef2f2', border: '#fca5a5', icon: '✕ ' },
  info: { bg: '#f0f9ff', border: '#7dd3fc', icon: 'ℹ ' },
};

function InfoBox({ variant = 'default', title, children }: InfoBoxProps) {
  const style = infoBoxStyles[variant];
  return (
    <Section
      style={{
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`,
        padding: theme.spacing.lg,
        margin: `${theme.spacing.lg} 0`,
      }}
    >
      {title && (
        <Text
          style={{
            color: theme.colors.gray[800],
            fontSize: '14px',
            fontWeight: '600',
            margin: `0 0 ${theme.spacing.sm}`,
          }}
        >
          {style.icon}{title}
        </Text>
      )}
      <Text style={{ ...globalStyles.paragraph, margin: 0 }}>{children}</Text>
    </Section>
  );
}

// ============================================
// COMPONENT: Detail Card
// ============================================

interface DetailItem {
  label: string;
  value: string;
  isCode?: boolean;
}

interface DetailCardProps {
  title?: string;
  items: DetailItem[];
}

function DetailCard({ title, items }: DetailCardProps) {
  return (
    <Section
      style={{
        backgroundColor: theme.colors.gray[50],
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        margin: `${theme.spacing.lg} 0`,
      }}
    >
      {title && (
        <Text
          style={{
            color: theme.colors.gray[500],
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            margin: `0 0 ${theme.spacing.md}`,
          }}
        >
          {title}
        </Text>
      )}
      {items.map((item, index) => (
        <Section key={index} style={{ marginBottom: index < items.length - 1 ? theme.spacing.md : 0 }}>
          <Text
            style={{
              color: theme.colors.gray[400],
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
              margin: `0 0 ${theme.spacing.xs}`,
            }}
          >
            {item.label}
          </Text>
          <Text
            style={{
              color: theme.colors.gray[800],
              fontSize: item.isCode ? '16px' : '15px',
              fontWeight: item.isCode ? '600' : '500',
              margin: 0,
              fontFamily: item.isCode ? theme.fonts.mono : theme.fonts.sans,
              letterSpacing: item.isCode ? '0.5px' : '0',
            }}
          >
            {item.value}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

// ============================================
// COMPONENT: Feature List
// ============================================

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureListProps {
  features: Feature[];
}

function FeatureList({ features }: FeatureListProps) {
  return (
    <Section style={{ margin: `${theme.spacing.lg} 0` }}>
      {features.map((feature, index) => (
        <Row key={index} style={{ marginBottom: index < features.length - 1 ? theme.spacing.md : 0 }}>
          <Column style={{ width: '40px', verticalAlign: 'top' }}>
            <Text
              style={{
                fontSize: '20px',
                margin: 0,
              }}
            >
              {feature.icon}
            </Text>
          </Column>
          <Column>
            <Text
              style={{
                color: theme.colors.gray[800],
                fontSize: '15px',
                fontWeight: '600',
                margin: `0 0 ${theme.spacing.xs}`,
              }}
            >
              {feature.title}
            </Text>
            <Text
              style={{
                color: theme.colors.gray[500],
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              {feature.description}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

// ============================================
// TEMPLATE: Client Portal Invitation
// ============================================

interface ClientPortalInviteProps {
  customerName: string;
  portalCode: string;
  email: string;
  loginUrl: string;
  companyName?: string;
}

export function ClientPortalInviteEmail({
  customerName,
  portalCode,
  email,
  loginUrl,
  companyName = 'Splash Air',
}: ClientPortalInviteProps) {
  const features = [
    {
      icon: '📋',
      title: 'View Service History',
      description: 'Access complete records of all past services and maintenance.',
    },
    {
      icon: '🔔',
      title: 'Real-Time Updates',
      description: 'Get notified when technicians are on their way and track job progress.',
    },
    {
      icon: '📅',
      title: 'Schedule Services',
      description: 'Book new appointments and reschedule existing ones with ease.',
    },
    {
      icon: '📄',
      title: 'Download Reports',
      description: 'Access job cards, invoices, and service reports anytime.',
    },
  ];

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Your {companyName} Client Portal access is ready</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="success">Portal Access Activated</StatusBadge>

              <Heading style={globalStyles.heading1}>Welcome, {customerName}!</Heading>

              <Text style={globalStyles.paragraph}>
                Your {companyName} Client Portal is now active. This secure platform gives 
                you 24/7 access to manage your HVAC services, track jobs, and communicate 
                with our team.
              </Text>

              <DetailCard
                title="Your Login Credentials"
                items={[
                  { label: 'Email Address', value: email },
                  { label: 'Access Code', value: portalCode, isCode: true },
                ]}
              />

              <InfoBox variant="info" title="Getting Started">
                Use your email and access code to log in. You can change your access 
                code after your first login for added security.
              </InfoBox>

              <Button style={globalStyles.button} href={loginUrl}>
                Access Your Portal
              </Button>

              <Heading style={globalStyles.heading2}>What You Can Do</Heading>

              <FeatureList features={features} />

              <InfoBox variant="warning" title="Security Notice">
                Keep your access code confidential. Do not share it with unauthorized 
                persons. {companyName} will never ask for your access code via email or phone.
              </InfoBox>

              <Text style={globalStyles.paragraph}>
                Need help? Contact our support team at{' '}
                <Link href="mailto:support@splashaircrmzw.site" style={globalStyles.link}>
                  support@splashaircrmzw.site
                </Link>{' '}
                or call us at{' '}
                <Link href="tel:+27123456789" style={globalStyles.link}>
                  +27 12 345 6789
                </Link>.
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
                <br />
                Professional HVAC Services
              </Text>
              <Text style={{ ...globalStyles.footerText, fontSize: '12px' }}>
                <Link href="https://splashaircrmzw.site" style={globalStyles.footerLink}>
                  Website
                </Link>
                {' • '}
                <Link href="mailto:support@splashaircrmzw.site" style={globalStyles.footerLink}>
                  Support
                </Link>
                {' • '}
                <Link href="https://splashaircrmzw.site/privacy" style={globalStyles.footerLink}>
                  Privacy Policy
                </Link>
              </Text>
              <Text style={{ ...globalStyles.footerText, fontSize: '12px', marginTop: theme.spacing.md }}>
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Service Appointment Confirmation
// ============================================

interface ServiceConfirmationProps {
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  technicianName: string;
  technicianPhone?: string;
  address: string;
  referenceNumber: string;
  portalUrl?: string;
  companyName?: string;
}

export function ServiceConfirmationEmail({
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  technicianName,
  technicianPhone,
  address,
  referenceNumber,
  portalUrl,
  companyName = 'Splash Air',
}: ServiceConfirmationProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Your {serviceType} appointment is confirmed for {serviceDate}</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="success">Appointment Confirmed</StatusBadge>

              <Heading style={globalStyles.heading1}>
                Your Service is Scheduled
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {customerName},
              </Text>

              <Text style={globalStyles.paragraph}>
                Your {serviceType} appointment has been confirmed. Here are the details:
              </Text>

              <DetailCard
                items={[
                  { label: 'Service Type', value: serviceType },
                  { label: 'Date', value: serviceDate },
                  { label: 'Time', value: serviceTime },
                  { label: 'Address', value: address },
                  { label: 'Technician', value: technicianName },
                  { label: 'Reference', value: referenceNumber, isCode: true },
                ]}
              />

              {technicianPhone && (
                <InfoBox variant="info" title="Contact Your Technician">
                  Need to reach {technicianName}? Call{' '}
                  <Link href={`tel:${technicianPhone}`} style={globalStyles.link}>
                    {technicianPhone}
                  </Link>
                </InfoBox>
              )}

              <InfoBox variant="warning" title="Before We Arrive">
                Please ensure someone is available at the location to meet our technician 
                and provide access to the HVAC equipment. We'll call 30 minutes before arrival.
              </InfoBox>

              {portalUrl && (
                <>
                  <Text style={globalStyles.paragraph}>
                    Track your service status in real-time:
                  </Text>
                  <Button style={globalStyles.button} href={portalUrl}>
                    Track Your Service
                  </Button>
                </>
              )}

              <Text style={globalStyles.paragraph}>
                Need to reschedule? Reply to this email or call us at{' '}
                <Link href="tel:+27123456789" style={globalStyles.link}>
                  +27 12 345 6789
                </Link>{' '}
                at least 24 hours in advance.
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
                <br />
                Professional HVAC Services
              </Text>
              <Text style={{ ...globalStyles.footerText, fontSize: '12px' }}>
                <Link href="https://splashaircrmzw.site" style={globalStyles.footerLink}>
                  Website
                </Link>
                {' • '}
                <Link href="tel:+27123456789" style={globalStyles.footerLink}>
                  +27 12 345 6789
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Service Completion
// ============================================

interface ServiceCompletionProps {
  customerName: string;
  serviceType: string;
  completionDate: string;
  technicianName: string;
  workSummary: string;
  recommendations?: string;
  nextServiceDate?: string;
  reportUrl?: string;
  companyName?: string;
}

export function ServiceCompletionEmail({
  customerName,
  serviceType,
  completionDate,
  technicianName,
  workSummary,
  recommendations,
  nextServiceDate,
  reportUrl,
  companyName = 'Splash Air',
}: ServiceCompletionProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Your {serviceType} has been completed</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="success">Service Completed</StatusBadge>

              <Heading style={globalStyles.heading1}>
                Job Complete!
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {customerName},
              </Text>

              <Text style={globalStyles.paragraph}>
                Our technician has completed your {serviceType}. Here's what was done:
              </Text>

              <DetailCard
                items={[
                  { label: 'Service Type', value: serviceType },
                  { label: 'Completed On', value: completionDate },
                  { label: 'Technician', value: technicianName },
                ]}
              />

              <Heading style={globalStyles.heading2}>Work Performed</Heading>
              <Text style={globalStyles.paragraph}>{workSummary}</Text>

              {recommendations && (
                <>
                  <Heading style={globalStyles.heading2}>Technician Recommendations</Heading>
                  <InfoBox variant="info" title="Important">
                    {recommendations}
                  </InfoBox>
                </>
              )}

              {nextServiceDate && (
                <InfoBox variant="success" title="Next Service Recommended">
                  Based on our assessment, we recommend scheduling your next service on{' '}
                  <strong>{nextServiceDate}</strong> to maintain optimal performance.
                </InfoBox>
              )}

              {reportUrl && (
                <>
                  <Text style={globalStyles.paragraph}>
                    Download your detailed service report:
                  </Text>
                  <Button style={globalStyles.button} href={reportUrl}>
                    Download Service Report
                  </Button>
                </>
              )}

              <Text style={globalStyles.paragraph}>
                Thank you for choosing {companyName}! We appreciate your business 
                and look forward to serving you again.
              </Text>

              <InfoBox variant="default" title="Feedback Welcome">
                How did we do? Your feedback helps us improve our service. 
                Reply to this email with any comments or suggestions.
              </InfoBox>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
                <br />
                Professional HVAC Services
              </Text>
              <Text style={{ ...globalStyles.footerText, fontSize: '12px' }}>
                <Link href="https://splashaircrmzw.site" style={globalStyles.footerLink}>
                  Website
                </Link>
                {' • '}
                <Link href="mailto:support@splashaircrmzw.site" style={globalStyles.footerLink}>
                  Support
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Status Update
// ============================================

interface StatusUpdateProps {
  customerName: string;
  serviceType: string;
  referenceNumber: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  updateTime: string;
  notes?: string;
  portalUrl?: string;
  companyName?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  scheduled: { label: 'Scheduled', color: theme.colors.info, icon: '📅' },
  'in-progress': { label: 'In Progress', color: theme.colors.warning, icon: '⏳' },
  'on-site': { label: 'Technician On Site', color: theme.colors.accent, icon: '🔧' },
  completed: { label: 'Completed', color: theme.colors.success, icon: '✓' },
  cancelled: { label: 'Cancelled', color: theme.colors.error, icon: '✕' },
  delayed: { label: 'Delayed', color: theme.colors.warning, icon: '⚠' },
};

export function StatusUpdateEmail({
  customerName,
  serviceType,
  referenceNumber,
  previousStatus,
  newStatus,
  updatedBy,
  updateTime,
  notes,
  portalUrl,
  companyName = 'Splash Air',
}: StatusUpdateProps) {
  const newStatusConfig = statusConfig[newStatus] || { label: newStatus, color: theme.colors.gray[500], icon: '' };

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Status update for your {serviceType} - now {newStatus}</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status={newStatus === 'completed' ? 'success' : newStatus === 'cancelled' ? 'error' : 'info'}>
                Status Updated
              </StatusBadge>

              <Heading style={globalStyles.heading1}>
                Service Status Changed
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {customerName},
              </Text>

              <Text style={globalStyles.paragraph}>
                There's been an update to your {serviceType}:
              </Text>

              <DetailCard
                items={[
                  { label: 'Reference', value: referenceNumber, isCode: true },
                  { label: 'Service', value: serviceType },
                  { label: 'Previous Status', value: previousStatus },
                  { label: 'Current Status', value: `${newStatusConfig.icon} ${newStatusConfig.label}` },
                  { label: 'Updated By', value: updatedBy },
                  { label: 'Update Time', value: updateTime },
                ]}
              />

              {notes && (
                <InfoBox variant="info" title="Update Notes">
                  {notes}
                </InfoBox>
              )}

              {portalUrl && (
                <>
                  <Text style={globalStyles.paragraph}>
                    View the latest updates in your portal:
                  </Text>
                  <Button style={globalStyles.button} href={portalUrl}>
                    View in Portal
                  </Button>
                </>
              )}

              <Text style={globalStyles.paragraph}>
                Questions? Contact us at{' '}
                <Link href="mailto:support@splashaircrmzw.site" style={globalStyles.link}>
                  support@splashaircrmzw.site
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
                <br />
                Professional HVAC Services
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Technician Assignment
// ============================================

interface TechnicianAssignmentProps {
  technicianName: string;
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  address: string;
  jobDescription: string;
  customerPhone?: string;
  referenceNumber: string;
  dashboardUrl?: string;
  companyName?: string;
}

export function TechnicianAssignmentEmail({
  technicianName,
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  address,
  jobDescription,
  customerPhone,
  referenceNumber,
  dashboardUrl,
  companyName = 'Splash Air',
}: TechnicianAssignmentProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>New job assignment: {serviceType} for {customerName}</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Field Service Management</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="info">New Assignment</StatusBadge>

              <Heading style={globalStyles.heading1}>
                You're Assigned to a New Job
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {technicianName},
              </Text>

              <Text style={globalStyles.paragraph}>
                You have a new service assignment. Please review the details below:
              </Text>

              <DetailCard
                title="Job Details"
                items={[
                  { label: 'Reference', value: referenceNumber, isCode: true },
                  { label: 'Service Type', value: serviceType },
                  { label: 'Date', value: serviceDate },
                  { label: 'Time', value: serviceTime },
                  { label: 'Customer', value: customerName },
                  { label: 'Address', value: address },
                  ...(customerPhone ? [{ label: 'Contact', value: customerPhone }] : []),
                ]}
              />

              <Heading style={globalStyles.heading2}>Scope of Work</Heading>
              <Text style={globalStyles.paragraph}>{jobDescription}</Text>

              <InfoBox variant="warning" title="Field Reminders">
                • Clock in when you arrive on site
                • Update job status at each stage
                • Complete diagnostics before requesting sign-off
                • Take before/after photos
              </InfoBox>

              {dashboardUrl && (
                <Button style={globalStyles.button} href={dashboardUrl}>
                  Open Job Card
                </Button>
              )}
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
                <br />
                Field Service Management System
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Reminder Email
// ============================================

interface ReminderProps {
  customerName: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  technicianName?: string;
  address: string;
  referenceNumber: string;
  portalUrl?: string;
  companyName?: string;
}

export function ReminderEmail({
  customerName,
  serviceType,
  serviceDate,
  serviceTime,
  technicianName,
  address,
  referenceNumber,
  portalUrl,
  companyName = 'Splash Air',
}: ReminderProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Reminder: Your {serviceType} appointment is tomorrow</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="warning">Appointment Tomorrow</StatusBadge>

              <Heading style={globalStyles.heading1}>
                Friendly Reminder
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {customerName},
              </Text>

              <Text style={globalStyles.paragraph}>
                This is a friendly reminder about your upcoming service appointment:
              </Text>

              <DetailCard
                items={[
                  { label: 'Service', value: serviceType },
                  { label: 'Date', value: serviceDate },
                  { label: 'Time', value: serviceTime },
                  { label: 'Address', value: address },
                  ...(technicianName ? [{ label: 'Technician', value: technicianName }] : []),
                  { label: 'Reference', value: referenceNumber, isCode: true },
                ]}
              />

              <InfoBox variant="info" title="What to Expect">
                Our technician will arrive within the scheduled time window. 
                You'll receive a call 30 minutes before arrival. Please ensure 
                someone is available to provide access.
              </InfoBox>

              {portalUrl && (
                <Button style={{ ...globalStyles.buttonSecondary, marginTop: theme.spacing.md }} href={portalUrl}>
                  Manage Appointment
                </Button>
              )}

              <Text style={{ ...globalStyles.paragraph, fontSize: '14px', color: theme.colors.gray[500] }}>
                Need to reschedule? Contact us ASAP at{' '}
                <Link href="tel:+27123456789" style={globalStyles.link}>
                  +27 12 345 6789
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Follow-Up Email
// ============================================

interface FollowUpProps {
  customerName: string;
  serviceType: string;
  completionDate: string;
  feedbackUrl?: string;
  reviewUrl?: string;
  companyName?: string;
}

export function FollowUpEmail({
  customerName,
  serviceType,
  completionDate,
  feedbackUrl,
  reviewUrl,
  companyName = 'Splash Air',
}: FollowUpProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>How was your {serviceType} experience?</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <Heading style={globalStyles.heading1}>
                How Did We Do?
              </Heading>

              <Text style={globalStyles.paragraph}>
                Hi {customerName},
              </Text>

              <Text style={globalStyles.paragraph}>
                We completed your {serviceType} on {completionDate}. Your feedback 
                helps us improve and lets others know what to expect.
              </Text>

              <InfoBox variant="success" title="Quick Feedback">
                How would you rate your experience? Click below to share your thoughts 
                — it takes less than a minute.
              </InfoBox>

              {feedbackUrl && (
                <Button style={globalStyles.button} href={feedbackUrl}>
                  Share Feedback
                </Button>
              )}

              {reviewUrl && (
                <>
                  <Hr style={globalStyles.divider} />
                  <Text style={globalStyles.paragraph}>
                    Happy with our service? We'd appreciate a review:
                  </Text>
                  <Button style={globalStyles.buttonSecondary} href={reviewUrl}>
                    Leave a Review
                  </Button>
                </>
              )}

              <Text style={{ ...globalStyles.paragraph, marginTop: theme.spacing.xl }}>
                Thank you for choosing {companyName}!
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// TEMPLATE: Welcome Email
// ============================================

interface WelcomeEmailProps {
  customerName: string;
  portalUrl: string;
  companyName?: string;
}

export function WelcomeEmail({
  customerName,
  portalUrl,
  companyName = 'Splash Air',
}: WelcomeEmailProps) {
  const features = [
    {
      icon: '🌡️',
      title: 'Expert HVAC Services',
      description: 'Professional installation, maintenance, and repair for all air conditioning systems.',
    },
    {
      icon: '⚡',
      title: 'Fast Response',
      description: 'Quick scheduling and emergency services when you need them most.',
    },
    {
      icon: '💎',
      title: 'Quality Guaranteed',
      description: 'All work backed by our satisfaction guarantee and warranty.',
    },
  ];

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Welcome to {companyName} - Your HVAC partner</Preview>
      <Body style={globalStyles.main}>
        <Container style={globalStyles.container}>
          <Section style={globalStyles.card}>
            {/* Header */}
            <Section style={globalStyles.header}>
              <Text style={globalStyles.logo}>
                <span style={globalStyles.logoIcon}>❄</span>
                {companyName.toUpperCase()}
              </Text>
              <Text style={globalStyles.tagline}>Professional HVAC Services</Text>
            </Section>

            {/* Content */}
            <Section style={globalStyles.content}>
              <StatusBadge status="success">Welcome!</StatusBadge>

              <Heading style={globalStyles.heading1}>
                Welcome to {companyName}, {customerName}!
              </Heading>

              <Text style={globalStyles.paragraph}>
                Thank you for choosing {companyName} for your HVAC needs. We're excited 
                to help you maintain a comfortable environment year-round.
              </Text>

              <Heading style={globalStyles.heading2}>Why Choose Us?</Heading>
              <FeatureList features={features} />

              <InfoBox variant="info" title="Your Client Portal">
                Access your service history, schedule appointments, and track jobs 
                in real-time through your personalized portal.
              </InfoBox>

              <Button style={globalStyles.button} href={portalUrl}>
                Access Your Portal
              </Button>

              <Text style={globalStyles.paragraph}>
                Have questions? Our team is here to help at{' '}
                <Link href="mailto:support@splashaircrmzw.site" style={globalStyles.link}>
                  support@splashaircrmzw.site
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section style={globalStyles.footer}>
              <Text style={globalStyles.footerText}>
                <strong>{companyName} Conditioning</strong>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================
// REUSABLE COMPONENTS EXPORTS (for custom templates)
// ============================================

export {
  StatusBadge,
  InfoBox,
  DetailCard,
  FeatureList,
  globalStyles,
  theme,
};
