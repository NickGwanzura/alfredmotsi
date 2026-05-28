import { NextRequest, NextResponse } from 'next/server';
import { auth, authorizeRole } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

async function verifyJobAccess(jobId: string, userId: string, userRole: string): Promise<NextResponse | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (userRole !== 'admin') {
    const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === userId);
    if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const accessError = await verifyJobAccess(id, userId, userRole);
    if (accessError) return accessError;

    const history = await prisma.historyEntry.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin', 'tech']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    const accessError = await verifyJobAccess(id, userId, userRole);
    if (accessError) return accessError;

    const body = await request.json();
    const { date, note } = body;

    if (!note?.trim()) {
      return NextResponse.json({ error: 'History note is required' }, { status: 400 });
    }

    const entry = await prisma.historyEntry.create({
      data: {
        jobId: id,
        date: date || new Date().toISOString().split('T')[0],
        note: note.trim(),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating history entry:', error);
    return NextResponse.json({ error: 'Failed to create history entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin']);
    if (forbidden) return forbidden;

    const { id, historyId } = await params;

    const entry = await prisma.historyEntry.findUnique({ where: { id: historyId } });
    if (!entry || entry.jobId !== id) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    await prisma.historyEntry.delete({ where: { id: historyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting history entry:', error);
    return NextResponse.json({ error: 'Failed to delete history entry' }, { status: 500 });
  }
}
