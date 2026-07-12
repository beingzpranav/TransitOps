import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface DriverWelcomeEmailProps {
  driverName: string;
  setupUrl: string;
}

export function DriverWelcomeEmail({
  driverName = 'Driver Name',
  setupUrl = 'http://localhost:3000/setup-password',
}: DriverWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to TransitOps — Set up your password</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>Welcome to TransitOps, {driverName}!</Heading>
          <Text style={styles.p}>
            You have been registered as a driver in our fleet system. To log in and start tracking your trips, please set up your account password by clicking the button below:
          </Text>
          
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Link href={setupUrl} style={styles.button}>
              Set Up Password
            </Link>
          </div>

          <Text style={styles.p}>
            This link is secure and will expire in 24 hours.
          </Text>

          <Text style={styles.footer}>
            This is an automated onboarding message from TransitOps Fleet Operations.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DriverWelcomeEmail;
