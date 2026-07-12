import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface TripCreatedEmailProps {
  driverName: string;
  source: string;
  destination: string;
  vehicleReg: string;
  vehicleName: string;
  cargoWeight: number;
  plannedDistance: number;
}

export function TripCreatedEmail({
  driverName = 'Driver',
  source = 'Source Location',
  destination = 'Destination Location',
  vehicleReg = 'REG-000',
  vehicleName = 'Vehicle Name',
  cargoWeight = 0,
  plannedDistance = 0,
}: TripCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Trip Draft Created: {source} to {destination}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>New Trip Assigned (Draft)</Heading>
          <Text style={styles.p}>Hello {driverName},</Text>
          <Text style={styles.p}>A new trip has been created and assigned to you. It is currently in draft status, awaiting dispatch. Below are the details:</Text>
          
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
            This is an automated operational notification from TransitOps. You will receive a separate notification when this trip is officially dispatched.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TripCreatedEmail;
