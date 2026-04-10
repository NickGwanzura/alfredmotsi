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
} from '@react-email/components';

// ============================================
// BRAND STYLES
// ============================================

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

const h2 = {
  color: colors.gray[800],
  fontSize: '18px',
  fontWeight: '500',
  margin: '32px 0 16px',
};

const paragraph = {
  color: colors.gray[700],
  fontSize: '14px',
  lineHeight: '1.7',
  margin: '0 0 16px',
};

const details = {
  backgroundColor: colors.gray[100],
  borderLeft: `4px solid ${colors.primary}`,
  padding: '20px 24px',
  margin: '24px 0',
};

const detailItem = {
  color: colors.gray[800],
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '1.5',
};

const detailLabel = {
  color: colors.gray[500],
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 4px',
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

const footerLinks = {
  margin: '16px 0',
};

const footerLink = {
  color: colors.gray[600],
  textDecoration: 'none',
  margin: '0 12px',
  fontSize: '12px',
};

const statusBadge = {
  display: 'inline-block',
  padding: '4px 12px',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
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

// ============================================
// EMAIL TEMPLATES
// ============================================

// 1. JOB SCHEDULED EMAIL
interface JobScheduledEmailProps {
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobType: string;
  jobAddress: string;
  technicianName: string;
  technicianPhone?: string;
  jobId: string;
  portalUrl?: string;
}

export function JobScheduledEmail({
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobType,
  jobAddress,
  technicianName,
  technicianPhone,
  jobId,
  portalUrl,
}: JobScheduledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your service appointment is scheduled - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Service Appointment Confirmed</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              Your service appointment has been scheduled with Splash Air Conditioning. Here are the details:
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Service</Text>
              <Text style={{ ...detailItem, fontSize: '18px', fontWeight: '500', marginBottom: '16px' }}>
                {jobTitle}
              </Text>
              
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Date</Text>
                  <Text style={detailItem}>{jobDate}</Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Time</Text>
                  <Text style={detailItem}>{jobTime}</Text>
                </Column>
              </Row>
              
              <Text style={detailLabel}>Service Type</Text>
              <Text style={detailItem}>{jobType}</Text>
              
              <Text style={detailLabel}>Location</Text>
              <Text style={detailItem}>{jobAddress}</Text>
              
              <Text style={detailLabel}>Assigned Technician</Text>
              <Text style={detailItem}>{technicianName}</Text>
              
              <Text style={detailLabel}>Reference Number</Text>
              <Text style={{ ...detailItem, fontFamily: 'monospace', fontSize: '16px' }}>{jobId}</Text>
            </Section>
            
            <Section style={infoBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Please ensure:</strong> Access to the site is available and someone is present to meet our technician.
              </Text>
            </Section>
            
            {portalUrl && (
              <>
                <Text style={paragraph}>
                  Track your job status in real-time through our client portal:
                </Text>
                <Button style={button} href={portalUrl}>
                  Track Job Online
                </Button>
              </>
            )}
            
            {technicianPhone && (
              <Text style={paragraph}>
                Need to contact your technician? Call <a href={`tel:${technicianPhone}`} style={link}>{technicianPhone}</a>
              </Text>
            )}
            
            <Text style={paragraph}>
              To reschedule or for any queries, please contact us at <a href="mailto:alfred@splashaircrmzw.site" style={link}>alfred@splashaircrmzw.site</a> or reply to this email.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>alfred@splashaircrmzw.site</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 2. JOB COMPLETED EMAIL
interface JobCompletedEmailProps {
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  recommendations?: string;
  nextServiceDate?: string;
  jobCardUrl?: string;
}

export function JobCompletedEmail({
  customerName,
  jobTitle,
  jobDate,
  technicianName,
  workDescription,
  recommendations,
  nextServiceDate,
  jobCardUrl,
}: JobCompletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Job completed - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Section style={successBox}>
              <Text style={{ ...paragraph, margin: 0, color: colors.success }}>
                ✓ JOB COMPLETED SUCCESSFULLY
              </Text>
            </Section>
            
            <Heading style={h1}>Work Completion Report</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              Our technician has completed the service work at your facility. Here is the summary:
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Service</Text>
              <Text style={{ ...detailItem, fontSize: '18px', fontWeight: '500' }}>{jobTitle}</Text>
              
              <Text style={detailLabel}>Date Completed</Text>
              <Text style={detailItem}>{jobDate}</Text>
              
              <Text style={detailLabel}>Technician</Text>
              <Text style={detailItem}>{technicianName}</Text>
            </Section>
            
            <Heading style={h2}>Work Performed</Heading>
            <Text style={paragraph}>{workDescription}</Text>
            
            {recommendations && (
              <>
                <Heading style={h2}>Recommendations</Heading>
                <Section style={alertBox}>
                  <Text style={{ ...paragraph, margin: 0 }}>{recommendations}</Text>
                </Section>
              </>
            )}
            
            {nextServiceDate && (
              <>
                <Heading style={h2}>Next Service</Heading>
                <Text style={paragraph}>
                  Based on our assessment, we recommend the next service on: <strong>{nextServiceDate}</strong>
                </Text>
              </>
            )}
            
            {jobCardUrl && (
              <>
                <Text style={paragraph}>
                  Download your detailed job card report:
                </Text>
                <Button style={button} href={jobCardUrl}>
                  Download Job Report
                </Button>
              </>
            )}
            
            <Text style={paragraph}>
              Thank you for choosing Splash Air Conditioning. We appreciate your business and look forward to serving you again.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>alfred@splashaircrmzw.site</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 3. PORTAL INVITE EMAIL
interface PortalInviteEmailProps {
  customerName: string;
  portalCode: string;
  email: string;
  loginUrl: string;
}

export function PortalInviteEmail({
  customerName,
  portalCode,
  email,
  loginUrl,
}: PortalInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Splash Air Client Portal Access</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Welcome to Your Client Portal</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              You have been granted access to the Splash Air Client Portal. This secure platform allows you to manage your HVAC services online.
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Your Login Credentials</Text>
              
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Email</Text>
                  <Text style={detailItem}>{email}</Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Portal Access Code</Text>
                  <Text style={{ ...detailItem, fontSize: '20px', fontWeight: '600', fontFamily: 'monospace', letterSpacing: '2px' }}>
                    {portalCode}
                  </Text>
                </Column>
              </Row>
            </Section>
            
            <Heading style={h2}>Portal Features</Heading>
            
            <Section style={{ margin: '20px 0' }}>
              <Row style={{ marginBottom: '12px' }}>
                <Column style={{ width: '30px' }}>✓</Column>
                <Column>
                  <Text style={{ ...paragraph, margin: 0 }}>View complete service history</Text>
                </Column>
              </Row>
              <Row style={{ marginBottom: '12px' }}>
                <Column style={{ width: '30px' }}>✓</Column>
                <Column>
                  <Text style={{ ...paragraph, margin: 0 }}>Track job progress in real-time</Text>
                </Column>
              </Row>
              <Row style={{ marginBottom: '12px' }}>
                <Column style={{ width: '30px' }}>✓</Column>
                <Column>
                  <Text style={{ ...paragraph, margin: 0 }}>Book new service requests</Text>
                </Column>
              </Row>
              <Row style={{ marginBottom: '12px' }}>
                <Column style={{ width: '30px' }}>✓</Column>
                <Column>
                  <Text style={{ ...paragraph, margin: 0 }}>Download job reports and invoices</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ width: '30px' }}>✓</Column>
                <Column>
                  <Text style={{ ...paragraph, margin: 0 }}>Communicate directly with our team</Text>
                </Column>
              </Row>
            </Section>
            
            <Button style={button} href={loginUrl}>
              Access Your Portal
            </Button>
            
            <Section style={alertBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Important:</strong> Keep your portal access code secure. Do not share it with unauthorized persons.
              </Text>
            </Section>
            
            <Text style={paragraph}>
              For assistance accessing your portal, please contact our support team at <a href="mailto:alfred@splashaircrmzw.site" style={link}>alfred@splashaircrmzw.site</a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>alfred@splashaircrmzw.site</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 4. TECHNICIAN ASSIGNMENT EMAIL
interface TechAssignmentEmailProps {
  technicianName: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobAddress: string;
  jobDescription: string;
  customerPhone?: string;
  jobId: string;
}

export function TechAssignmentEmail({
  technicianName,
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobAddress,
  jobDescription,
  customerPhone,
  jobId,
}: TechAssignmentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New job assignment - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>New Job Assignment</Heading>
            
            <Text style={paragraph}>Hi {technicianName},</Text>
            
            <Text style={paragraph}>
              You have been assigned a new service job. Please review the details below:
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Job Reference</Text>
              <Text style={{ ...detailItem, fontFamily: 'monospace', fontSize: '16px' }}>{jobId}</Text>
              
              <Text style={detailLabel}>Service</Text>
              <Text style={{ ...detailItem, fontSize: '18px', fontWeight: '500' }}>{jobTitle}</Text>
              
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Date</Text>
                  <Text style={detailItem}>{jobDate}</Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Time</Text>
                  <Text style={detailItem}>{jobTime}</Text>
                </Column>
              </Row>
              
              <Text style={detailLabel}>Customer</Text>
              <Text style={detailItem}>{customerName}</Text>
              
              <Text style={detailLabel}>Location</Text>
              <Text style={detailItem}>{jobAddress}</Text>
              
              {customerPhone && (
                <>
                  <Text style={detailLabel}>Contact</Text>
                  <Text style={detailItem}>{customerPhone}</Text>
                </>
              )}
            </Section>
            
            <Heading style={h2}>Scope of Work</Heading>
            <Text style={paragraph}>{jobDescription}</Text>
            
            <Section style={infoBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Remember:</strong> Clock in when you arrive, update the job status, and complete diagnostics before requesting customer sign-off.
              </Text>
            </Section>
            
            <Text style={paragraph}>
              Access the job card through your technician dashboard to view full details and submit your report.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Field Service Management System
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 5. USER INVITE EMAIL (for new technicians/staff)
interface UserInviteEmailProps {
  userName: string;
  userEmail: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}

export function UserInviteEmail({
  userName,
  userEmail,
  tempPassword,
  role,
  loginUrl,
}: UserInviteEmailProps) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return (
    <Html>
      <Head />
      <Preview>Your Splash Air {roleDisplay} Account</Preview>
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
              An account has been created for you in the Splash Air Field Service Management System. You have been assigned the role of <strong>{roleDisplay}</strong>.
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Your Login Credentials</Text>
              
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Email</Text>
                  <Text style={detailItem}>{userEmail}</Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={detailLabel}>Temporary Password</Text>
                  <Text style={{ ...detailItem, fontFamily: 'monospace', fontSize: '14px' }}>
                    {tempPassword}
                  </Text>
                </Column>
              </Row>
              
              <Text style={detailLabel}>Access Level</Text>
              <Text style={detailItem}>{roleDisplay}</Text>
            </Section>
            
            <Section style={alertBox}>
              <Text style={{ ...paragraph, margin: 0 }}>
                <strong>Security Notice:</strong> Please change your password after your first login. Do not share your credentials with anyone.
              </Text>
            </Section>
            
            <Button style={button} href={loginUrl}>
              Access System
            </Button>
            
            <Text style={paragraph}>
              If you have any issues accessing your account, please contact the administrator at <a href="mailto:alfred@splashaircrmzw.site" style={link}>alfred@splashaircrmzw.site</a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Internal Use Only - Confidential
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 6. STATUS UPDATE EMAIL
interface StatusUpdateEmailProps {
  customerName: string;
  jobTitle: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  updateTime: string;
  notes?: string;
}

export function StatusUpdateEmail({
  customerName,
  jobTitle,
  jobId,
  oldStatus,
  newStatus,
  updatedBy,
  updateTime,
  notes,
}: StatusUpdateEmailProps) {
  const statusColors: Record<string, string> = {
    scheduled: '#0f62fe',
    'in-progress': '#f1c21b',
    'on-site': '#ff832b',
    completed: '#198038',
    cancelled: '#da1e28',
  };
  
  return (
    <Html>
      <Head />
      <Preview>Job status update - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ SPLASH AIR</Text>
            <Text style={tagline}>Professional HVAC Services</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Job Status Update</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              There has been an update to your service job:
            </Text>
            
            <Section style={details}>
              <Text style={detailLabel}>Service</Text>
              <Text style={{ ...detailItem, fontSize: '18px', fontWeight: '500' }}>{jobTitle}</Text>
              
              <Text style={detailLabel}>Reference</Text>
              <Text style={{ ...detailItem, fontFamily: 'monospace' }}>{jobId}</Text>
              
              <Text style={detailLabel}>Status Change</Text>
              <Text style={detailItem}>
                <span style={{ textTransform: 'capitalize' }}>{oldStatus}</span> →{' '}
                <span style={{ color: statusColors[newStatus] || colors.primary, fontWeight: '600', textTransform: 'capitalize' }}>
                  {newStatus}
                </span>
              </Text>
              
              <Text style={detailLabel}>Updated By</Text>
              <Text style={detailItem}>{updatedBy}</Text>
              
              <Text style={detailLabel}>Time</Text>
              <Text style={detailItem}>{updateTime}</Text>
            </Section>
            
            {notes && (
              <>
                <Heading style={h2}>Notes</Heading>
                <Text style={paragraph}>{notes}</Text>
              </>
            )}
            
            <Text style={paragraph}>
              You can track the progress of your job anytime through our client portal or by contacting us directly.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              <strong>Splash Air Conditioning</strong><br />
              Professional HVAC Services<br />
              <a href="mailto:alfred@splashaircrmzw.site" style={footerLink}>alfred@splashaircrmzw.site</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
