import '../../public/image-url.js';
import type { Tables } from '@/integrations/supabase/types';

declare global {
  var MitinanImages: { safeImageUrl: (value: unknown) => string };
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c);
const image = (url: unknown, alt: string) => {
  const source = globalThis.MitinanImages.safeImageUrl(url);
  return source ? `<img src="${escape(source)}" alt="${escape(alt)}" loading="eager">` : '';
};
const money = (value: number) => `${new Intl.NumberFormat('fr-DZ').format(value)} DA`;
type Product = Pick<Tables<'products'>, 'id' | 'name' | 'description' | 'price' | 'sale_price' | 'stock' | 'size' | 'image_url'>;
type Review = Pick<Tables<'reviews'>, 'product_id' | 'rating'>;
type Article = Pick<Tables<'articles'>, 'title' | 'excerpt' | 'image_url'>;
type Award = Pick<Tables<'awards'>, 'title' | 'description' | 'year' | 'image_url'>;

export function renderInitialContent(html: string, texts: Record<string, string>, products: Product[], reviews: Review[], articles: Article[], awards: Award[]) {
  const cards = products.map((p) => {
    const rv = reviews.filter((r) => r.product_id === p.id);
    const average = rv.length ? rv.reduce((sum, r) => sum + r.rating, 0) / rv.length : 0;
    const base = Number(p.price), sale = Number(p.sale_price);
    const discounted = sale > 0 && sale < base;
    const photo = image(p.image_url, p.name);
    return `<article class="product-card">${photo ? `<div class="photo">${photo}</div>` : ''}<div class="body"><h3>${escape(p.name)}</h3><div class="size">${escape(p.size)}</div><button type="button" class="rating" data-reviews="${escape(p.id)}">${rv.length ? `<span class="stars">${'★★★★★'.slice(0, Math.round(average))}${'☆☆☆☆☆'.slice(0, 5 - Math.round(average))}</span> ${average.toFixed(1)} · ${rv.length} avis` : '<span class="stars dim">☆☆☆☆☆</span> Pas encore d’avis'}</button><p>${escape(p.description)}</p><div class="stock">${p.stock > 0 ? 'Disponible' : 'Rupture de stock'}</div><div class="price">${discounted ? `<s class="old-price">${money(base)}</s> ${money(sale)} <span class="discount-badge">-${Math.round((1 - sale / base) * 100)}%</span>` : money(base)}</div><div class="card-actions"><button type="button" class="btn gold" data-buy="${escape(p.id)}" ${p.stock < 1 ? 'disabled' : ''}>Commander maintenant</button><button type="button" class="btn outline" data-add="${escape(p.id)}" ${p.stock < 1 ? 'disabled' : ''}>Ajouter au panier</button></div></div></article>`;
  }).join('') || '<p>Aucun produit disponible.</p>';
  html = html.replace(/<div id="productGrid"[^>]*>[\s\S]*?<\/div>/, `<div id="productGrid" class="product-grid">${cards}</div>`);
  html = html.replace('<div id="articleGrid" class="article-grid"></div>', `<div id="articleGrid" class="article-grid">${articles.map((a) => `<article class="article-card">${image(a.image_url, a.title)}<div class="body"><small>MITINAN</small><h3>${escape(a.title)}</h3><p>${escape(a.excerpt)}</p></div></article>`).join('') || '<p>Les articles seront bientôt disponibles.</p>'}</div>`);
  html = html.replace('<div id="awardGrid" class="award-grid"></div>', `<div id="awardGrid" class="award-grid">${awards.map((a) => `<article class="award-card">${image(a.image_url, a.title)}<div class="body">${a.year ? `<small>${escape(a.year)}</small>` : ''}<h3>${escape(a.title)}</h3><p>${escape(a.description)}</p></div></article>`).join('') || '<p class="empty">Nos distinctions seront bientôt affichées ici.</p>'}</div>`);
  return html.replace(/<(\w+)\b[^>]*\bdata-image="([\w-]+)"[^>]*>/g, (tag: string, element: string, key: string) => {
    const source = globalThis.MitinanImages.safeImageUrl(texts[key]);
    if (element.toLowerCase() === 'img') return source ? tag.replace(/\s+hidden\b/, '').replace(/>$/, ` src="${escape(source)}" loading="eager">`) : tag;
    return tag.replace(/>$/, ` style="--section-image:${source ? escape(`url(${JSON.stringify(source)})`) : 'none'}">`);
  });
}