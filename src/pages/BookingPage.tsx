import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BedDouble, CheckCircle2, ChevronLeft, Minus, Plus, Users } from 'lucide-react';
import type { Booking, Payment, Service } from '@/types';
import { createBooking, getBusinessById, getExperienceById, getLocationById } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ButtonLink, Container, ErrorState, Input, LoadingSpinner, SmartImage, Textarea } from '@/components/ui';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { formatDate, formatRwf, todayIso } from '@/utils/format';
import { addDaysIso, periodNoun, pricingMode, quote, unitNoun } from '@/utils/pricing';
import { paymentMethodLabel } from '@/utils/payment';
import { cn } from '@/utils/cn';
import NotFoundPage from './NotFoundPage';

type TargetType = 'location' | 'experience' | 'business';

interface Bookable {
  id: string;
  type: TargetType;
  name: string;
  image: string;
  subtitle: string;
  businessId?: string;
  services: Service[];
}

const guidedFee = [10000, 30000, 80000];

async function loadBookable(type: TargetType, id: string): Promise<Bookable> {
  if (type === 'experience') {
    const e = await getExperienceById(id);
    return { id, type, name: e.title, image: e.image, subtitle: e.locationName, services: [{ id: 'main', name: e.title, description: e.duration, priceRwf: e.priceRwf, unit: 'per person' }] };
  }
  if (type === 'business') {
    const b = await getBusinessById(id);
    return { id, type, name: b.name, image: b.image, subtitle: `${b.propertyType ?? b.category}, ${b.district}`, businessId: b.id, services: b.services };
  }
  const l = await getLocationById(id);
  return { id, type: 'location', name: l.name, image: l.image, subtitle: `${l.district}, ${l.province}`, services: [{ id: 'guided', name: `Guided visit to ${l.name}`, description: 'Licensed local guide for the day', priceRwf: guidedFee[l.priceLevel - 1], unit: 'per person' }] };
}

const steps = ['Dates & rooms', 'Your details', 'Payment'];

