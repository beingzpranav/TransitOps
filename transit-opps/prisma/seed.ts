import { PrismaClient, UserRole, VehicleStatus, DriverStatus, TripStatus } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding TransitOps database...');

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const [fleetManager, dispatcher, , ] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manager@transitops.com' },
      update: {},
      create: {
        email: 'manager@transitops.com',
        passwordHash,
        name: 'Alex Morgan',
        role: UserRole.FLEET_MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'dispatch@transitops.com' },
      update: {},
      create: {
        email: 'dispatch@transitops.com',
        passwordHash,
        name: 'Jordan Lee',
        role: UserRole.DISPATCHER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'safety@transitops.com' },
      update: {},
      create: {
        email: 'safety@transitops.com',
        passwordHash,
        name: 'Sam Rivera',
        role: UserRole.SAFETY_OFFICER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'finance@transitops.com' },
      update: {},
      create: {
        email: 'finance@transitops.com',
        passwordHash,
        name: 'Chris Patel',
        role: UserRole.FINANCIAL_ANALYST,
      },
    }),
  ]);

  console.log('✅ Users created');

  // ─── Vehicles ─────────────────────────────────────────────────────────────
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { registrationNumber: 'TRK-001' },
      update: {},
      create: {
        registrationNumber: 'TRK-001',
        name: 'Volvo FH16',
        type: 'Heavy Truck',
        maxLoadCapacity: 25000,
        odometer: 48200,
        acquisitionCost: 120000,
        status: VehicleStatus.Available,
        region: 'North',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'VAN-042' },
      update: {},
      create: {
        registrationNumber: 'VAN-042',
        name: 'Mercedes Sprinter',
        type: 'Van',
        maxLoadCapacity: 2000,
        odometer: 22400,
        acquisitionCost: 45000,
        status: VehicleStatus.Available,
        region: 'South',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'TRK-007' },
      update: {},
      create: {
        registrationNumber: 'TRK-007',
        name: 'MAN TGX',
        type: 'Heavy Truck',
        maxLoadCapacity: 22000,
        odometer: 91000,
        acquisitionCost: 95000,
        status: VehicleStatus.InShop,
        region: 'East',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'VAN-015' },
      update: {},
      create: {
        registrationNumber: 'VAN-015',
        name: 'Ford Transit',
        type: 'Van',
        maxLoadCapacity: 1800,
        odometer: 15600,
        acquisitionCost: 38000,
        status: VehicleStatus.Available,
        region: 'West',
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNumber: 'TRK-023' },
      update: {},
      create: {
        registrationNumber: 'TRK-023',
        name: 'Scania R500',
        type: 'Heavy Truck',
        maxLoadCapacity: 28000,
        odometer: 210000,
        acquisitionCost: 88000,
        status: VehicleStatus.Retired,
        region: 'North',
      },
    }),
  ]);

  console.log('✅ Vehicles created');

  // ─── Drivers ──────────────────────────────────────────────────────────────
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-2024-1001' },
      update: {},
      create: {
        name: 'Marcus Johnson',
        licenseNumber: 'DL-2024-1001',
        licenseCategory: 'Class A CDL',
        licenseExpiry: new Date('2027-06-30'),
        contactNumber: '+91 98765 43210',
        safetyScore: 94,
        status: DriverStatus.Available,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-2024-1002' },
      update: {},
      create: {
        name: 'Priya Sharma',
        licenseNumber: 'DL-2024-1002',
        licenseCategory: 'Class B',
        licenseExpiry: new Date('2026-12-15'),
        contactNumber: '+91 98765 43211',
        safetyScore: 88,
        status: DriverStatus.Available,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-2023-0889' },
      update: {},
      create: {
        name: 'David Chen',
        licenseNumber: 'DL-2023-0889',
        licenseCategory: 'Class A CDL',
        licenseExpiry: new Date('2025-03-01'),
        contactNumber: '+91 98765 43212',
        safetyScore: 72,
        status: DriverStatus.OffDuty,
      },
    }),
    prisma.driver.upsert({
      where: { licenseNumber: 'DL-2022-0445' },
      update: {},
      create: {
        name: 'Elena Vasquez',
        licenseNumber: 'DL-2022-0445',
        licenseCategory: 'Class B',
        licenseExpiry: new Date('2028-09-20'),
        contactNumber: '+91 98765 43213',
        safetyScore: 96,
        status: DriverStatus.Available,
      },
    }),
  ]);

  console.log('✅ Drivers created');

  // Link a driver user to Marcus Johnson (drivers[0])
  await prisma.user.upsert({
    where: { email: 'driver@transitops.com' },
    update: {
      role: UserRole.DRIVER,
      driverId: drivers[0].id,
    },
    create: {
      email: 'driver@transitops.com',
      passwordHash,
      name: 'Marcus Johnson',
      role: UserRole.DRIVER,
      driverId: drivers[0].id,
    },
  });

  // ─── Trips ────────────────────────────────────────────────────────────────
  const trip3 = await prisma.trip.create({
    data: {
      source: 'Dallas, TX',
      destination: 'Houston, TX',
      vehicleId: vehicles[1].id,
      driverId: drivers[3].id,
      createdById: dispatcher.id,
      cargoWeight: 800,
      plannedDistance: 420,
      finalOdometer: 22820,
      fuelConsumed: 68,
      status: TripStatus.Completed,
      revenuePerTrip: 2100,
    },
  });

  await prisma.trip.create({
    data: {
      source: 'Chicago, IL',
      destination: 'Detroit, MI',
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      createdById: dispatcher.id,
      cargoWeight: 12000,
      plannedDistance: 450,
      status: TripStatus.Draft,
      revenuePerTrip: 3200,
    },
  });

  await prisma.trip.create({
    data: {
      source: 'Miami, FL',
      destination: 'Orlando, FL',
      vehicleId: vehicles[3].id,
      driverId: drivers[1].id,
      createdById: fleetManager.id,
      cargoWeight: 1200,
      plannedDistance: 380,
      status: TripStatus.Draft,
      revenuePerTrip: 1800,
    },
  });

  console.log('✅ Trips created');

  // ─── Maintenance Logs ─────────────────────────────────────────────────────
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[2].id,
      description: 'Engine overhaul and brake pad replacement',
      cost: 4800,
      dateOpened: new Date('2026-07-08'),
      isActive: true,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[0].id,
      description: 'Routine oil change and tire rotation',
      cost: 320,
      dateOpened: new Date('2026-06-15'),
      dateClosed: new Date('2026-06-16'),
      isActive: false,
    },
  });

  console.log('✅ Maintenance logs created');

  // ─── Fuel Logs ────────────────────────────────────────────────────────────
  await prisma.fuelLog.createMany({
    data: [
      { vehicleId: vehicles[0].id, liters: 95, cost: 142.5, date: new Date('2026-07-01') },
      { vehicleId: vehicles[1].id, liters: 68, cost: 102, date: new Date('2026-07-03'), tripId: trip3.id },
      { vehicleId: vehicles[3].id, liters: 55, cost: 82.5, date: new Date('2026-07-05') },
      { vehicleId: vehicles[0].id, liters: 110, cost: 165, date: new Date('2026-07-08') },
      { vehicleId: vehicles[1].id, liters: 45, cost: 67.5, date: new Date('2026-07-10') },
    ],
  });

  console.log('✅ Fuel logs created');

  // ─── Expenses ─────────────────────────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      { vehicleId: vehicles[0].id, type: 'Toll', amount: 45, date: new Date('2026-07-01'), notes: 'I-94 tolls' },
      { vehicleId: vehicles[1].id, type: 'Misc', amount: 120, date: new Date('2026-07-03'), notes: 'Parking overnight' },
      { vehicleId: vehicles[3].id, type: 'Toll', amount: 28, date: new Date('2026-07-05') },
    ],
  });

  console.log('✅ Expenses created');

  // ─── System Settings ──────────────────────────────────────────────────────
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      depotName: 'Gandhinagar Depot GJ4',
      currency: 'INR (Rs)',
      distanceUnit: 'Kilometers',
    },
  });

  console.log('✅ System settings created');
  console.log('');
  console.log('🎉 Seed complete! Demo credentials (all passwords: Password123!):');
  console.log('  Fleet Manager:     manager@transitops.com');
  console.log('  Dispatcher:        dispatch@transitops.com');
  console.log('  Safety Officer:    safety@transitops.com');
  console.log('  Financial Analyst: finance@transitops.com');
  console.log('  Driver:            driver@transitops.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
