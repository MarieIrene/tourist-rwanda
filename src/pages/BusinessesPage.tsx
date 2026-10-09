import { useMemo, useState } from 'react';
import { Search, Store } from 'lucide-react';
import { getBusinesses } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BusinessCard } from '@/components/cards';
import { ButtonLink, CardSkeletonGrid, Container, EmptyState, ErrorState, PageHeader, fieldClass } from '@/components/ui';
import type { BusinessCategory, SustainabilityBadge } from '@/types';
import { cn } from '@/utils/cn';

const categories: ('All' | BusinessCategory)[] = ['All', 'Tour Guides', 'Restaurants', 'Handcrafts', 'Local Products', 'Accommodation', 'Transportation', 'Community Tourism'];
const badges: SustainabilityBadge[] = ['Women-led', 'Community-owned', 'Eco-certified', 'Solar-powered', 'Plastic-free'];

export default function BusinessesPage() {
  useDocumentTitle('Local Businesses & Artisans');
  const { data, loading, error, reload } = useAsync(getBusinesses);
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const [badge, setBadge] = useState<SustainabilityBadge | ''>('');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter((b) =>
      (cat === 'All' || b.category === cat) && (!badge || b.badges.includes(badge)) &&
      (!t || `${b.name} ${b.ownerName} ${b.district} ${b.description}`.toLowerCase().includes(t)));
  }, [data, cat, badge, q]);

  return (
    <>
      <PageHeader title="Local businesses & artisans" intro="Book guides and stays, eat at family-run restaurants and buy directly from the people who make Rwanda's crafts and coffee.">
        <ButtonLink to="/register?role=business_owner" variant="light"><Store className="h-4 w-4" aria-hidden />List your business</ButtonLink>
      </PageHeader>
      <Container className="py-8 lg:py-10">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Search businesses</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, owner or district" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
          <label>
            <span className="sr-only">Sustainability</span>
            <select value={badge} onChange={(e) => setBadge(e.target.value as SustainabilityBadge | '')} className={`${fieldClass} h-12 rounded-full font-semibold md:w-56`}>
              <option value="">Any sustainability badge</option>
              {badges.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
        <div role="tablist" aria-label="Business category" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', cat === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 hover:border-brand-400')}>{c}</button>
          ))}
        </div>
        {loading ? <CardSkeletonGrid /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? (
          <EmptyState title="No businesses match" message="Try a different category or clear the search." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
        )}
      </Container>
    </>
  );
}
