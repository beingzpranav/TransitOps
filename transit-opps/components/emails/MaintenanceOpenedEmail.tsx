import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface MaintenanceOpenedEmailProps {
  vehicleReg: string;
  vehicleName: string;
  description: string;
  cost: number;
}

export function MaintenanceOpenedEmail({
  vehicleReg = 'REG-000',
  vehicleName = 'Vehicle Name',
  description = 'Maintenance Details',
  cost = 0,
}: MaintenanceOpenedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Maintenance Opened: Vehicle {vehicleReg} is In Shop</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>Maintenance Opened (In Shop)</Heading>
          <Text style={styles.p}>Vehicle <strong>{vehicleReg}</strong> has been checked into the shop and is excluded from the dispatch pool.</Text>
          
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
                <td style={styles.tableCellLabel}>Estimated Cost</td>
                <td style={styles.tableCellValue}>₹{cost.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Status</td>
                <td style={{ ...styles.tableCellValue, color: '#f59e0b', fontWeight: 'bold' }}>In Shop</td>
              </tr>
            </tbody>
          </table>

          <Link href="http://localhost:3000/dashboard/maintenance" style={styles.button}>
            View Maintenance Board
          </Link>

          <Text style={styles.footer}>
            This is an automated operational notification from TransitOps. Status changes are synced atomically in the database.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MaintenanceOpenedEmail;
