import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface DriverSuspendedEmailProps {
  driverName: string;
  licenseNumber: string;
  safetyScore: number | null;
  reason?: string;
}

export function DriverSuspendedEmail({
  driverName = 'Driver Name',
  licenseNumber = 'DL-000',
  safetyScore = null,
  reason = 'Compliance review / policy infraction',
}: DriverSuspendedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Alert: Driver Status Set to Suspended — {driverName}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>Compliance Alert: Driver Suspended</Heading>
          <Text style={styles.p}>Driver <strong>{driverName}</strong> has been suspended from dispatch duties. They can no longer be assigned to active trips.</Text>
          
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableCellLabel}>Driver</td>
                <td style={styles.tableCellValue}>{driverName}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>License</td>
                <td style={styles.tableCellValue}>{licenseNumber}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Safety Score</td>
                <td style={styles.tableCellValue}>{safetyScore != null ? `${safetyScore} / 100` : '—'}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Reason</td>
                <td style={styles.tableCellValue}>{reason}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Status</td>
                <td style={{ ...styles.tableCellValue, color: '#ef4444', fontWeight: 'bold' }}>Suspended</td>
              </tr>
            </tbody>
          </table>

          <Link href="http://localhost:3000/dashboard/drivers" style={styles.button}>
            Open Driver Portal
          </Link>

          <Text style={styles.footer}>
            This is an automated compliance alert from TransitOps Safety & Operations.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DriverSuspendedEmail;
