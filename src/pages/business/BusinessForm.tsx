import { useState } from 'react';
import type { Business, BusinessCategory, Location, PriceLevel, PropertyType, SustainabilityBadge } from '@/types';
import { Button, ImageUpload, Input, Select, Textarea } from '@/components/ui';
import type { BusinessInput } from '@/services/businessService';

export const BUSINESS_CATEGORIES: BusinessCategory[] = ['Accommodation', 'Tour Guides', 'Restaurants', 'Handcrafts', 'Local Products', 'Transportation', 'Community Tourism'];
export const PROPERTY_TYPES: PropertyType[] = ['Hotel', 'Lodge', 'Guesthouse', 'House', 'Apartment'];
export const BADGE_OPTIONS: SustainabilityBadge[] = ['Eco-certified', 'Community-owned', 'Women-led', 'Plastic-free', 'Solar-powered'];

interface Props {
  initial?: Business;
  locations: Location[];
  ownerId: string;
  ownerName: string;
  /** When given (admin), the listing's owner can be chosen. */
  owners?: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (input: BusinessInput) => void;
  onCancel: () => void;
}

export function BusinessForm({ initial, locations, ownerId, ownerName, owners, submitting, onSubmit, onCancel }: Props) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? ('Accommodation' as BusinessCategory),
    propertyType: initial?.propertyType ?? ('Hotel' as PropertyType),
    locationId: initial?.locationId ?? locations[0]?.id ?? '',
    description: initial?.description ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    photos: initial ? [initial.image, ...(initial.gallery ?? [])].filter(Boolean) : ([] as string[]),
    priceLevel: String(initial?.priceLevel ?? 2),
    badges: initial?.badges ?? ([] as SustainabilityBadge[]),
    ownerId: initial?.ownerId ?? ownerId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Enter the business name.';
    if (f.description.trim().length < 30) er.description = 'Describe what you offer in at least 30 characters.';
    if (f.phone.replace(/\D/g, '').length < 9) er.phone = 'Enter a phone number, e.g. +250 788 000 000.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address.';
    if (!f.photos.length) er.photos = 'Add at least one photo so travellers can see the place.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const loc = locations.find((l) => l.id === f.locationId)!;
    const owner = owners?.find((o) => o.id === f.ownerId);
    onSubmit({
      name: f.name.trim(), category: f.category, locationId: loc.id, district: loc.district.split(/[,&]/)[0].trim(),
      description: f.description.trim(), phone: f.phone.trim(), email: f.email.trim(),
      image: f.photos[0], gallery: f.photos.slice(1),
      propertyType: f.category === 'Accommodation' ? f.propertyType : undefined,
      priceLevel: Number(f.priceLevel) as PriceLevel, badges: f.badges,
      ownerId: owner?.id ?? ownerId, ownerName: owner?.name ?? ownerName,
      coordinates: initial?.coordinates ?? { lat: loc.coordinates.lat + (Math.random() - 0.5) * 0.02, lng: loc.coordinates.lng + (Math.random() - 0.5) * 0.02 },
      services: initial?.services ?? [],
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} /></div>
      <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as BusinessCategory })} options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c }))} />
      {f.category === 'Accommodation' ? (
        <Select label="Property type" value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value as PropertyType })} options={PROPERTY_TYPES.map((c) => ({ value: c, label: c }))} />
      ) : (
        <Select label="Price range" value={f.priceLevel} onChange={(e) => setF({ ...f, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
      )}
      <Select label="Nearest destination" value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
      {f.category === 'Accommodation' && (
        <Select label="Price range" value={f.priceLevel} onChange={(e) => setF({ ...f, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
      )}
      {owners && (
        <Select label="Owner" value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} options={owners.map((o) => ({ value: o.id, label: o.name }))} />
      )}
      <div className="sm:col-span-2"><Textarea label="Description" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} placeholder="What you offer, what makes it special and who runs it" /></div>
      <Input label="Phone" type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
      <Input label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
      <div className="sm:col-span-2">
        <ImageUpload label="Photos" required value={f.photos} onChange={(photos) => setF({ ...f, photos })} error={errors.photos} hint={f.category === 'Accommodation' ? 'Show the outside, the rooms and the view. Add rooms and nightly prices under Rooms & services after saving.' : undefined} />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Sustainability badges</legend>
        <div className="flex flex-wrap gap-2">
          {BADGE_OPTIONS.map((b) => {
            const on = f.badges.includes(b);
            return (
              <label key={b} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${on ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-300 text-slate-700'}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setF({ ...f, badges: on ? f.badges.filter((x) => x !== b) : [...f.badges, b] })} />
                {b}
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-sm text-slate-500">Badges are verified by Tourista admins before they appear publicly.</p>
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting}>{initial ? 'Save changes' : 'Publish listing'}</Button>
      </div>
    </form>
  );
}
