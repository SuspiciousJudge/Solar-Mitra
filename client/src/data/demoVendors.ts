import type { Vendor } from '@/types';

/**
 * Offline safety net only: used when the API is unreachable and VITE_DEMO_MODE
 * is enabled. The source of truth is GET /api/vendors.
 */
export const OFFLINE_DEMO_VENDORS: Vendor[] = [
  { id: 'V-001', name: 'Surya Shakti Solars', location: 'Kanpur, Uttar Pradesh', state: 'Uttar Pradesh', rating: 4.8, distanceKm: 2.4, installations: 142, empanelled: true, verified: true, active: true, phone: '+91 98XXX 11001', yearsInBusiness: 9, specialities: ['On-grid rooftop', 'Net metering support', '5-year service'] },
  { id: 'V-002', name: 'GreenVillage Energy', location: 'Kanpur, Uttar Pradesh', state: 'Uttar Pradesh', rating: 4.6, distanceKm: 5.1, installations: 89, empanelled: true, verified: true, active: true, phone: '+91 98XXX 11002', yearsInBusiness: 6, specialities: ['Rural installations', 'Hindi support', 'Subsidy paperwork help'] },
  { id: 'V-003', name: 'SunRise Rural Energy', location: 'Kanpur, Uttar Pradesh', state: 'Uttar Pradesh', rating: 4.7, distanceKm: 7.3, installations: 117, empanelled: true, verified: true, active: true, phone: '+91 98XXX 11003', yearsInBusiness: 7, specialities: ['Tin & RCC roofs', 'Battery backup options'] },
];
