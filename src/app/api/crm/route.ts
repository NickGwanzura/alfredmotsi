import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const role = (session.user as { role: string }).role;
    const userId = session.user.id!;
    const records = await prisma.cRMRecord.findMany({
      where: role === 'tech' ? { customer: { jobs: { some: { OR: [{ technicians: { some: { id: userId } } }, { coTechnicians: { some: { id: userId } } }] } } } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching CRM records:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['owner', 'admin', 'dispatcher', 'sales', 'tech']);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { customerId, type, subject, body: recordBody, followUp, outcome } = body;

    if (!customerId || !type || !subject || !recordBody) {
      return NextResponse.json(
        { error: 'Customer, type, subject, and body are required' },
        { status: 400 }
      );
    }

    const validTypes = ['call', 'visit', 'complaint', 'email', 'quote'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: call, visit, complaint, email, quote' },
        { status: 400 }
      );
    }

    const validOutcomes = ['positive', 'negative', 'pending', 'resolved'];
    if (outcome && !validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome. Must be one of: positive, negative, pending, resolved' },
        { status: 400 }
      );
    }

    const now = new Date();
    const record = await prisma.cRMRecord.create({
      data: {
        customerId,
        type,
        subject,
        body: recordBody,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        by: session.user.id!,
        followUp: followUp || null,
        outcome: outcome || 'pending',
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating CRM record:', error);
    return NextResponse.json({ error: 'Failed to create CRM record' }, { status: 500 });
  }
}
