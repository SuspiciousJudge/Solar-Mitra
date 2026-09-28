import type { SchemeCatalogue, SubsidyScheme } from '@/types';
import { api, unwrap } from './api';

export interface SchemeQuery {
  state?: string;
  level?: 'central' | 'state';
  category?: string;
  supportType?: string;
  search?: string;
}

export const fetchSchemeCatalogue = (query: SchemeQuery = {}) =>
  unwrap<SchemeCatalogue>(api.get('/schemes', { params: query }));

export const fetchSchemes = (query: SchemeQuery = {}) =>
  fetchSchemeCatalogue(query).then((catalogue) => catalogue.schemes);

export const fetchScheme = (id: string) => unwrap<SubsidyScheme>(api.get(`/schemes/${encodeURIComponent(id)}`));
