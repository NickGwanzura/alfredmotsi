import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendUserInviteEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

interface UserInviteRequest {
  to: string;
  userName: string;
  tempPassword: string;
  role: string;
  loginUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as UserInviteRequest;
    const { to, userName, tempPassword, role, loginUrl } = body;

    if (!to || !userName || !tempPassword || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sendUserInviteEmail({
      to,
      userName,
      tempPassword,
      role,
      loginUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('Error in user-invite email route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
