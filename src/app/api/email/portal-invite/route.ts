import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { sendPortalInviteEmail } from '@/app/lib/email/send';
import { isAdmin } from '@/app/lib/auth/auth';

interface PortalInviteRequest {
  to: string;
  customerName: string;
  portalCode: string;
  loginUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API /email/portal-invite] Received request');
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/portal-invite] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      console.error('[API /email/portal-invite] Forbidden - not admin:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: PortalInviteRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API /email/portal-invite] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('[API /email/portal-invite] Request body:', body);

    const { to, customerName, portalCode, loginUrl } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!customerName) missingFields.push('customerName');
    if (!portalCode) missingFields.push('portalCode');

    if (missingFields.length > 0) {
      console.error('[API /email/portal-invite] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    console.log('[API /email/portal-invite] Calling sendPortalInviteEmail');

    const result = await sendPortalInviteEmail({
      to: to.trim(),
      customerName: customerName.trim(),
      portalCode: portalCode.trim(),
      loginUrl: loginUrl?.trim(),
    });

    if (!result.success) {
      console.error('[API /email/portal-invite] Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[API /email/portal-invite] Email sent successfully');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/portal-invite] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
