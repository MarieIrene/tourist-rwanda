import { useMemo, useState } from 'react';
import { Users, Home, Plane, TrendingUp } from 'lucide-react';
import type { Location } from '@/types';
import { getLocations, getTourismStatistics } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ErrorState, Skeleton } from '@/components/ui';
import { AddNewMenu, BarsChart, ChartCard, DataTable, DonutChart, FilterTabs, PageHeader, StatCard, StatGrid, TrendChart, type Column } from '@/components/dashboard';
import { ADMIN_ADD_NEW } from './addNewItems';
import { percentChange } from '@/utils/analytics';
import { formatCompact } from '@/utils/format';

const ranges = [{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }] as const;
type Range = (typeof ranges)[number]['value'];

const locationColumns: Column<Location>[] = [
  { id: 'name', header: 'Location', sortValue: (l) => l.name, cell: (l) => <span className="font-semibold text-ink">{l.name}</span> },
  { id: 'province', header: 'Province', sortValue: (l) => l.province, cell: (l) => l.province },
  { id: 'category', header: 'Category', sortValue: (l) => l.category, cell: (l) => <Badge tone={l.isHiddenGem ? 'solid' : 'brand'}>{l.category}</Badge> },
  { id: 'visits', header: 'Visits last year', align: 'right', sortValue: (l) => l.visitsLastYear, cell: (l) => <span className="tabular-nums">{l.visitsLastYear.toLocaleString()}</span> },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (l) => l.rating, cell: (l) => <span className="tabular-nums">{l.rating.toFixed(1)}</span> },
  { id: 'reviews', header: 'Reviews', align: 'right', sortValue: (l) => l.reviewCount, cell: (l) => <span className="tabular-nums">{l.reviewCount.toLocaleString()}</span> },
];

export default function AdminAnalyticsPage() {
  useDocumentTitle('Analytics');
  const [range, setRange] = useState<Range>('12');
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, locations] = await Promise.all([getTourismStatistics(), getLocations()]);
    return { stats, locations };
  });

  const months = Number(range);
  const trend = useMemo(() => data?.stats.monthlyTrend.slice(-months) ?? [], [data, months]);
  const previous = useMemo(() => data?.stats.monthlyTrend.slice(-months * 2, -months) ?? [], [data, months]);
  const byProvince = useMemo(() => {
    const map = new Map<string, number>();
    data?.locations.forEach((l) => l.province.split(' & ').forEach((p) => {
      const key = p.replace(/ Provinces?$/, '');
      map.set(key, (map.get(key) ?? 0) + l.visitsLastYear);
    }));
    return [...map.entries()].map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits);
  }, [data]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  const tot = trend.reduce((s, m) => ({ d: s.d + m.domestic, i: s.i + m.international }), { d: 0, i: 0 });
  const prevTot = previous.reduce((s, m) => s + m.domestic + m.international, 0);
  const total = tot.d + tot.i;
  const peak = trend.reduce((a, m) => (m.domestic + m.international > a.domestic + a.international ? m : a), trend[0] ?? { month: '—', domestic: 0, international: 0 });
  const rangeLabel = `last ${months} months`;

  return (
    <>
      <PageHeader
        title="Tourism analytics"
        intro="Trends, demand and interests to guide planning and promotion."
        action={<><FilterTabs label="Time range" value={range} onChange={setRange} options={ranges.map((r) => ({ value: r.value, label: r.label }))} /><AddNewMenu items={ADMIN_ADD_NEW} /></>}
      />

      <StatGrid>
        <StatCard label="Visitors" icon={Users} loading={loading} value={formatCompact(total)} sparkline={trend.map((m) => m.domestic + m.international)} trend={previous.length === months ? { value: percentChange(total, prevTot), label: 'vs previous period' } : undefined} hint={rangeLabel} />
        <StatCard label="Domestic share" icon={Home} tone="teal" loading={loading} value={total ? `${Math.round((tot.d / total) * 100)}%` : '—'} hint={`${formatCompact(tot.d)} domestic visitors`} />
        <StatCard label="International visitors" icon={Plane} tone="violet" loading={loading} value={formatCompact(tot.i)} sparkline={trend.map((m) => m.international)} hint={rangeLabel} />
        <StatCard label="Peak month" icon={TrendingUp} tone="amber" loading={loading} value={peak.month} hint={`${formatCompact(peak.domestic + peak.international)} visitors`} />
      </StatGrid>

      {loading || !data ? <Skeleton className="mt-6 h-96" /> : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6">
            <ChartCard title="Domestic vs international visitors" description={`${total.toLocaleString()} visitors in the ${rangeLabel}`}>
              <TrendChart data={trend} xKey="month" series={[{ key: 'international', label: 'International' }, { key: 'domestic', label: 'Domestic' }]} axisFormatter={formatCompact} height={320} />
            </ChartCard>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Visits by province" description="Based on visits recorded last year">
              <BarsChart data={byProvince} xKey="name" layout="vertical" series={[{ key: 'visits', label: 'Visits' }]} axisFormatter={formatCompact} height={260} categoryWidth={90} />
            </ChartCard>
            <ChartCard title="What travellers are looking for" description="Main interest stated by users">
              <DonutChart data={data.stats.userInterests.map((i) => ({ name: i.name as string, value: i.value }))} valueFormatter={(v) => `${v}%`} height={220} />
            </ChartCard>
          </div>
        </>
      )}

      <DataTable
        className="mt-6"
        title="Location performance"
        description="All listed locations. Select rows to export a subset."
        data={data?.locations ?? []}
        loading={loading}
        columns={locationColumns}
        getRowId={(l) => l.id}
        initialSort={{ id: 'visits', desc: true }}
        searchText={(l) => `${l.name} ${l.district} ${l.province} ${l.category}`}
        searchPlaceholder="Search locations"
        exportFileName="location-performance"
      />
    </>
  );
}