function Stepper({ label, value, min, max, onChange, error }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; error?: string }) {
  const btn = 'grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-ink hover:border-brand-600 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}><Minus className="h-4 w-4" /></button>
        <output className="w-12 text-center font-display text-xl font-bold tabular-nums text-ink" aria-live="polite">{value}</output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}><Plus className="h-4 w-4" /></button>
        <span className="text-xs text-slate-500">max {max}</span>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function BookingPage() {
  const { type = 'location', id = '' } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const validType = (['location', 'experience', 'business'] as const).includes(type as TargetType);
  const { data: item, loading, error, reload } = useAsync(() => (validType ? loadBookable(type as TargetType, id) : Promise.reject({ message: 'not found' })), [type, id]);
  useDocumentTitle(item ? `Book ${item.name}` : 'Book');

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(params.get('service') ?? '');
  const [start, setStart] = useState(params.get('checkin') ?? '');
  const [end, setEnd] = useState(params.get('checkout') ?? '');
  const [units, setUnits] = useState(1);
  const [people, setPeople] = useState(2);
  const [info, setInfo] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  useEffect(() => {
    if (item && !item.services.some((s) => s.id === serviceId)) setServiceId(item.services[0]?.id ?? '');
  }, [item, serviceId]);

  const service = item?.services.find((s) => s.id === serviceId);
  const mode = service ? pricingMode(service.unit) : 'perPerson';
  const ranged = mode === 'stay' || mode === 'rental';
  const maxUnits = mode === 'stay' ? service?.available ?? 10 : 20;
  const maxGuests = mode === 'stay' ? (service?.capacity ?? 2) * units : 30;
  const q = useMemo(() => (service ? quote(service, { start, end, units, people }) : null), [service, start, end, units, people]);

  // Keep guests and rooms within what the chosen room allows.
  useEffect(() => { if (units > maxUnits) setUnits(Math.max(1, maxUnits)); }, [maxUnits, units]);
  useEffect(() => { if (mode === 'stay' && people > maxGuests) setPeople(maxGuests); }, [mode, maxGuests, people]);

  if (loading) return <LoadingSpinner label="Preparing your booking" />;
  if (error?.includes('not found')) return <NotFoundPage what="item to book" />;
  if (error || !item) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!start) e.start = ranged ? `Choose your ${mode === 'stay' ? 'check-in' : 'start'} date.` : 'Choose a date.';
      else if (start < todayIso()) e.start = 'Choose a date from today onwards.';
      if (ranged) {
        if (!end) e.end = `Choose your ${mode === 'stay' ? 'check-out' : 'end'} date.`;
        else if (mode === 'stay' && end <= start) e.end = 'Check-out must be after check-in.';
        else if (mode === 'rental' && end < start) e.end = 'The end date can’t be before the start date.';
      }
      if (people < 1) e.people = 'At least one guest.';
      if (mode === 'stay' && people > maxGuests) e.people = `This room sleeps ${service?.capacity} per room. Add rooms for more guests.`;
    }
    if (step === 1) {
      if (info.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email address.';
      if (info.phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a phone number with country code, e.g. +250 788 000 000.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => validateStep() && setStep((s) => s + 1);

  const onPaid = async (payment: Payment) => {
    if (!user || !service || !q) return;
    try {
      const booking = await createBooking({
        userId: user.id, customerName: info.name.trim(), customerEmail: info.email.trim(), customerPhone: info.phone.trim(),
        targetId: item.id, targetType: item.type, targetName: item.name, businessId: item.businessId,
        serviceId: service.id, serviceName: service.name,
        date: start, endDate: ranged ? end : undefined, nights: ranged ? q.periods : undefined,
        units: q.units, unitPriceRwf: service.priceRwf, people, totalRwf: q.total, notes: info.notes.trim() || undefined,
      }, payment);
      setConfirmed(booking);
      toast.success('Payment received. Your booking is confirmed.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (confirmed) {
    const p = confirmed.payment!;
    return (
      <Container className="max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Booking confirmed</h1>
        <p className="mt-2 text-slate-600">You're booked at {item.name}. A receipt has been sent to {confirmed.customerEmail}.</p>
        <dl className="mx-auto mt-8 grid max-w-md gap-3 rounded-3xl border border-slate-200 p-6 text-left text-sm">
          {[
            ['Reference', confirmed.id.toUpperCase()],
            ['Booking', confirmed.serviceName],
            [ranged ? (mode === 'stay' ? 'Stay' : 'Dates') : 'Date', ranged && confirmed.endDate ? `${formatDate(confirmed.date)} → ${formatDate(confirmed.endDate)}` : formatDate(confirmed.date)],
            [mode === 'stay' ? 'Rooms' : 'Quantity', `${confirmed.units} ${unitNoun(mode, confirmed.units ?? 1)}${mode === 'stay' ? `, ${confirmed.people} guests` : ''}`],
            ['Paid with', `${paymentMethodLabel[p.method]} (${p.account})`],
            ['Payment ref', p.reference],
          ].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}
          <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Status</dt><dd><Badge tone="success">Confirmed · Paid</Badge></dd></div>
          <div className="flex justify-between"><dt className="font-semibold">Total paid</dt><dd className="font-display text-lg font-bold">{formatRwf(confirmed.totalRwf)}</dd></div>
        </dl>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/dashboard/bookings">View my bookings</ButtonLink>
          <ButtonLink to="/explore" variant="secondary">Keep exploring</ButtonLink>
        </div>
      </Container>
    );
  }

  const rooms = item.services.filter((s) => pricingMode(s.unit) === 'stay');
  const extras = item.services.filter((s) => pricingMode(s.unit) !== 'stay');

  const serviceOption = (s: Service) => {
    const active = s.id === serviceId;
    return (
      <label key={s.id} className={cn('flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors', active ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200 hover:border-brand-300')}>
        <input type="radio" name="service" className="mt-1 accent-brand-600" checked={active} onChange={() => setServiceId(s.id)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="whitespace-nowrap font-semibold text-ink">{formatRwf(s.priceRwf)} <span className="text-sm font-normal text-slate-500">{s.unit}</span></p>
          </div>
          <p className="text-sm text-slate-600">{s.description}</p>
          {pricingMode(s.unit) === 'stay' && (
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />Sleeps {s.capacity ?? 2}</span>
              {s.bedType && <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" aria-hidden />{s.bedType}</span>}
              {s.available !== undefined && <span>{s.available} {s.available === 1 ? 'unit' : 'rooms'} of this type</span>}
            </p>
          )}
        </div>
      </label>
    );
  };

  return (
    <Container className="py-8 lg:py-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />Back</button>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Book {item.name}</h1>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Booking steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-slate-200')} />
            <span className={cn('text-xs font-semibold sm:text-sm', i === step ? 'text-brand-600' : 'text-slate-500')}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-3xl border border-slate-200 p-5 sm:p-7">
          {step === 0 && (
            <div className="space-y-6">
              {item.services.length > 1 && (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">{rooms.length ? 'Choose your room' : 'Choose a service'}</legend>
                  {rooms.map(serviceOption)}
                  {rooms.length > 0 && extras.length > 0 && <p className="pt-2 text-sm font-semibold text-ink">Extras</p>}
                  {extras.map(serviceOption)}
                </fieldset>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={ranged ? (mode === 'stay' ? 'Check-in' : 'From') : 'Date'}
                  type="date" required min={todayIso()} value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (mode === 'stay' && e.target.value && (!end || end <= e.target.value)) setEnd(addDaysIso(e.target.value, 1));
                  }}
                  error={errors.start}
                />
                {ranged && (
                  <Input label={mode === 'stay' ? 'Check-out' : 'To'} type="date" required min={start ? (mode === 'stay' ? addDaysIso(start, 1) : start) : todayIso()} value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end} />
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {mode === 'stay' && <Stepper label="Rooms" value={units} min={1} max={maxUnits} onChange={setUnits} />}
                {(mode === 'rental' || mode === 'perUnit') && <Stepper label="Quantity" value={units} min={1} max={maxUnits} onChange={setUnits} />}
                <Stepper label={mode === 'stay' ? 'Guests' : 'People'} value={people} min={1} max={maxGuests} onChange={setPeople} error={errors.people} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input label="Full name" required value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} error={errors.name} autoComplete="name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email" type="email" required value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} error={errors.email} autoComplete="email" />
                <Input label="Phone" type="tel" required value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} error={errors.phone} autoComplete="tel" placeholder="+250 788 000 000" />
              </div>
              <Textarea label="Notes for the host" value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} placeholder="Arrival time, dietary needs, accessibility…" />
            </div>
          )}

          {step === 2 && q && (
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Pay to confirm your booking</h2>
              <p className="mb-5 mt-1 text-sm text-slate-600">Your booking is confirmed as soon as payment goes through.</p>
              <PaymentForm amountRwf={q.total} defaultPhone={info.phone} onPaid={onPaid} payLabel={`Pay ${formatRwf(q.total)} and confirm`} />
            </div>
          )}

          {step < 2 && (
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {step > 0 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
              <Button onClick={next}>{step === 1 ? 'Continue to payment' : 'Continue'}</Button>
            </div>
          )}
          {step === 2 && <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>Back</Button>}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <SmartImage src={item.image} alt={item.name} className="aspect-[16/9] w-full" />
            <div className="p-5">
              <h2 className="font-display text-lg font-bold text-ink">Booking summary</h2>
              <p className="text-sm text-slate-500">{item.subtitle}</p>
              {service && q && (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">{service.name}</dt><dd className="whitespace-nowrap">{formatRwf(service.priceRwf)} <span className="text-slate-500">{service.unit}</span></dd></div>
                  {start && <div className="flex justify-between gap-3"><dt className="text-slate-500">{ranged ? (mode === 'stay' ? 'Check-in' : 'From') : 'Date'}</dt><dd>{formatDate(start)}</dd></div>}
                  {ranged && end && <div className="flex justify-between gap-3"><dt className="text-slate-500">{mode === 'stay' ? 'Check-out' : 'To'}</dt><dd>{formatDate(end)}</dd></div>}
                  {ranged && <div className="flex justify-between gap-3"><dt className="text-slate-500">Length</dt><dd>{q.periods} {periodNoun(mode, q.periods)}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">{mode === 'stay' ? 'Rooms' : mode === 'perPerson' ? 'People' : 'Quantity'}</dt><dd>{q.units}</dd></div>
                  {mode === 'stay' && <div className="flex justify-between gap-3"><dt className="text-slate-500">Guests</dt><dd>{people}</dd></div>}
                  {ranged && q.periods > 0 && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{formatRwf(service.priceRwf)} × {q.periods} {periodNoun(mode, q.periods)} × {q.units} {unitNoun(mode, q.units)}</p>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold">{formatRwf(q.total)}</dd></div>
                </dl>
              )}
              <p className="mt-3 text-xs text-slate-500">Pay by card, MTN MoMo or Airtel Money. Free cancellation refunds to the same account.</p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
