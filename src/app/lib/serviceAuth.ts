import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import type { AuditAction } from '@prisma/client';

export const OPERATIONS_ROLES = ['owner', 'admin', 'dispatcher', 'sales'] as const;
export const FINANCE_ROLES = ['owner', 'admin', 'accounts'] as const;
export const FIELD_ROLES = ['owner', 'admin', 'dispatcher', 'tech'] as const;

export async function serviceSession(allowed: readonly string[]) {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!allowed.includes(session.user.role as string)) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, error: null };
}

export function cleanText(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function makeReference(prefix: string): string {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `${prefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function auditServiceAction(
  session: { user?: { id?: string; name?: string | null } },
  action: AuditAction,
  reason: string,
  jobId?: string | null,
) {
  if (!session.user?.id) return;
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userName: session.user.name || 'Unknown',
      action,
      reason,
      jobId: jobId || null,
    },
  }).catch(() => undefined);
}
