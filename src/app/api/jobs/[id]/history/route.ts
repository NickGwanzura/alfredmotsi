import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/jobs/[id]/history - List all history entries for a job
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

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

// POST /api/jobs/[id]/history - Add a history entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { date, note } = body;

    // Validate job exists
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

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

// DELETE /api/jobs/[id]/history/[historyId] - Remove a history entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as { role: string };
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete history entries' }, { status: 403 });
    }

    const { id, historyId } = await params;

    // Verify entry belongs to job
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
