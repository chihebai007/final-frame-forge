export function readOffers(value) {
  return Array.isArray(value) ? value.filter(o => o && typeof o.id === 'string' && Number.isInteger(o.quantity) && o.quantity >= 2 && o.quantity <= 100 && Number.isFinite(o.price) && o.price > 0 && typeof o.enabled === 'boolean') : [];
}
export function priceLine(product, quantity, offerId = '') {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Quantité invalide.');
  const base = Number(product.price);
  const sale = Number(product.sale_price);
  const unit = sale > 0 && sale < base ? sale : base;
  if (!offerId) return { total: unit * quantity, unit, label: '', step: 1 };
  const offer = product.packs_enabled && readOffers(product.quantity_offers).find(o => o.id === offerId && o.enabled);
  if (!offer || quantity % offer.quantity !== 0 || offer.price > base * offer.quantity) throw new Error('Ce pack n’est plus disponible. Veuillez actualiser votre panier.');
  const total = offer.price * (quantity / offer.quantity);
  return { total, unit: total / quantity, label: offer.label || `Pack ${offer.quantity}`, step: offer.quantity };
}