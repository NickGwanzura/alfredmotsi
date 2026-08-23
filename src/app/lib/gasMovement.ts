export type ServiceGasMovement = 'used' | 'recovered' | 'reused';
export type GasStockKindValue = 'virgin' | 'recovered' | 'waste';

export function gasMovementStockDelta(type: ServiceGasMovement, quantity: number): number {
  return type === 'recovered' ? quantity : -quantity;
}

export function validateGasMovementStock(
  type: ServiceGasMovement,
  stock: { stockKind: GasStockKindValue; quantity: number; remaining: number },
  quantity: number,
): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Quantity must be a positive number';
  if (type === 'used' && stock.stockKind !== 'virgin') return 'New refrigerant must be drawn from a virgin stock cylinder';
  if (type === 'reused' && stock.stockKind !== 'recovered') return 'Reused refrigerant must be drawn from a recovered-gas cylinder';
  if (type === 'recovered' && stock.stockKind !== 'recovered') return 'Recovered refrigerant must be added to a recovered-gas cylinder';
  if (type === 'recovered' && stock.remaining + quantity > stock.quantity) return 'Recovered quantity exceeds the cylinder capacity';
  if (type !== 'recovered' && quantity > stock.remaining) return 'Insufficient stock';
  return null;
}
