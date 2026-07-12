import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface MaintenanceClosedEmailProps {
  vehicleReg: string;
  vehicleName: string;
  description: string;
  cost: number;
  dateOpened: string;
}

export function MaintenanceClosedEmail({
  vehicleReg = 'REG-000',
  vehicleName = 'Vehicle Name',
  description = 'Maintenance Details',
  cost = 0,
  dateOpened = '',
}: MaintenanceClosedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Maintenance Closed: Vehicle {vehicleReg} is Available</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>Maintenance Closed</Heading>
          <Text style={styles.p}>Vehicle <strong>{vehicleReg}</strong> is resolved and has been returned to the available pool.</Text>
          
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableCellLabel}>Vehicle</td>
                <td style={styles.tableCellValue}>{vehicleReg} ({vehicleName})</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Description</td>
                <td style={styles.tableCellValue}>{description}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Actual Cost</td>
                <td style={styles.tableCellValue}>₹{cost.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Opened Date</td>
                <td style={styles.tableCellValue}>{new Date(dateOpened).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Status</td>
                <td style={{ ...styles.tableCellValue, color: '#10b981', fontWeight: 'bold' }}>Available</td>
              </tr>
            </tbody>
          </table>

          <Link href="http://localhost:3000/dashboard/vehicles" style={styles.button}>
            View Vehicle Pool
          </Link>

          <Text style={styles.footer}>
            This is an automated operational notification from TransitOps. Status changes are synced atomically in the database.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MaintenanceClosedEmail;
