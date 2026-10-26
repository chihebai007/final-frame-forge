export function readOffers(value) {
  return Array.isArray(value) ? value.filter(o => o && typeof o.id === 'string' && Number.isFinite(o.quantity) && Number.isFinite(o.price) && typeof o.enabled === 'boolean') : [];
}
export function priceLine(product, quantity, offerId = '') {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Quantité invalide.');
  const base = Number(product.price);
  const sale = Number(product.sale_price);
  const unit = sale > 0 && sale < base ? sale : base;
  if (!offerId) return { total: unit * quantity, unit, label: '', step: 1 };
  const offer = product.packs_enabled && readOffers(product.quantity_offers).find(o => o.id === offerId && o.enabled);
  if (!offer || !Number.isInteger(offer.quantity) || offer.quantity < 2 || offer.quantity > 100 || offer.price <= 0 || quantity % offer.quantity !== 0 || offer.price > base * offer.quantity) throw new Error('Ce pack n’est plus disponible. Veuillez actualiser votre panier.');
  const total = offer.price * (quantity / offer.quantity);
  return { total, unit: total / quantity, label: offer.label || `Pack ${offer.quantity}`, step: offer.quantity };
}
export function changeCartOffer(cart, product, index, offerId) {
  const line = cart[index];
  if (!line) throw new Error('Ligne invalide.');
  const current = priceLine(product,line.quantity,line.offer_id || '');
  const offer = offerId ? readOffers(product.quantity_offers).find(o => o.id === offerId && o.enabled) : null;
  if (offerId && !offer) throw new Error('Pack invalide.');
  const quantity = (line.quantity / current.step) * (offer ? offer.quantity : 1);
  priceLine(product,quantity,offerId);
  const others = cart.filter((_,i) => i !== index);
  const used = others.filter(i => i.product_id === line.product_id).reduce((sum,i) => sum + i.quantity,0);
  if (used + quantity > Math.min(product.stock,100)) throw new Error('Stock insuffisant.');
  const updated = cart.map((i,n) => n === index ? {...i,quantity,offer_id:offerId} : {...i});
  const merged = [];
  for (const i of updated) {
    const existing = merged.find(x => x.product_id === i.product_id && (x.offer_id || '') === (i.offer_id || ''));
    if (existing) existing.quantity += i.quantity;
    else merged.push(i);
  }
  return merged;
}