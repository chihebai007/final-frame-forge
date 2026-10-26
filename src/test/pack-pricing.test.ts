import { describe, it, expect } from 'vitest';
import { priceLine, changeCartOffer } from '../../public/pack-pricing.js';
const product = {price:4500, sale_price:null, packs_enabled:true, quantity_offers:[{id:'two',quantity:2,price:8900,label:'Pack 2',enabled:true},{id:'three',quantity:3,price:13200,label:'Pack 3',enabled:true}]};
describe('Customizable packs', () => {
  it('charges the configured total for one or multiple packs', () => {expect(priceLine(product,2,'two').total).toBe(8900); expect(priceLine(product,6,'three').total).toBe(26400);});
  it('rejects hidden pack systems', () => {expect(() => priceLine({...product,packs_enabled:false},2,'two')).toThrow();});
  it('rejects individually hidden packs', () => {expect(() => priceLine({...product,quantity_offers:[{...product.quantity_offers[0],enabled:false}]},2,'two')).toThrow();});
  it('rejects partial packs and unknown offers', () => {expect(() => priceLine(product,3,'two')).toThrow();expect(() => priceLine(product,2,'fake')).toThrow();});
  it('keeps normal promotions for individual units', () => {expect(priceLine({...product,sale_price:4000},2).total).toBe(8000);});
  it('changes checkout offers and charges the selected pack', () => {
    const cart = changeCartOffer([{product_id:'oil',quantity:1}],{...product,stock:20},0,'two');
    expect(cart).toEqual([{product_id:'oil',quantity:2,offer_id:'two'}]);
    const line = cart[0];
    if (!line) throw new Error('Expected checkout line');
    expect(priceLine(product,line.quantity,line.offer_id).total).toBe(8900);
  });
  it('preserves pack count when switching offers', () => {
    expect(changeCartOffer([{product_id:'oil',quantity:4,offer_id:'two'}],{...product,stock:20},0,'three')[0]?.quantity).toBe(6);
  });
  it('checks stock across all offers of the same product', () => {
    expect(() => changeCartOffer([{product_id:'oil',quantity:1},{product_id:'oil',quantity:3,offer_id:'three'}],{...product,stock:4},0,'two')).toThrow();
  });
  it('merges duplicate offers without changing other products', () => {
    expect(changeCartOffer([{product_id:'oil',quantity:1},{product_id:'oil',quantity:2,offer_id:'two'},{product_id:'other',quantity:1}],{...product,stock:20},0,'two')).toEqual([{product_id:'oil',quantity:4,offer_id:'two'},{product_id:'other',quantity:1}]);
  });
});