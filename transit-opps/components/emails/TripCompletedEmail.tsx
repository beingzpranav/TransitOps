import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text, Link, Heading } from '@react-email/components';
import { emailStyles as styles } from '../../lib/mail-styles';

interface TripCompletedEmailProps {
  tripId: string;
  source: string;
  destination: string;
  driverName: string;
  vehicleReg: string;
  vehicleName: string;
  finalOdometer: number;
  fuelConsumed: number;
  fuelCost: number;
  revenue: number;
}

export function TripCompletedEmail({
  tripId = '123',
  source = 'Source Location',
  destination = 'Destination Location',
  driverName = 'Driver Name',
  vehicleReg = 'REG-000',
  vehicleName = 'Vehicle Name',
  finalOdometer = 0,
  fuelConsumed = 0,
  fuelCost = 0,
  revenue = 0,
}: TripCompletedEmailProps) {
  const profit = revenue - fuelCost;
  const fuelEfficiency = fuelConsumed > 0 ? (finalOdometer / fuelConsumed).toFixed(2) : '0';

  return (
    <Html>
      <Head />
      <Preview>Trip Completed Summary: {source} to {destination}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.logo}>TransitOps</Text>
          <Heading style={styles.h1}>Trip Completed Summary</Heading>
          <Text style={styles.p}>A dispatched trip has been successfully completed by <strong>{driverName}</strong>.</Text>
          <Text style={styles.p}>Here is the trip summary and cost rollup:</Text>
          
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.tableCellLabel}>Trip Route</td>
                <td style={styles.tableCellValue}>{source} to {destination}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Vehicle</td>
                <td style={styles.tableCellValue}>{vehicleReg} ({vehicleName})</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Final Odometer</td>
                <td style={styles.tableCellValue}>{finalOdometer.toLocaleString()} km</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Fuel Consumed</td>
                <td style={styles.tableCellValue}>{fuelConsumed.toLocaleString()} Liters</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Fuel Cost</td>
                <td style={styles.tableCellValue}>${fuelCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Fuel Efficiency</td>
                <td style={styles.tableCellValue}>{fuelEfficiency} km/L</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Revenue Generated</td>
                <td style={styles.tableCellValue}>${revenue.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={styles.tableCellLabel}>Margin / Profit</td>
                <td style={{ ...styles.tableCellValue, fontWeight: 'bold', color: profit >= 0 ? '#10b981' : '#ef4444' }}>
                  ${profit.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <Link href={`http://localhost:3000/dashboard/reports`} style={styles.button}>
            View Analytics Reports
          </Link>

          <Text style={styles.footer}>
            This is an automated operational notification from TransitOps. Use the Reports tab inside the platform to export full logs.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TripCompletedEmail;
