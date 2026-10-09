import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Leaf, ChevronLeft, User, Users, BedDouble, DoorOpen, Check } from 'lucide-react';
import { getBusinessById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FavoriteButton } from '@/components/cards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { Badge, ButtonLink, Container, ErrorState, LoadingSpinner, Rating, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import { fromPrice, isRoom } from '@/utils/pricing';
import { cn } from '@/utils/cn';
import type { Accommodation, Restaurant } from '@/types';
import NotFoundPage from './NotFoundPage';

export default function BusinessDetailsPage() {
  const { id = '' } = useParams();
  const { data: b, loading, error, reload } = useAsync(() => getBusinessById(id), [id]);
  const [photo, setPhoto] = useState(0);
  useDocumentTitle(b?.name);

  if (loading) return <LoadingSpinner label="Loading business" />;
  if (error?.includes('not found')) return <NotFoundPage what="business" />;
  if (error || !b) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const acc = b.category === 'Accommodation' ? (b as Accommodation) : null;
  const rest = b.category === 'Restaurants' ? (b as Restaurant) : null;
  const photos = [b.image, ...(b.gallery ?? [])];
  const rooms = b.services.filter(isRoom);
  const extras = b.services.filter((s) => !isRoom(s));
  const from = fromPrice(b);

  return (
    <article>
      <Container className="pt-6">
        <Link to="/businesses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />Marketplace</Link>
      </Container>
      <Container className="mt-4 grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <div>
            <SmartImage src={photos[photo] ?? b.image} alt={`${b.name}, photo ${photo + 1} of ${photos.length}`} className="aspect-[16/9] w-full rounded-3xl" />
            {photos.length > 1 && (
              <ul className="mt-3 flex gap-2 overflow-x-auto p-1" aria-label="Photos">
                {photos.map((src, i) => (
                  <li key={i} className="shrink-0">
                    <button onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo} className={cn('block overflow-hidden rounded-xl ring-2 ring-offset-2 transition', i === photo ? 'ring-brand-600' : 'ring-transparent opacity-80 hover:opacity-100')}>
                      <SmartImage src={src} alt="" className="h-16 w-24" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <header>
            <div className="flex flex-wrap gap-2">
              <Badge tone="solid">{b.propertyType ?? b.category}</Badge>
              {b.badges.map((x) => <Badge key={x} icon={<Leaf className="h-3 w-3" />}>{x}</Badge>)}
            </div>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">{b.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-brand-600" aria-hidden />{b.ownerName}</span>
              <Link to={`/destinations/${b.locationId}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{b.district}</Link>
              <Rating value={b.rating} count={b.reviewCount} />
            </div>
          </header>
          <p className="max-w-prose text-lg leading-relaxed text-slate-700">{b.description}</p>
          {(acc || rest) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Property</p><p className="font-semibold">{acc.propertyType ?? 'Accommodation'} · {rooms.reduce((n, r) => n + (r.available ?? 1), 0)} {rooms.length === 1 && rooms[0].available === 1 ? 'unit' : 'rooms'}</p></div>}
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Eco features</p><p className="font-semibold">{acc.ecoFeatures.join(', ')}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Cuisine</p><p className="font-semibold">{rest.cuisine.join(', ')}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Signature dish</p><p className="font-semibold">{rest.signatureDish}</p></div>}
            </div>
          )}

          {rooms.length > 0 && (
            <section aria-labelledby="rooms">
              <h2 id="rooms" className="font-display text-2xl font-bold text-ink">Rooms & rates</h2>
              <p className="text-slate-600">Prices are per room, per night. Choose your dates and number of rooms when you book.</p>
              <ul className="mt-4 grid gap-4">
                {rooms.map((r) => (
                  <li key={r.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-ink">{r.name}</p>
                      <p className="text-sm text-slate-600">{r.description}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-600" aria-hidden />Sleeps {r.capacity ?? 2}</span>
                        {r.bedType && <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-600" aria-hidden />{r.bedType}</span>}
                        {r.available !== undefined && <span className="inline-flex items-center gap-1.5"><DoorOpen className="h-4 w-4 text-brand-600" aria-hidden />{r.available === 1 ? 'Whole property' : `${r.available} rooms of this type`}</span>}
                      </p>
                      {!!r.amenities?.length && (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {r.amenities.map((a) => <li key={a} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"><Check className="h-3 w-3" aria-hidden />{a}</li>)}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <p className="sm:text-right"><span className="font-display text-2xl font-bold text-ink">{formatRwf(r.priceRwf)}</span><span className="block text-sm text-slate-500">per night</span></p>
                      <ButtonLink to={`/book/business/${b.id}?service=${r.id}`} size="sm">Book this room</ButtonLink>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {extras.length > 0 && (
            <section aria-labelledby="services">
              <h2 id="services" className="font-display text-2xl font-bold text-ink">{rooms.length ? 'Extras' : 'Services & prices'}</h2>
              <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {extras.map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex-1"><p className="font-semibold text-ink">{s.name}</p><p className="text-sm text-slate-600">{s.description}</p></div>
                    <p className="font-semibold text-ink">{formatRwf(s.priceRwf)} <span className="text-sm font-normal text-slate-500">{s.unit}</span></p>
                    <ButtonLink to={`/book/business/${b.id}?service=${s.id}`} size="sm">Book</ButtonLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ReviewsSection target={{ id: b.id, type: 'business', name: b.name }} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-3xl border border-slate-200 p-5">
            {from && (
              <p className="border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">From </span>
                <span className="font-display text-2xl font-bold text-ink">{formatRwf(from.priceRwf)}</span>
                <span className="text-sm text-slate-500"> {from.unit}</span>
              </p>
            )}
            <h2 className="font-display text-lg font-bold">Contact {b.ownerName.split(' ')[0]}</h2>
            <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-slate-700 hover:text-brand-600"><Phone className="h-4 w-4 text-brand-600" aria-hidden />{b.phone}</a>
            <a href={`mailto:${b.email}`} className="flex items-center gap-2 break-all text-slate-700 hover:text-brand-600"><Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />{b.email}</a>
            <div className="grid gap-2 pt-2">
              <ButtonLink to={`/book/business/${b.id}`} className="w-full">{rooms.length ? 'Check dates & book' : 'Book'}</ButtonLink>
              <a href={`mailto:${b.email}?subject=${encodeURIComponent(`Enquiry via Tourista Rwanda: ${b.name}`)}`} className={buttonClass('secondary', 'md', 'w-full')}>Send an enquiry</a>
              <FavoriteButton variant="full" className="w-full" item={{ itemId: b.id, itemType: 'business', title: b.name, subtitle: `${b.propertyType ?? b.category}, ${b.district}`, image: b.image, href: `/businesses/${b.id}` }} />
            </div>
          </div>
        </aside>
      </Container>
    </article>
  );
}
