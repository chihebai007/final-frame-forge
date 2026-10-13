import { describe, it, expect } from 'vitest';
import { canDeleteOrder, canOpenTab } from '../lib/shop-access';
describe('Shop access rules', () => {
  it('allows deletion of cancelled orders only', () => {
    expect(canDeleteOrder('annulée')).toBe(true);
    for (const status of ['nouvelle', 'confirmée', 'expédiée', 'livrée']) expect(canDeleteOrder(status)).toBe(false);
  });
  it('limits managers to shop operations', () => {
    for (const tab of ['stats', 'products', 'orders', 'reviews', 'shipping', 'messages']) expect(canOpenTab('manager', tab)).toBe(true);
    for (const tab of ['articles', 'texts', 'photos', 'awards', 'team']) expect(canOpenTab('manager', tab)).toBe(false);
    expect(canOpenTab('user', 'orders')).toBe(false);
    expect(canOpenTab('admin', 'team')).toBe(true);
  });
});