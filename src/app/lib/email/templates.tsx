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
} from '@react-email/components';

interface JobNotificationEmailProps {
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobType: string;
  technicianName?: string;
  jobId: string;
}

export function JobScheduledEmail({
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobType,
  technicianName,
  jobId,
}: JobNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New job scheduled - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ Splash Air</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Job Scheduled</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              A new service job has been scheduled for your facility:
            </Text>
            
            <Section style={details}>
              <Text style={detailItem}><strong>Job:</strong> {jobTitle}</Text>
              <Text style={detailItem}><strong>Type:</strong> {jobType}</Text>
              <Text style={detailItem}><strong>Date:</strong> {jobDate}</Text>
              <Text style={detailItem}><strong>Time:</strong> {jobTime}</Text>
              {technicianName && (
                <Text style={detailItem}><strong>Technician:</strong> {technicianName}</Text>
              )}
              <Text style={detailItem}><strong>Job ID:</strong> {jobId}</Text>
            </Section>
            
            <Text style={paragraph}>
              Please ensure access is available at the scheduled time. Our technician will arrive within the time window specified.
            </Text>
            
            <Text style={paragraph}>
              If you need to reschedule or have any questions, please contact us at <a href="mailto:alfred@splashaironline.co.zw" style={link}>alfred@splashaironline.co.zw</a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              Splash Air Conditioning<br />
              Professional HVAC Services
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface JobCompletionEmailProps {
  customerName: string;
  jobTitle: string;
  jobDate: string;
  technicianName: string;
  workDescription: string;
  nextServiceDate?: string;
}

export function JobCompletionEmail({
  customerName,
  jobTitle,
  jobDate,
  technicianName,
  workDescription,
  nextServiceDate,
}: JobCompletionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Job Completed - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ Splash Air</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Job Completed</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              We have completed the service job at your facility:
            </Text>
            
            <Section style={details}>
              <Text style={detailItem}><strong>Job:</strong> {jobTitle}</Text>
              <Text style={detailItem}><strong>Date Completed:</strong> {jobDate}</Text>
              <Text style={detailItem}><strong>Technician:</strong> {technicianName}</Text>
            </Section>
            
            <Section style={workSection}>
              <Text style={sectionTitle}>Work Performed:</Text>
              <Text style={workDescription}>{workDescription}</Text>
            </Section>
            
            {nextServiceDate && (
              <Text style={paragraph}>
                <strong>Next Service Recommended:</strong> {nextServiceDate}
              </Text>
            )}
            
            <Text style={paragraph}>
              Thank you for choosing Splash Air Conditioning. If you have any feedback or concerns about the service provided, please don't hesitate to contact us.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              Splash Air Conditioning<br />
              Professional HVAC Services
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface PortalInviteEmailProps {
  customerName: string;
  portalCode: string;
  email: string;
}

export function PortalInviteEmail({
  customerName,
  portalCode,
  email,
}: PortalInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Splash Air Client Portal Access</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ Splash Air</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>Welcome to Splash Air Client Portal</Heading>
            
            <Text style={paragraph}>Dear {customerName},</Text>
            
            <Text style={paragraph}>
              You have been invited to access the Splash Air Client Portal. With your portal access, you can:
            </Text>
            
            <Section style={featureList}>
              <Text style={featureItem}>✓ View all your service history</Text>
              <Text style={featureItem}>✓ Track live job progress</Text>
              <Text style={featureItem}>✓ Book new service requests</Text>
              <Text style={featureItem}>✓ Download completed job reports</Text>
            </Section>
            
            <Section style={credentialsBox}>
              <Text style={sectionTitle}>Your Login Credentials:</Text>
              <Text style={credentialItem}><strong>Email:</strong> {email}</Text>
              <Text style={credentialItem}><strong>Portal Code:</strong> <span style={code}>{portalCode}</span></Text>
            </Section>
            
            <Button style={button} href="https://splashair.co.za/login">
              Access Portal
            </Button>
            
            <Text style={paragraph}>
              For support, please contact us at <a href="mailto:alfred@splashaironline.co.zw" style={link}>alfred@splashaironline.co.zw</a>
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              Splash Air Conditioning<br />
              Professional HVAC Services
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface TechAssignmentEmailProps {
  technicianName: string;
  customerName: string;
  jobTitle: string;
  jobDate: string;
  jobTime: string;
  jobAddress: string;
  jobDescription: string;
}

export function TechAssignmentEmail({
  technicianName,
  customerName,
  jobTitle,
  jobDate,
  jobTime,
  jobAddress,
  jobDescription,
}: TechAssignmentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Job Assignment - {jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>❄ Splash Air</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>New Job Assignment</Heading>
            
            <Text style={paragraph}>Hi {technicianName},</Text>
            
            <Text style={paragraph}>
              You have been assigned a new job:
            </Text>
            
            <Section style={details}>
              <Text style={detailItem}><strong>Customer:</strong> {customerName}</Text>
              <Text style={detailItem}><strong>Job:</strong> {jobTitle}</Text>
              <Text style={detailItem}><strong>Date:</strong> {jobDate}</Text>
              <Text style={detailItem}><strong>Time:</strong> {jobTime}</Text>
              <Text style={detailItem}><strong>Address:</strong> {jobAddress}</Text>
            </Section>
            
            <Section style={workSection}>
              <Text style={sectionTitle}>Job Description:</Text>
              <Text style={workDescription}>{jobDescription}</Text>
            </Section>
            
            <Text style={paragraph}>
              Please ensure you have all necessary equipment and arrive on time. Update the job status in the system when you arrive and complete the work.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footer}>
              Splash Air Conditioning
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#0f62fe',
  padding: '24px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
};

const content = {
  backgroundColor: '#ffffff',
  padding: '40px 32px',
};

const h1 = {
  color: '#161616',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 24px',
};

const paragraph = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const details = {
  backgroundColor: '#f4f4f4',
  padding: '20px',
  margin: '20px 0',
  borderRadius: '4px',
};

const detailItem = {
  color: '#161616',
  fontSize: '14px',
  margin: '8px 0',
};

const workSection = {
  margin: '24px 0',
};

const sectionTitle = {
  color: '#161616',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const workDescription = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  padding: '12px',
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
};

const featureList = {
  margin: '20px 0',
};

const featureItem = {
  color: '#525252',
  fontSize: '14px',
  margin: '8px 0',
};

const credentialsBox = {
  backgroundColor: '#e8f0fe',
  padding: '20px',
  margin: '24px 0',
  borderRadius: '4px',
  border: '1px solid #0f62fe',
};

const credentialItem = {
  color: '#161616',
  fontSize: '14px',
  margin: '8px 0',
};

const code = {
  backgroundColor: '#ffffff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '16px',
  fontWeight: '600',
  color: '#0f62fe',
  letterSpacing: '1px',
};

const button = {
  backgroundColor: '#0f62fe',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '0',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500',
  margin: '16px 0',
};

const link = {
  color: '#0f62fe',
  textDecoration: 'none',
};

const divider = {
  borderColor: '#e0e0e0',
  margin: '32px 0 24px',
};

const footer = {
  color: '#8d8d8d',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
};
