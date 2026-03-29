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
  console.log('[API /email/user-invite] Received request');
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/user-invite] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      console.error('[API /email/user-invite] Forbidden - not admin:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: UserInviteRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/user-invite] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API /email/user-invite] Request body:', { ...body, tempPassword: '[REDACTED]' });

    const { to, userName, tempPassword, role, loginUrl } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!userName) missingFields.push('userName');
    if (!tempPassword) missingFields.push('tempPassword');
    if (!role) missingFields.push('role');

    if (missingFields.length > 0) {
      console.error('[API /email/user-invite] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    console.log('[API /email/user-invite] Calling sendUserInviteEmail');

    const result = await sendUserInviteEmail({
      to: to.trim(),
      userName: userName.trim(),
      tempPassword: tempPassword.trim(),
      role: role.trim(),
      loginUrl: loginUrl?.trim(),
    });

    if (!result.success) {
      console.error('[API /email/user-invite] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[API /email/user-invite] Email sent successfully');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/user-invite] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
