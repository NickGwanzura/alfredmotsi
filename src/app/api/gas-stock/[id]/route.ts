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

    const user = session.user as { id: string; role: string };
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

    // Log the manual adjustment in gas usage records for audit trail
    if (reason) {
      const original = await prisma.gasStockItem.findUnique({ where: { id } });
      if (original && original.remaining !== qty) {
        const diff = original.remaining - qty;
        if (diff > 0) {
          await prisma.gasUsageRecord.create({
            data: {
              stockId: id,
              gasType: updated.gasType,
              quantityUsed: diff,
              usedBy: user.id,
              jobId: 'admin-adjustment',
              customer: 'Admin Adjustment',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
              purpose: reason || 'Manual stock adjustment',
            },
          }).catch(() => {
            // Non-critical — don't fail the PATCH if usage record creation fails
          });
        }
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as { id: string; role: string };
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await prisma.gasStockItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gas stock:', error);
    return NextResponse.json({ error: 'Failed to delete gas stock' }, { status: 500 });
  }
}
