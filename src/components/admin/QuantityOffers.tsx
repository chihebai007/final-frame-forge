import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { QuantityOffer } from '../../../public/pack-pricing.js';

export function QuantityOffers({ enabled, offers, onToggle, onChange }: {enabled: boolean; offers: QuantityOffer[]; onToggle: (v: boolean) => void; onChange: (v: QuantityOffer[]) => void}) {
  const update = (id: string, value: Partial<QuantityOffer>) => onChange(offers.map(o => o.id === id ? {...o, ...value} : o));
  return <section className="space-y-4 border-t pt-5">
    <div className="flex items-center gap-3"><Switch id="packs-enabled" checked={enabled} onCheckedChange={onToggle}/><Label htmlFor="packs-enabled">Afficher les offres par quantité</Label></div>
    {offers.map((o, index) => <div key={o.id} className="space-y-3 border-b pb-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Pack {index + 1}</h3><div className="flex items-center gap-3"><Switch aria-label={`Afficher le pack ${index + 1}`} checked={o.enabled} onCheckedChange={v => update(o.id, {enabled:v})}/><Button type="button" variant="ghost" size="icon" aria-label={`Supprimer le pack ${index + 1}`} title="Supprimer le pack" onClick={() => onChange(offers.filter(x => x.id !== o.id))}><Trash2/></Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor={`qty-${o.id}`}>Quantité</Label><Input id={`qty-${o.id}`} type="number" required min={2} max={100} step={1} value={o.quantity} onChange={e => update(o.id,{quantity:Number(e.target.value)})}/></div>
        <div><Label htmlFor={`pack-price-${o.id}`}>Prix total du pack (DA)</Label><Input id={`pack-price-${o.id}`} type="number" required min={0.01} step="0.01" value={o.price} onChange={e => update(o.id,{price:Number(e.target.value)})}/></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{(['fr','en','ar'] as const).map(language => {
        const labelKey = language === 'fr' ? 'label' : language === 'en' ? 'label_en' : 'label_ar';
        const badgeKey = language === 'fr' ? 'badge' : language === 'en' ? 'badge_en' : 'badge_ar';
        return <div key={language} className="space-y-2"><Label htmlFor={`label-${language}-${o.id}`}>Libellé ({language.toUpperCase()})</Label><Input id={`label-${language}-${o.id}`} maxLength={100} dir={language === 'ar' ? 'rtl' : 'ltr'} value={o[labelKey] ?? ''} onChange={e => update(o.id,{[labelKey]:e.target.value})}/><Label htmlFor={`badge-${language}-${o.id}`}>Badge ({language.toUpperCase()})</Label><Input id={`badge-${language}-${o.id}`} maxLength={60} dir={language === 'ar' ? 'rtl' : 'ltr'} value={o[badgeKey] ?? ''} onChange={e => update(o.id,{[badgeKey]:e.target.value})}/></div>;
      })}</div>
    </div>)}
    <Button type="button" variant="outline" disabled={offers.length >= 20} onClick={() => onChange([...offers,{id:crypto.randomUUID(),quantity:2,price:0,label:'',enabled:true}])}><Plus/>Ajouter un pack</Button>
  </section>;
}