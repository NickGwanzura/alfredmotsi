import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { canViewFinancials } from '@/app/lib/permissions';
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

export function boundedStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function nonNegativeNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function boundedNumber(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

/** Remove inventory pricing from responses visible to field and operations roles. */
export function redactInventoryItem<T extends Record<string, unknown>>(item: T, role: string): T {
  if (canViewFinancials(role)) return item;
  const safeItem = { ...item };
  delete safeItem.costPrice;
  delete safeItem.sellPrice;
  return safeItem;
}

/** Verify that a field user may only operate on an assigned job. */
export async function canAccessJob(userId: string, role: string, jobId: string): Promise<boolean> {
  if (['owner', 'admin', 'dispatcher'].includes(role)) return true;
  if (role !== 'tech') return false;
  return Boolean(await prisma.job.findFirst({
    where: {
      id: jobId,
      OR: [
        { technicians: { some: { id: userId } } },
        { coTechnicians: { some: { id: userId } } },
      ],
    },
    select: { id: true },
  }));
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
