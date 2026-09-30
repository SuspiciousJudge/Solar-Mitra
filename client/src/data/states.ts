export const STATES = ['Uttar Pradesh', 'Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Other'] as const;

export const STATE_SHORT: Record<string, string> = {
  'Uttar Pradesh': 'UP',
  Gujarat: 'GJ',
  'Tamil Nadu': 'TN',
  Rajasthan: 'RJ',
  Maharashtra: 'MH',
};

/** Demo location used for hyper-local vendor matching. */
export const DEMO_LOCATION = { city: 'Kanpur', state: 'Uttar Pradesh', label: 'Kanpur, Uttar Pradesh' };
