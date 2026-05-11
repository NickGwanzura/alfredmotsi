import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// PATCH /api/gas-stock/[id] - Admin: manually adjust remaining stock (spoilage/loss)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as { id: string; name?: string; role: string };
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { remaining, reason } = body;

    if (remaining == null || isNaN(parseFloat(remaining))) {
      return NextResponse.json({ error: 'remaining is required and must be a number' }, { status: 400 });
    }

    const qty = parseFloat(remaining);
    if (qty < 0) return NextResponse.json({ error: 'remaining cannot be negative' }, { status: 400 });

    const updated = await prisma.gasStockItem.update({
      where: { id },
      data: { remaining: qty },
    });

    // Log the manual adjustment directly in audit_logs (no fake jobId needed)
    if (reason) {
      const original = await prisma.gasStockItem.findUnique({ where: { id } });
      if (original && original.remaining !== qty) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            userName: user.name || 'Admin',
            action: 'adjust_stock',
            jobId: null,
            reason: `Stock adjustment for ${original.gasType} ${original.brand}: ${original.remaining} → ${qty} ${original.unit}. Reason: ${reason}`,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') || null,
            userAgent: request.headers.get('user-agent') || null,
          },
        }).catch(() => {
          // Non-critical — don't fail PATCH if audit write fails
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating gas stock:', error);
    return NextResponse.json({ error: 'Failed to update gas stock' }, { status: 500 });
  }
}

// DELETE /api/gas-stock/[id] - Admin: remove a stock item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as { id: string; name?: string; role: string };
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    // Fetch item details for audit before deletion
    const item = await prisma.gasStockItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.gasStockItem.delete({ where: { id } });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || 'Unknown',
        action: 'delete_gas_stock',
        jobId: null,
        reason: `Gas stock deleted: ${item.quantity} ${item.unit} of ${item.gasType} ${item.brand}`,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gas stock:', error);
    return NextResponse.json({ error: 'Failed to delete gas stock' }, { status: 500 });
  }
}
