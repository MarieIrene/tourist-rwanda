import type { Business, Experience, Interest, Location, PriceLevel } from '@/types';

export type ExploreKind = 'destination' | 'experience' | 'accommodation' | 'restaurant' | 'guide' | 'business';

export type ExploreItem = {
  key: string;
  kind: ExploreKind;
  title: string;
  text: string;
  rating: number;
  reviewCount: number;
  province: string;
  priceLevel: PriceLevel;
  interests: Interest[];
  sustainable: boolean;
  createdAt: string;
  popularity: number;
} & ({ type: 'location'; node: Location } | { type: 'experience'; node: Experience } | { type: 'business'; node: Business });

const businessKind = (b: Business): ExploreKind =>
  b.category === 'Accommodation' ? 'accommodation' : b.category === 'Restaurants' ? 'restaurant' : b.category === 'Tour Guides' ? 'guide' : 'business';

const businessInterests = (b: Business): Interest[] =>
  b.category === 'Restaurants' || b.category === 'Local Products' ? ['Food'] :
  b.category === 'Handcrafts' || b.category === 'Community Tourism' ? ['Culture'] :
  b.category === 'Transportation' ? ['Adventure'] : b.category === 'Accommodation' ? ['Relaxation', 'Nature'] : ['Culture', 'Nature'];

export function buildExploreItems(locations: Location[], experiences: Experience[], businesses: Business[]): ExploreItem[] {
  const provinceOf = (locationId: string) => locations.find((l) => l.id === locationId)?.province ?? 'Rwanda';
  return [
    ...locations.map<ExploreItem>((l) => ({
      key: `l-${l.id}`, type: 'location', node: l, kind: 'destination', title: l.name, text: `${l.name} ${l.district} ${l.shortDescription} ${l.category}`,
      rating: l.rating, reviewCount: l.reviewCount, province: l.province, priceLevel: l.priceLevel, interests: l.interests,
      sustainable: l.sustainability.length > 0 && (l.isHiddenGem || l.category === 'National Park'), createdAt: l.createdAt, popularity: l.visitsLastYear,
    })),
    ...experiences.map<ExploreItem>((e) => ({
      key: `e-${e.id}`, type: 'experience', node: e, kind: 'experience', title: e.title, text: `${e.title} ${e.type} ${e.locationName} ${e.description}`,
      rating: e.rating, reviewCount: e.reviewCount, province: provinceOf(e.locationId), priceLevel: e.priceRwf < 20000 ? 1 : e.priceRwf < 50000 ? 2 : 3,
      interests: e.interests, sustainable: e.communityLed, createdAt: e.createdAt, popularity: e.reviewCount * 40,
    })),
    ...businesses.map<ExploreItem>((b) => ({
      key: `b-${b.id}`, type: 'business', node: b, kind: businessKind(b), title: b.name, text: `${b.name} ${b.category} ${b.district} ${b.description} ${b.badges.join(' ')}`,
      rating: b.rating, reviewCount: b.reviewCount, province: provinceOf(b.locationId), priceLevel: b.priceLevel, interests: businessInterests(b),
      sustainable: b.badges.length > 0, createdAt: b.createdAt, popularity: b.reviewCount * 40,
    })),
  ];
}

export type SortKey = 'popular' | 'rating' | 'newest' | 'recommended';

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

export function sortItems<T extends { rating: number; reviewCount: number; createdAt: string; popularity: number; sustainable?: boolean }>(items: T[], sort: SortKey): T[] {
  const copy = [...items];
  switch (sort) {
    case 'popular': return copy.sort((a, b) => b.popularity - a.popularity);
    case 'rating': return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'newest': return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      // Recommended: rating weighted by review volume, with a boost for sustainable options.
      return copy.sort((a, b) => score(b) - score(a));
  }
  function score(x: T) {
    return x.rating * Math.log10(x.reviewCount + 10) + (x.sustainable ? 0.6 : 0);
  }
}
