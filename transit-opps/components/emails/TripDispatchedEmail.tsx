import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface TripDispatchedEmailProps {
  driverName: string;
  source: string;
  destination: string;
  vehicleReg: string;
  vehicleName: string;
  cargoWeight: number;
  plannedDistance: number;
}

export function TripDispatchedEmail({
  driverName = 'Driver',
  source = 'Source Location',
  destination = 'Destination Location',
  vehicleReg = 'REG-000',
  vehicleName = 'Vehicle Name',
  cargoWeight = 0,
  plannedDistance = 0,
}: TripDispatchedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Trip Assignment: {source} to {destination}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>New Trip Assignment</Heading>
          <Text style={styles.p}>Hello {driverName},</Text>
          <Text style={styles.p}>You have been assigned to a new trip. Below are your route and cargo details:</Text>
          
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableCellLabel}>Source</td>
                <td style={styles.tableCellValue}>{source}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Destination</td>
                <td style={styles.tableCellValue}>{destination}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Vehicle</td>
                <td style={styles.tableCellValue}>{vehicleReg} ({vehicleName})</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Cargo Weight</td>
                <td style={styles.tableCellValue}>{cargoWeight.toLocaleString()} kg</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Planned Distance</td>
                <td style={styles.tableCellValue}>{plannedDistance.toLocaleString()} km</td>
              </tr>
            </tbody>
          </table>

          <Link href="http://localhost:3000/dashboard/trips" style={styles.button}>
            View Trip Details
          </Link>

          <Text style={styles.footer}>
            This is an automated operational notification from TransitOps. If you have questions about your dispatch, please contact your Fleet Manager.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TripDispatchedEmail;
