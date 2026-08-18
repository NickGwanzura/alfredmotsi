import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { sendPortalInviteEmail } from '@/app/lib/email/send';
import { getAppOrigin } from '@/app/lib/brand';

interface PortalInviteRequest {
  to: string;
  customerName: string;
  portalCode: string;
  loginUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  
  try {
    const session = await auth();
    
    if (!session) {
      console.error('[API /email/portal-invite] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forbidden = authorizeRole(session, ['admin']);
    if (forbidden) return forbidden;

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

    if (loginUrl) {
      try {
        const parsedLoginUrl = new URL(loginUrl.trim());
        if (parsedLoginUrl.origin !== new URL(getAppOrigin()).origin) {
          return NextResponse.json({ error: 'loginUrl must use the configured application origin' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'loginUrl must be a valid URL' }, { status: 400 });
      }
    }


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

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    console.error('[API /email/portal-invite] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
