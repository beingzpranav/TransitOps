import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import * as React from 'react';
import { TripDispatchedEmail } from '../components/emails/TripDispatchedEmail';
import { TripCompletedEmail } from '../components/emails/TripCompletedEmail';
import { MaintenanceOpenedEmail } from '../components/emails/MaintenanceOpenedEmail';
import { MaintenanceClosedEmail } from '../components/emails/MaintenanceClosedEmail';
import { DriverSuspendedEmail } from '../components/emails/DriverSuspendedEmail';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Check if placeholders are present or values are missing
  const hasCreds = host && user && pass && !user.includes('placeholder') && !pass.includes('placeholder');

  if (hasCreds) {
    transporter = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
      secure: port === 465,
    });
    console.log(`[SMTP] Transporter initialized using config: ${host}:${port}`);
  } else {
    console.log('[SMTP] No valid SMTP credentials found. Creating Ethereal Email SMTP test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[SMTP] Test Transporter initialized (Ethereal). User: ${testAccount.user}`);
  }
  return transporter;
}

// Reusable render helper
async function getEmailHtml(templateName: string, props: any): Promise<string> {
  let element: React.ReactElement;
  switch (templateName) {
    case 'trip_dispatched':
      element = React.createElement(TripDispatchedEmail, props);
      break;
    case 'trip_completed':
      element = React.createElement(TripCompletedEmail, props);
      break;
    case 'maintenance_opened':
      element = React.createElement(MaintenanceOpenedEmail, props);
      break;
    case 'maintenance_closed':
      element = React.createElement(MaintenanceClosedEmail, props);
      break;
    case 'driver_suspended':
      element = React.createElement(DriverSuspendedEmail, props);
      break;
    default:
      throw new Error(`Unknown email template: ${templateName}`);
  }
  return await render(element);
}

export async function sendEmail({
  to,
  subject,
  templateName,
  props,
  triggerEvent,
}: {
  to: string;
  subject: string;
  templateName: string;
  props: any;
  triggerEvent: string;
}) {
  try {
    const html = await getEmailHtml(templateName, props);
    const client = await getTransporter();

    const fromAddress = process.env.SMTP_FROM || 'notifications@transitops.com';

    const info = await client.sendMail({
      from: `"TransitOps Notifications" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log(`[SMTP] Email successfully sent to ${to}: Message ID ${info.messageId}`);
    
    // If Ethereal test mail was used, log the preview link!
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[SMTP] View Ethereal Email Preview: ${previewUrl}`);
    }
  } catch (error) {
    console.error('Failed to send SMTP email:', error);
  }
}
