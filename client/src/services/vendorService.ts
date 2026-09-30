import { OFFLINE_DEMO_VENDORS } from '@/data/demoVendors';
import type { Vendor } from '@/types';
import { api, isDemoFallbackEnabled, isNetworkError, unwrap } from './api';

export interface VendorQuery {
  state?: string;
  active?: boolean;
  verified?: boolean;
  search?: string;
}

export async function fetchVendors(query: VendorQuery = {}): Promise<{ vendors: Vendor[]; offline: boolean }> {
  try {
    const params = {
      ...query,
      active: query.active === undefined ? undefined : String(query.active),
      verified: query.verified === undefined ? undefined : String(query.verified),
    };
    return { vendors: await unwrap<Vendor[]>(api.get('/vendors', { params })), offline: false };
  } catch (error) {
    if (isNetworkError(error) && isDemoFallbackEnabled()) {
      const vendors = OFFLINE_DEMO_VENDORS.filter(
        (v) =>
          (!query.state || v.state === query.state) &&
          (query.active === undefined || v.active === query.active) &&
          (query.verified === undefined || v.verified === query.verified),
      );
      return { vendors, offline: true };
    }
    throw error;
  }
}

export const fetchVendor = (id: string) => unwrap<Vendor>(api.get(`/vendors/${encodeURIComponent(id)}`));

export const setVendorActive = (id: string, active: boolean) =>
  unwrap<Vendor>(api.patch(`/vendors/${encodeURIComponent(id)}/active`, { active }));
