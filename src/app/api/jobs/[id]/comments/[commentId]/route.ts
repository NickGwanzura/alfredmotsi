import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// DELETE /api/jobs/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, commentId } = await params;

    // Verify comment belongs to job
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.jobId !== id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only admin or comment author can delete
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
