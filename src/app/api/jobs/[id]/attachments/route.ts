import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

type SessionUser = {
  id: string;
  role: string;
  name?: string | null;
};

async function getAccessibleJob(jobId: string, user: SessionUser) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      technicians: { select: { id: true } },
      coTechnicians: { select: { id: true } },
    },
  });

  if (!job) return { job: null, allowed: false };
  if (user.role === 'admin' || user.role === 'owner' || user.role === 'dispatcher') return { job, allowed: true };

  const assigned = [...job.technicians, ...job.coTechnicians].some(t => t.id === user.id);
  return { job, allowed: user.role === 'tech' && assigned };
}

function attachmentToClient(attachment: {
  id: string;
  jobId: string;
  fileName: string;
  contentType: string;
  size: number | null;
  dataUrl: string | null;
  url: string | null;
  note: string | null;
  uploadedBy: string | null;
  uploadedAt: Date;
  user?: { id: string; name: string } | null;
}) {
  return {
    id: attachment.id,
    jobId: attachment.jobId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
    dataUrl: attachment.dataUrl,
    url: attachment.url,
    note: attachment.note,
    uploadedBy: attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt.toISOString(),
    uploader: attachment.user ? { id: attachment.user.id, name: attachment.user.name } : null,
  };
}

// GET /api/jobs/[id]/attachments - List job evidence/photos
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = session.user as SessionUser;
    const { job, allowed } = await getAccessibleJob(id, user);

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const attachments = await prisma.jobAttachment.findMany({
      where: { jobId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(attachments.map(attachmentToClient));
  } catch (error) {
    console.error('Error fetching job attachments:', error);
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  }
}

// POST /api/jobs/[id]/attachments - Add uploaded evidence metadata and payload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = session.user as SessionUser;
    const { job, allowed } = await getAccessibleJob(id, user);

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 255) : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim().toLowerCase().slice(0, 120) : '';
    const dataUrl = typeof body.dataUrl === 'string' && body.dataUrl.trim() ? body.dataUrl.trim() : null;
    const url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
    const parsedSize = Number(body.size);
    const size = Number.isFinite(parsedSize) && parsedSize > 0 ? Math.round(parsedSize) : null;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    if (!dataUrl && !url) {
      return NextResponse.json({ error: 'Provide either dataUrl or url' }, { status: 400 });
    }

    if (url) {
      try {
        const parsedUrl = new URL(url);
        if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('invalid protocol');
      } catch {
        return NextResponse.json({ error: 'url must be a valid HTTP(S) URL' }, { status: 400 });
      }
    }

    if (dataUrl && !dataUrl.startsWith('data:')) {
      return NextResponse.json({ error: 'dataUrl must be a valid data URL' }, { status: 400 });
    }

    if (size && size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'Attachment must be 6 MB or smaller' }, { status: 400 });
    }

    if (dataUrl && dataUrl.length > MAX_ATTACHMENT_BYTES * 1.4) {
      return NextResponse.json({ error: 'Attachment payload is too large' }, { status: 400 });
    }

    const attachment = await prisma.jobAttachment.create({
      data: {
        jobId: id,
        fileName,
        contentType,
        size,
        dataUrl,
        url,
        note,
        uploadedBy: user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(attachmentToClient(attachment), { status: 201 });
  } catch (error) {
    console.error('Error creating job attachment:', error);
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
  }
}
