import { Link } from 'react-router-dom';
import { Leaf, Bus, Recycle, Trees, HandHeart, ShoppingBag, Map as MapIcon, Route } from 'lucide-react';
import { getBusinesses, getExperiences, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SearchBar } from '@/components/layout/SearchBar';
import { BusinessCard, DestinationCard, ExperienceCard } from '@/components/cards';
import { ButtonLink, CardSkeletonGrid, Container, ErrorState, HillLines, SectionHeader, SmartImage, buttonClass } from '@/components/ui';
import { RwandaMap, type MapPoint } from '@/components/map/RwandaMap';
import { images } from '@/data/images';

const sustainability = [
  { icon: Leaf, title: 'Eco-friendly accommodation', text: 'Stay in lodges that run on solar power, harvest rainwater and hire locally.' },
  { icon: Bus, title: 'Responsible transportation', text: 'Share rides, take the express buses between towns, or cycle the Congo Nile Trail.' },
  { icon: Recycle, title: 'Waste reduction', text: 'Plastic bags are banned in Rwanda. Carry a refillable bottle and a cloth bag.' },
  { icon: Trees, title: 'Conservation', text: 'Park fees fund rangers, habitat restoration and the return of lions and rhinos.' },
  { icon: HandHeart, title: 'Supporting local communities', text: 'A share of park revenue goes to neighbouring villages for schools and clinics.' },
  { icon: ShoppingBag, title: 'Buying local products', text: 'Agaseke baskets, imigongo art and single-origin coffee, bought from the makers.' },
];

