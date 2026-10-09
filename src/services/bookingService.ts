import type { Booking, BookingStatus, Payment } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';
import { makeId } from '@/utils/id';

export async function getBookings(filter: { userId?: string; businessIds?: string[] } = {}): Promise<Booking[]> {
  if (!USE_MOCK) return api.get<Booking[]>(filter.userId ? '/bookings/' : '/bookings/?scope=business');
  await delay();
  return read('bookings')
    .filter((b) => (!filter.userId || b.userId === filter.userId) && (!filter.businessIds || (b.businessId && filter.businessIds.includes(b.businessId))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type BookingInput = Omit<Booking, 'id' | 'status' | 'createdAt' | 'payment'>;

/** Creates a booking. With a payment it is Confirmed straight away; without one it waits as Pending (unpaid). */
export async function createBooking(input: BookingInput, payment?: Payment): Promise<Booking> {
  if (!USE_MOCK) return api.post<Booking>('/bookings/', { ...input, payment });
  await delay(600);
  const booking: Booking = { ...input, id: makeId('bk'), status: payment ? 'Confirmed' : 'Pending', payment, createdAt: new Date().toISOString() };
  write('bookings', [booking, ...read('bookings')]);
  return booking;
}

function patch(id: string, change: (b: Booking) => Booking): Booking {
  const all = read('bookings');
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) notFound('Booking');
  all[idx] = change(all[idx]);
  write('bookings', all);
  return all[idx];
}

/** Records a successful payment and confirms the booking. */
export async function payBooking(id: string, payment: Payment): Promise<Booking> {
  if (!USE_MOCK) return api.post<Booking>(`/bookings/${id}/pay/`, payment);
  await delay();
  return patch(id, (b) => ({ ...b, status: 'Confirmed', payment }));
}

/** Changes status. Canceling a paid booking refunds it. */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  if (!USE_MOCK) return api.patch<Booking>(`/bookings/${id}/`, { status });
  await delay();
  return patch(id, (b) => ({
    ...b,
    status,
    payment: status === 'Canceled' && b.payment?.status === 'Paid' ? { ...b.payment, status: 'Refunded' } : b.payment,
  }));
}
