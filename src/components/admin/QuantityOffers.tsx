import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { QuantityOffer } from '../../../public/pack-pricing.js';

export function QuantityOffers({ productName, normalPrice, enabled, offers, onToggle, onChange }: {productName: string; normalPrice: number; enabled: boolean; offers: QuantityOffer[]; onToggle: (v: boolean) => void; onChange: (v: QuantityOffer[]) => void}) {
  const update = (id: string, value: Partial<QuantityOffer>) => onChange(offers.map(o => o.id === id ? {...o, ...value} : o));
  return <section className="space-y-4 border-t pt-5">
    <h3 className="font-semibold">Offres — {productName || 'Nouveau produit'}</h3>
    <div className="flex items-center gap-3"><Switch id="packs-enabled" checked={enabled} onCheckedChange={onToggle}/><Label htmlFor="packs-enabled">Afficher dans la commande</Label></div>
    {offers.map((o, index) => <div key={o.id} className="space-y-3 border-b pb-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Pack {index + 1}</h3><div className="flex items-center gap-3"><Switch aria-label={`Afficher le pack ${index + 1}`} checked={o.enabled} onCheckedChange={v => update(o.id, {enabled:v})}/><Button type="button" variant="ghost" size="icon" aria-label={`Supprimer le pack ${index + 1}`} title="Supprimer le pack" onClick={() => onChange(offers.filter(x => x.id !== o.id))}><Trash2/></Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor={`qty-${o.id}`}>Unités dans le pack</Label><Input id={`qty-${o.id}`} type="number" required min={2} max={100} step={1} value={o.quantity} onChange={e => update(o.id,{quantity:Number(e.target.value)})}/></div>
        <div><Label htmlFor={`pack-price-${o.id}`}>Prix total du pack (DA)</Label><Input id={`pack-price-${o.id}`} type="number" required min={0.01} step="0.01" value={o.price} onChange={e => update(o.id,{price:Number(e.target.value)})}/></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor={`label-fr-${o.id}`}>Nom de l’offre</Label><Input id={`label-fr-${o.id}`} maxLength={100} placeholder={`Pack de ${o.quantity}`} value={o.label ?? ''} onChange={e => update(o.id,{label:e.target.value})}/></div>
        <div><Label htmlFor={`badge-fr-${o.id}`}>Mention (facultatif)</Label><Input id={`badge-fr-${o.id}`} maxLength={60} placeholder="Le plus choisi" value={o.badge ?? ''} onChange={e => update(o.id,{badge:e.target.value})}/></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="text-muted-foreground">Prix normal : {new Intl.NumberFormat('fr-DZ').format(normalPrice * o.quantity)} DA</span><strong>Pack : {new Intl.NumberFormat('fr-DZ').format(o.price)} DA</strong>{o.price > 0 && o.price <= normalPrice * o.quantity && <span className="text-muted-foreground">Économie : {new Intl.NumberFormat('fr-DZ').format(normalPrice * o.quantity - o.price)} DA</span>}</div>
      <details><summary className="cursor-pointer text-sm text-muted-foreground">Traductions EN / AR</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['en','ar'] as const).map(language => {
        const labelKey = language === 'fr' ? 'label' : language === 'en' ? 'label_en' : 'label_ar';
        const badgeKey = language === 'fr' ? 'badge' : language === 'en' ? 'badge_en' : 'badge_ar';
        return <div key={language} className="space-y-2"><Label htmlFor={`label-${language}-${o.id}`}>Libellé ({language.toUpperCase()})</Label><Input id={`label-${language}-${o.id}`} maxLength={100} dir={language === 'ar' ? 'rtl' : 'ltr'} value={o[labelKey] ?? ''} onChange={e => update(o.id,{[labelKey]:e.target.value})}/><Label htmlFor={`badge-${language}-${o.id}`}>Badge ({language.toUpperCase()})</Label><Input id={`badge-${language}-${o.id}`} maxLength={60} dir={language === 'ar' ? 'rtl' : 'ltr'} value={o[badgeKey] ?? ''} onChange={e => update(o.id,{[badgeKey]:e.target.value})}/></div>;
      })}</div></details>
    </div>)}
    <Button type="button" variant="outline" disabled={offers.length >= 20} onClick={() => onChange([...offers,{id:crypto.randomUUID(),quantity:2,price:normalPrice * 2,label:'',enabled:true}])}><Plus/>Ajouter un pack</Button>
  </section>;
}