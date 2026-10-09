import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getBusinesses, getExperiences, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BusinessCard, DestinationCard, ExperienceCard } from '@/components/cards';
import { FilterButton, FilterPanel, type FilterGroup, type FilterValues } from '@/components/FilterPanel';
import { Button, CardSkeletonGrid, Container, EmptyState, ErrorState, PageHeader, fieldClass } from '@/components/ui';
import { buildExploreItems, sortItems, sortOptions, type ExploreItem, type SortKey } from '@/utils/explore';

const groups: FilterGroup[] = [
  { id: 'category', label: 'Category', type: 'checkbox', options: [
    { value: 'destination', label: 'Places' }, { value: 'experience', label: 'Activities' }, { value: 'accommodation', label: 'Hotels & lodges' },
    { value: 'restaurant', label: 'Restaurants' }, { value: 'guide', label: 'Guides' }, { value: 'business', label: 'Local businesses' },
  ] },
  { id: 'interest', label: 'Interests', type: 'checkbox', options: [
    { value: 'Culture', label: 'Cultural experiences' }, { value: 'Nature', label: 'Nature' }, { value: 'Adventure', label: 'Adventure' },
    { value: 'Food', label: 'Food' }, { value: 'Wildlife', label: 'Wildlife' }, { value: 'History', label: 'History' },
  ] },
  { id: 'province', label: 'Location', type: 'checkbox', options: [
    'City of Kigali', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province',
  ].map((p) => ({ value: p, label: p })) },
  { id: 'price', label: 'Price', type: 'checkbox', options: [{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }] },
  { id: 'rating', label: 'Rating', type: 'radio', options: [{ value: '4.5', label: '4.5 and above' }, { value: '4', label: '4.0 and above' }] },
  { id: 'sustainable', label: 'Sustainable tourism', type: 'checkbox', options: [{ value: 'yes', label: 'Eco-certified or community-led only' }] },
];

function applyFilters(items: ExploreItem[], q: string, f: FilterValues) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    const text = it.text.toLowerCase();
    if (terms.length && !terms.every((t) => text.includes(t))) return false;
    if (f.category?.length && !f.category.includes(it.kind)) return false;
    if (f.interest?.length && !f.interest.some((i) => it.interests.includes(i as never))) return false;
    if (f.province?.length && !f.province.some((p) => it.province.includes(p.replace(' Province', '')))) return false;
    if (f.price?.length && !f.price.includes(String(it.priceLevel))) return false;
    if (f.rating?.[0] && it.rating < Number(f.rating[0])) return false;
    if (f.sustainable?.length && !it.sustainable) return false;
    return true;
  });
}

export function ExploreCard({ item }: { item: ExploreItem }) {
  if (item.type === 'location') return <DestinationCard location={item.node} />;
  if (item.type === 'experience') return <ExperienceCard experience={item.node} />;
  return <BusinessCard business={item.node} />;
}

export default function ExplorePage() {
  useDocumentTitle('Explore Rwanda');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [filters, setFilters] = useState<FilterValues>(() => {
    const cat = params.get('category');
    const interest = params.get('interest');
    return { ...(cat ? { category: [cat] } : {}), ...(interest ? { interest: [interest] } : {}) };
  });
  const [sort, setSort] = useState<SortKey>('recommended');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [l, e, b] = await Promise.all([getLocations(), getExperiences(), getBusinesses()]);
    return buildExploreItems(l, e, b);
  });

  const results = useMemo(() => sortItems(applyFilters(data ?? [], query, filters), sort), [data, query, filters, sort]);
  const activeCount = Object.values(filters).reduce((s, v) => s + v.length, 0);

  const onQuery = (v: string) => {
    setQuery(v);
    const next = new URLSearchParams(params);
    if (v) next.set('q', v); else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Explore Rwanda" intro="Places, activities, stays, restaurants, guides and local makers, all in one search." />
      <Container className="py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search places, activities, hotels, restaurants, guides and businesses</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search places, activities, hotels, restaurants, guides…" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
          <div className="flex gap-2">
            <FilterButton count={activeCount} onClick={() => setSheetOpen(true)} />
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${fieldClass} h-11 rounded-full font-semibold sm:w-48`}>
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <FilterPanel groups={groups} values={filters} onChange={setFilters} open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={loading ? -1 : results.length} />
          <div>
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">{loading ? 'Loading results…' : `${results.length} result${results.length === 1 ? '' : 's'}`}</p>
            {loading ? <CardSkeletonGrid count={6} className="xl:grid-cols-3 lg:grid-cols-2" /> : error ? <ErrorState message={error} onRetry={reload} /> : results.length === 0 ? (
              <EmptyState title="Nothing matches those filters" message="Try removing a filter or searching for a district name such as Musanze or Huye." action={<Button variant="secondary" onClick={() => { setFilters({}); onQuery(''); }}>Clear search and filters</Button>} />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((it) => <ExploreCard key={it.key} item={it} />)}
              </div>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
