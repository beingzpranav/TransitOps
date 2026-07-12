import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ServiceError } from './vehicle.service';

export const createExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: z.string().min(1, 'Expense type is required'),
  amount: z.number().positive('Amount must be > 0'),
  date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  notes: z.string().optional(),
});

export async function listExpenses(filters?: { vehicleId?: string }) {
  return prisma.expense.findMany({
    where: filters?.vehicleId ? { vehicleId: filters.vehicleId } : {},
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });
}

export async function createExpense(data: z.infer<typeof createExpenseSchema>) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new ServiceError('Vehicle not found', 404);

  return prisma.expense.create({
    data: {
      vehicleId: data.vehicleId,
      type: data.type,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes,
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
}
