import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import { listExpenses, createExpense, createExpenseSchema } from '@/services/expense.service';
import { handleServiceError } from '@/services/vehicle.service';

export async function GET(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST);
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId') ?? undefined;
    const expenses = await listExpenses({ vehicleId });
    return Response.json(expenses);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST);
    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const expense = await createExpense(parsed.data);
    return Response.json(expense, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
