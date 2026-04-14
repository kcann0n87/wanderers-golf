import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPw = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPw) {
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
