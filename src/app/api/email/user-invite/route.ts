import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendPasswordResetEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

interface UserInviteRequest {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  
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


    const { to, userName, resetUrl } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!userName) missingFields.push('userName');
    if (!resetUrl) missingFields.push('resetUrl');

    if (missingFields.length > 0) {
      console.error('[API /email/user-invite] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }


    const result = await sendPasswordResetEmail({
      to: to.trim(),
      userName: userName.trim(),
      resetUrl: resetUrl.trim(),
    });

    if (!result.success) {
      console.error('[API /email/user-invite] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/user-invite] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
