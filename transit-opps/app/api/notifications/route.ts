import { NextRequest } from 'next/server';
import { getNotifications, clearAllNotifications } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const list = getNotifications();
    return Response.json(list);
  } catch (error) {
    return Response.json({ error: 'Failed to retrieve notifications' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    clearAllNotifications();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