export default function HomePage() {
  useDocumentTitle();
  const locations = useAsync(getLocations);
  const experiences = useAsync(getExperiences);
  const businesses = useAsync(getBusinesses);

  const popular = locations.data?.filter((l) => l.isPopular) ?? [];
  const gems = locations.data?.filter((l) => l.isHiddenGem) ?? [];
  const mapPoints: MapPoint[] = (locations.data ?? []).map((l) => ({ id: l.id, name: l.name, coordinates: l.coordinates, kind: l.category === 'Cultural Site' ? 'cultural' : 'attraction' }));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-600">
        <SmartImage src={images.hero} alt="Terraced green hills under morning mist in Rwanda" quiet className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-600/80 via-brand-600/55 to-brand-600/85" aria-hidden />
        <HillLines className="absolute inset-x-0 bottom-0 -z-10 h-2/3 w-full text-white/20" lines={11} />
        <Container className="pb-28 pt-16 sm:pb-36 sm:pt-24 lg:pt-28">
          <div className="max-w-3xl text-white">
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Discover Rwanda. Experience More. Travel Responsibly.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white sm:text-xl">
              Explore Rwanda's hidden gems, cultural experiences, natural attractions, local businesses, and sustainable tourism opportunities.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/explore" variant="light" size="lg">Explore Rwanda</ButtonLink>
              <Link to="/itinerary" className={buttonClass('outlineLight', 'lg')}>
                <Route className="h-5 w-5" aria-hidden /> Build Your Itinerary
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Floating search */}
      <Container className="relative z-20 -mt-12 sm:-mt-10">
        <div className="mx-auto max-w-4xl">
          <SearchBar variant="hero" />
          <p className="mt-3 text-center text-sm text-slate-500">Try “gorillas”, “coffee”, “Lake Kivu” or “women-led”</p>
        </div>
      </Container>

      {/* Popular destinations */}
      <section className="py-16 sm:py-20" aria-labelledby="popular">
        <Container>
          <SectionHeader title="Popular destinations" intro="From the capital's art scene to gorilla trekking in the Virungas." action={<Link to="/destinations" className={buttonClass('secondary', 'sm')}>See all destinations</Link>} />
          {locations.loading ? <CardSkeletonGrid count={4} className="lg:grid-cols-4" /> : locations.error ? <ErrorState message={locations.error} onRetry={locations.reload} /> : (
            <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {popular.slice(0, 8).map((l) => (
                <div key={l.id} className="w-[78%] shrink-0 snap-start sm:w-auto"><DestinationCard location={l} /></div>
              ))}
            </div>
          )}
          {popular.length > 8 && (
            <p className="mt-6 text-slate-600">Also worth the trip: {popular.slice(8).map((l, i) => (
              <span key={l.id}>{i > 0 && ' and '}<Link to={`/destinations/${l.id}`} className="font-semibold text-brand-600 hover:underline">{l.name}</Link></span>
            ))}.</p>
          )}
        </Container>
      </section>

      {/* Hidden gems on a blue band */}
      <section className="bg-brand-50 py-16 sm:py-20" aria-labelledby="gems">
        <Container>
          <SectionHeader title="Hidden gems" intro="Quiet lakes, restored forests and sacred places that most visitors drive straight past." />
          {locations.loading ? <CardSkeletonGrid count={3} /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gems.map((l) => <DestinationCard key={l.id} location={l} />)}
            </div>
          )}
        </Container>
      </section>

      {/* Cultural experiences */}
      <section className="py-16 sm:py-20" aria-labelledby="culture">
        <Container>
          <SectionHeader title="Cultural experiences" intro="Dance, cook, weave and taste with the people who keep these traditions alive." action={<Link to="/experiences" className={buttonClass('secondary', 'sm')}>All experiences</Link>} />
          {experiences.loading ? <CardSkeletonGrid count={3} /> : experiences.error ? <ErrorState message={experiences.error} onRetry={experiences.reload} /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {experiences.data?.slice(0, 6).map((e) => <ExperienceCard key={e.id} experience={e} />)}
            </div>
          )}
        </Container>
      </section>

      {/* Sustainable tourism */}
      <section className="relative overflow-hidden bg-brand-600 py-16 text-white sm:py-20" aria-labelledby="sustainable">
        <HillLines className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/10" />
        <Container className="relative">
          <div className="max-w-2xl">
            <h2 id="sustainable" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Sustainable tourism</h2>
            <p className="mt-3 text-lg text-white">Travelling responsibly means your visit leaves Rwanda's forests, wildlife and villages better off. Six simple ways to do it:</p>
          </div>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
            {sustainability.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-brand-600 p-6">
                <Icon className="h-7 w-7 text-white" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-white">{text}</p>
              </li>
            ))}
          </ul>
          <ButtonLink to="/eco-tourism" variant="light" className="mt-8">Read the eco-tourism guide</ButtonLink>
        </Container>
      </section>

      {/* Local businesses */}
      <section className="py-16 sm:py-20" aria-labelledby="local">
        <Container>
          <SectionHeader title="Local businesses" intro="Guides, artisans, restaurants and stays run by Rwandans, many of them women-led and community-owned." action={<Link to="/businesses" className={buttonClass('secondary', 'sm')}>Visit the marketplace</Link>} />
          {businesses.loading ? <CardSkeletonGrid count={3} /> : businesses.error ? <ErrorState message={businesses.error} onRetry={businesses.reload} /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.data?.slice(0, 6).map((b) => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </Container>
      </section>

      {/* Map teaser */}
      <section className="pb-20" aria-labelledby="map-teaser">
        <Container>
          <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-brand-100 bg-white p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <h2 id="map-teaser" className="font-display text-3xl font-bold tracking-tight text-ink">Everything is a short drive away</h2>
              <p className="mt-3 text-lg text-slate-600">Rwanda is small enough that you can wake up in the rainforest and watch the sunset over Lake Kivu. See every attraction, stay and local business on one map, then turn your picks into a day-by-day plan.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/map"><MapIcon className="h-5 w-5" aria-hidden />Open the map</ButtonLink>
                <ButtonLink to="/itinerary" variant="secondary">Start an itinerary</ButtonLink>
              </div>
            </div>
            <Link to="/map" aria-label="Open the interactive map">
              <RwandaMap points={mapPoints} interactive={false} className="aspect-[1000/884]" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
