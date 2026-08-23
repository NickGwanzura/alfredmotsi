import type { RefrigerantMovementType } from '@/app/types';

export type CylinderLifecycleAction = 'lost' | 'disposed' | 'transfer' | 'retire';

export interface LifecycleRequestIdentity {
  action: string;
  sourceStockId: string;
  destinationStockId: string | null;
  quantity: number | null;
  reason: string;
}

export function lifecycleRequestMatches(
  stored: LifecycleRequestIdentity,
  submitted: LifecycleRequestIdentity,
): boolean {
  return stored.action === submitted.action
    && stored.sourceStockId === submitted.sourceStockId
    && (stored.destinationStockId || null) === (submitted.destinationStockId || null)
    && stored.quantity === submitted.quantity
    && stored.reason === submitted.reason;
}

export function isTransferMovement(type: RefrigerantMovementType | string): boolean {
  return type === 'transfer_out' || type === 'transfer_in';
}

export function oppositeTransferMovement(type: RefrigerantMovementType | string): 'transfer_out' | 'transfer_in' | null {
  if (type === 'transfer_out') return 'transfer_in';
  if (type === 'transfer_in') return 'transfer_out';
  return null;
}

interface TransferPairRecord {
  movementType: string;
  transferGroupId?: string | null;
  quantityUsed: number;
  quantityKg: number;
  stockDelta: number;
  gasType: string;
  reversedAt?: Date | string | null;
}

export function isValidTransferPair(original: TransferPairRecord, pair: TransferPairRecord | null): boolean {
  return Boolean(pair
    && original.transferGroupId
    && pair.transferGroupId === original.transferGroupId
    && pair.movementType === oppositeTransferMovement(original.movementType)
    && !pair.reversedAt
    && pair.quantityUsed === original.quantityUsed
    && pair.quantityKg === original.quantityKg
    && pair.stockDelta === -original.stockDelta
    && pair.gasType === original.gasType);
}
