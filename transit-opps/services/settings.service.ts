import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ServiceError } from './vehicle.service';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const systemSettingSchema = z.object({
  depotName: z.string().min(1, 'Depot name is required'),
  currency: z.string().min(1, 'Currency is required'),
  distanceUnit: z.string().min(1, 'Distance unit is required'),
});

// ─── Service Functions ─────────────────────────────────────────────────────

export async function getSystemSettings() {
  let settings = await prisma.systemSetting.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    // Self-healing / Fallback initialization if seed wasn't run or entry is missing
    settings = await prisma.systemSetting.create({
      data: {
        id: 'default',
        depotName: 'Gandhinagar Depot GJ4',
        currency: 'INR (Rs)',
        distanceUnit: 'Kilometers',
      },
    });
  }

  return settings;
}

export async function updateSystemSettings(data: z.infer<typeof systemSettingSchema>) {
  return prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {
      depotName: data.depotName,
      currency: data.currency,
      distanceUnit: data.distanceUnit,
    },
    create: {
      id: 'default',
      depotName: data.depotName,
      currency: data.currency,
      distanceUnit: data.distanceUnit,
    },
  });
}
