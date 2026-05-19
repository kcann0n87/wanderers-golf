import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { password, role } = await req.json();

  // Captain login (Jordan)
  if (role === 'captain') {
    const captainPw = process.env.CAPTAIN_PASSWORD || '123';
    if (password === captainPw) {
      return Response.json({ ok: true, role: 'captain' });
    }
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Full admin login
  const adminPw = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPw) {
    return Response.json({ ok: true, role: 'admin' });
  }
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
