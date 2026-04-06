// In-memory store for pending bookings awaiting payment confirmation.
// Data is lost on server restart and does not persist across multiple instances.
const pendingBookings = new Map();

export function storePendingBooking(refId, data) {
  pendingBookings.set(refId, { ...data, storedAt: Date.now() });
}

export function getPendingBooking(refId) {
  return pendingBookings.get(refId) || null;
}

export function deletePendingBooking(refId) {
  pendingBookings.delete(refId);
}
