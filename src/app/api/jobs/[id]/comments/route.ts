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

    const comments = await prisma.comment.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
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
    const { text, author, time } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        jobId: id,
        author: author || session.user.name || 'Unknown',
        text: text.trim(),
        time: time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = authorizeRole(session, ['admin', 'tech']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const commentId = request.nextUrl.searchParams.get('commentId');
    if (!commentId) {
      return NextResponse.json({ error: 'commentId query parameter is required' }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.jobId !== id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const user = session.user as { role: string; name?: string };
    if (user.role !== 'admin' && comment.author !== (user.name || session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
