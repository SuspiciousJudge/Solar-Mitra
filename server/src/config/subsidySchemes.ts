/**
 * SUBSIDY SCHEME CATALOGUE — DEMO ASSUMPTIONS ONLY.
 *
 * A typed, versioned catalogue of central and state solar programmes, used to
 * power the operator "Scheme" filter, the scheme reference page and the
 * "which scheme applies to whom" guidance.
 *
 * Every entry is flagged `isDemoAssumption: true`: amounts are simulation
 * inputs for this prototype, not official figures. Each card in the UI renders
 * the "Demo policy assumption — verify against official portal" label and links
 * to the official source. Always confirm against the MNRE / state / DISCOM
 * notification before quoting a number to a household.
 *
 * Residential numbers are cross-checked against the calculator in
 * `server/tests/subsidySchemes.test.ts`, so the catalogue and
 * `policyConfig.ts` can never drift apart.
 */
import { DEMO_POLICY } from './policyConfig';

export type SchemeLevel = 'central' | 'state';
export type SchemeCategory =
  | 'residential_rooftop'
  | 'group_housing'
  | 'agriculture_pump'
  | 'agriculture_grid'
  | 'commercial';

export type SchemeCalc =
  | { type: 'per_kw_slab'; slabs: { uptoKW: number; perKW: number }[]; capINR?: number }
  | { type: 'percent_of_cost'; percent: number; capINR?: number }
  | { type: 'flat'; amountINR: number };

/** How the money actually reaches the beneficiary — drives how we describe it. */
export type SupportType =
  | 'consumer_subsidy'
  | 'project_support'
  | 'manufacturing_incentive'
  | 'policy_incentive'
  | 'regulatory_mechanism';

export interface SubsidyScheme {
  id: string;
  name: string;
  shortName: string;
  level: SchemeLevel;
  /** For state schemes: the state/UT name. */
  state?: string;
  category: SchemeCategory;
  eligibility: string[];
  calc: SchemeCalc;
  specialCategoryOverride?: SchemeCalc;
  /** Scheme ids that can be combined with this one. */
  stackableWith: string[];
  disbursementRoute: string;
  officialUrl?: string;
  lastVerified: string;
  isDemoAssumption: true;
  // ── Optional, additive metadata ────────────────────────────────────────────
  supportType?: SupportType;
  /** Shown instead of a computed amount for programme-level schemes. */
  displayAmount?: string;
  notes?: string;
}

export const SCHEME_CATALOGUE_VERSION = '2026.09-demo.1';
export const SCHEME_LAST_VERIFIED = '2026-09-01';
export const SCHEME_DISCLAIMER = 'Demo policy assumption — verify against the official portal';

/** MNRE state-policy repository — a single entry point for state notifications. */
const MNRE_STATE_POLICIES = 'https://mnre.gov.in/en/policies-and-guidelines/state-policies/';

const stateTopUpByKey = new Map(
  Object.entries(DEMO_POLICY.stateTopUp).map(([state, amount]) => [state.replace(/\s+/g, '').toLowerCase(), { state, amount }]),
);

/** Reads the demo state top-up for a state name using the calculator's normalisation. */
export function configuredStateTopUp(state: string): { state: string; amount: number } | undefined {
  return stateTopUpByKey.get(state.replace(/\s+/g, '').toLowerCase());
}

const stateTopUpScheme = (id: string, state: string, amount: number, officialUrl: string, notes: string, lastVerified = SCHEME_LAST_VERIFIED): SubsidyScheme => ({
  id,
  name: `${state} rooftop solar state top-up`,
  shortName: `${state} top-up`,
  level: 'state',
  state,
  category: 'residential_rooftop',
  eligibility: [
    'Residential rooftop system registered on the national portal',
    'Consumer of the state DISCOM with an active grid connection',
    'State top-up is released in addition to the central CFA',
  ],
  calc: { type: 'flat', amountINR: amount },
  stackableWith: ['pm-surya-ghar-rts'],
  disbursementRoute: 'Credited to the consumer bank account after the state/DISCOM verification of the commissioned system',
  officialUrl,
  lastVerified,
  isDemoAssumption: true,
  supportType: 'consumer_subsidy',
  notes,
});

/** States that currently carry a configured top-up in the demo policy. */
export const STATE_TOP_UP_SCHEMES: SubsidyScheme[] = [
  stateTopUpScheme('up-rts-topup', 'Uttar Pradesh', DEMO_POLICY.stateTopUp['Uttar Pradesh'] ?? 0, 'https://upneda.org.in/', 'State top-up amount is a demo assumption for this prototype.'),
  stateTopUpScheme('gj-rts-topup', 'Gujarat', DEMO_POLICY.stateTopUp.Gujarat ?? 0, 'https://geda.gujarat.gov.in/', 'Older Gujarat rooftop-subsidy articles should not be used — always check the current policy.'),
  stateTopUpScheme('tn-rts-topup', 'Tamil Nadu', DEMO_POLICY.stateTopUp.TamilNadu ?? DEMO_POLICY.stateTopUp['Tamil Nadu'] ?? 0, 'https://www.tangedco.gov.in/', 'State top-up amount is a demo assumption for this prototype.'),
];

const stateTopUpIds = STATE_TOP_UP_SCHEMES.map((scheme) => scheme.id);

export const SUBSIDY_SCHEMES: SubsidyScheme[] = [
  // ── Central: residential rooftop ───────────────────────────────────────────
  {
    id: 'pm-surya-ghar-rts',
    name: 'PM Surya Ghar: Muft Bijli Yojana — residential rooftop',
    shortName: 'PM Surya Ghar RTS',
    level: 'central',
    category: 'residential_rooftop',
    eligibility: [
      'Individual residential household with a grid-connected electricity connection',
      'Installation by an MNRE-empanelled vendor through the national portal',
      'Modules must meet the applicable ALMM requirements',
      'CFA is released after installation and DISCOM verification — not as an upfront cash transfer',
    ],
    calc: { type: 'per_kw_slab', slabs: [{ uptoKW: 2, perKW: 30000 }, { uptoKW: 3, perKW: 18000 }], capINR: 78000 },
    stackableWith: stateTopUpIds.concat('pm-surya-ghar-ghs'),
    disbursementRoute: 'Credited to the consumer bank account via the national portal after net-meter commissioning and DISCOM verification',
    officialUrl: 'https://pmsuryaghar.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
    notes: 'Central CFA does not keep increasing per kW beyond 3 kW — the ceiling stays at the 3 kW amount.',
  },
  {
    id: 'pm-surya-ghar-ghs',
    name: 'PM Surya Ghar — Group Housing Societies / RWAs (common facilities)',
    shortName: 'PM Surya Ghar GHS/RWA',
    level: 'central',
    category: 'group_housing',
    eligibility: [
      'Registered Group Housing Society, Resident Welfare Association or similar association',
      'Covers common-area lighting, lifts, water pumps and shared loads',
      'Capacity and household limits apply as per the current guidelines',
    ],
    calc: { type: 'per_kw_slab', slabs: [{ uptoKW: 500, perKW: 18000 }], capINR: 9000000 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'Credited to the society/RWA account through the national portal after verification',
    officialUrl: 'https://pmsuryaghar.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
    notes: 'Demo slab used to illustrate common-facility support; actual limits follow the current guidelines.',
  },

  // ── Central: agriculture (PM-KUSUM) ────────────────────────────────────────
  {
    id: 'pm-kusum-a',
    name: 'PM-KUSUM Component A — decentralised grid-connected solar plants',
    shortName: 'PM-KUSUM A',
    level: 'central',
    category: 'agriculture_grid',
    eligibility: [
      'Individual farmers, groups of farmers, cooperatives, panchayats, FPOs, water user associations',
      'Project size between 500 kW and 2 MW on eligible land',
      'Electricity is sold to the DISCOM under the approved tariff / power-purchase arrangement',
      'Where the farmer cannot fund equity, a developer/DISCOM route may apply with lease rent to the landowner',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-kusum-c-fls'],
    disbursementRoute: 'Power-purchase payments by the DISCOM under the approved tariff (not a household capital subsidy)',
    officialUrl: 'https://pmkusum.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'project_support',
    displayAmount: 'Tariff-based power purchase — no per-household capital subsidy',
    notes: 'Programme-level support. Farmers earn through the power-purchase arrangement or land lease.',
  },
  {
    id: 'pm-kusum-b',
    name: 'PM-KUSUM Component B — standalone solar agriculture pumps',
    shortName: 'PM-KUSUM B',
    level: 'central',
    category: 'agriculture_pump',
    eligibility: [
      'Farmers needing irrigation where grid supply is unavailable or unsuitable',
      'Pump capacity within the limits notified under the programme',
      'Central CFA plus a state share, with the beneficiary paying the balance',
    ],
    calc: { type: 'percent_of_cost', percent: 30 },
    specialCategoryOverride: { type: 'percent_of_cost', percent: 45 },
    stackableWith: [],
    disbursementRoute: 'Adjusted against the system cost through the state implementation agency; the farmer pays the balance',
    officialUrl: 'https://pmkusum.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
    notes: 'States add at least a matching share; the beneficiary contribution varies by state and financing arrangement.',
  },
  {
    id: 'pm-kusum-c-pump',
    name: 'PM-KUSUM Component C — solarisation of existing agricultural pumps',
    shortName: 'PM-KUSUM C (pump)',
    level: 'central',
    category: 'agriculture_pump',
    eligibility: [
      'Farmer already running a grid-connected agricultural pump',
      'Solar system sized to the existing pump',
      'Surplus electricity can be supplied to the DISCOM where the state framework allows it',
    ],
    calc: { type: 'percent_of_cost', percent: 30 },
    specialCategoryOverride: { type: 'percent_of_cost', percent: 45 },
    stackableWith: ['pm-kusum-c-fls'],
    disbursementRoute: 'Adjusted against the system cost through the state agency; surplus-energy settlement as per the state regulation',
    officialUrl: 'https://pmkusum.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
  },
  {
    id: 'pm-kusum-c-fls',
    name: 'PM-KUSUM Component C — feeder level solarisation (FLS)',
    shortName: 'PM-KUSUM C-FLS',
    level: 'central',
    category: 'agriculture_grid',
    eligibility: [
      'Implemented by DISCOMs / state agencies for agricultural feeders',
      'CFA released against eligible cost and milestones',
      'Provides daytime solar power to agricultural feeders',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'CFA released to the implementing DISCOM against milestones',
    officialUrl: 'https://pmkusum.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'project_support',
    displayAmount: 'DISCOM-level CFA against eligible cost and milestones',
  },

  // ── Central: off-grid / tribal (PM-JANMAN) ─────────────────────────────────
  {
    id: 'pm-janman-shl',
    name: 'PM-JANMAN — solar home lighting for un-electrified PVTG households',
    shortName: 'PM-JANMAN SHL',
    level: 'central',
    category: 'residential_rooftop',
    eligibility: [
      'Scattered un-electrified Particularly Vulnerable Tribal Group (PVTG) households',
      'Where grid electricity is not technically or economically feasible',
      'Includes solar PV, battery, LED lighting, fan and appliances with 5-year maintenance',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'System supplied free of cost to the eligible household by the implementing agency',
    officialUrl: 'https://pmjanman.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
    displayAmount: 'Free of cost to eligible households (5-year maintenance)',
  },
  {
    id: 'pm-janman-mini-grid',
    name: 'PM-JANMAN — solar mini-grids for PVTG habitations',
    shortName: 'PM-JANMAN Mini-grid',
    level: 'central',
    category: 'residential_rooftop',
    eligibility: ['Clusters of un-electrified PVTG households', 'Mini-grid with panels, battery bank, distribution lines and meters'],
    calc: { type: 'flat', amountINR: 50000 },
    stackableWith: [],
    disbursementRoute: 'CFA released to the implementing agency per un-electrified household covered',
    officialUrl: 'https://pmjanman.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'consumer_subsidy',
    displayAmount: 'Up to ₹50,000 CFA per un-electrified household',
  },
  {
    id: 'pm-janman-mpc',
    name: 'PM-JANMAN — solarisation of Multi-Purpose Centres',
    shortName: 'PM-JANMAN MPC',
    level: 'central',
    category: 'commercial',
    eligibility: ['Eligible Multi-Purpose Centres where a grid connection is not feasible', 'Solar power system for the centre'],
    calc: { type: 'flat', amountINR: 100000 },
    stackableWith: [],
    disbursementRoute: 'CFA released to the implementing agency per Multi-Purpose Centre',
    officialUrl: 'https://pmjanman.mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'project_support',
    displayAmount: 'Up to ₹1 lakh CFA per Multi-Purpose Centre',
  },

  // ── Central: large projects, government & industry ─────────────────────────
  {
    id: 'solar-parks',
    name: 'Development of Solar Parks and Ultra Mega Solar Power Projects',
    shortName: 'Solar Parks',
    level: 'central',
    category: 'commercial',
    eligibility: ['State agencies / solar power park developers', 'Not a household subsidy — develops park infrastructure'],
    calc: { type: 'flat', amountINR: 2500000 },
    stackableWith: [],
    disbursementRoute: 'CFA released to the park developer against DPR and infrastructure milestones',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'project_support',
    displayAmount: 'DPR support up to ₹25 lakh per park; infrastructure CFA up to ₹20 lakh/MW or 30% of eligible cost',
  },
  {
    id: 'cpsu-phase-ii',
    name: 'CPSU Scheme Phase-II (grid-connected solar PV by government entities)',
    shortName: 'CPSU Phase-II',
    level: 'central',
    category: 'commercial',
    eligibility: ['Central/State PSUs and government organisations', 'Domestic-content requirements apply'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Viability Gap Funding disbursed to the selected bidder',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'project_support',
    displayAmount: '₹8,580 crore VGF programme — support determined by competitive bidding',
  },
  {
    id: 'pli-solar-modules',
    name: 'PLI — National Programme on High Efficiency Solar PV Modules',
    shortName: 'PLI Solar PV',
    level: 'central',
    category: 'commercial',
    eligibility: ['Selected manufacturers of high-efficiency solar PV modules', 'Not available to households'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Production-linked incentive paid to the manufacturer on eligible sales',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'manufacturing_incentive',
    displayAmount: '₹24,000 crore outlay (Tranche I ₹4,500 Cr + Tranche II ₹19,500 Cr)',
  },
  {
    id: 'almm',
    name: 'ALMM — Approved List of Models and Manufacturers',
    shortName: 'ALMM',
    level: 'central',
    category: 'commercial',
    eligibility: ['Applies to modules/models used in government-supported projects', 'Check the current ALMM list before purchase'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Regulatory eligibility condition — no money is disbursed under this list',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'regulatory_mechanism',
    displayAmount: 'Regulatory eligibility list — not a subsidy amount',
  },
  {
    id: 'renewable-purchase-obligation',
    name: 'Renewable Purchase Obligation (RPO)',
    shortName: 'RPO',
    level: 'central',
    category: 'commercial',
    eligibility: ['Obligated entities required to procure a share of renewable electricity'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Market obligation — no subsidy is disbursed to consumers',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'regulatory_mechanism',
    displayAmount: 'Procurement obligation — not a subsidy amount',
  },
  {
    id: 'renewable-energy-certificates',
    name: 'Renewable Energy Certificates (REC)',
    shortName: 'REC',
    level: 'central',
    category: 'commercial',
    eligibility: ['Eligible renewable generators, subject to registration and regulations'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Certificates traded in the prescribed market mechanism',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'regulatory_mechanism',
    displayAmount: 'Tradable certificates — not a household subsidy',
  },
  {
    id: 'green-energy-open-access',
    name: 'Green Energy Open Access',
    shortName: 'Open Access',
    level: 'central',
    category: 'commercial',
    eligibility: ['Eligible industrial and large commercial consumers', 'Subject to state regulations, charges and banking rules'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: [],
    disbursementRoute: 'Open-access settlement through the DISCOM/regulator framework',
    officialUrl: 'https://mnre.gov.in/',
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'regulatory_mechanism',
    displayAmount: 'Open-access procurement mechanism — no subsidy amount',
  },

  // ── State schemes configured in the demo policy ────────────────────────────
  ...STATE_TOP_UP_SCHEMES,

  // ── State programmes and policies ──────────────────────────────────────────
  {
    id: 'gj-sky',
    name: 'Suryashakti Kisan Yojana (SKY) — Gujarat agricultural solarisation',
    shortName: 'Gujarat SKY',
    level: 'state',
    state: 'Gujarat',
    category: 'agriculture_pump',
    eligibility: ['Participating Gujarat farmers with agricultural connections', 'Solar generation for irrigation with surplus sold to the grid'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-kusum-b', 'pm-kusum-c-pump'],
    disbursementRoute: 'Settlement of surplus generation through the DISCOM under the state framework',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Participating-farmer terms per the current state notification',
    notes: 'Do not treat SKY as a substitute for the current PM-KUSUM application route.',
  },
  {
    id: 'gj-re-policy-2023',
    name: 'Gujarat Renewable Energy Policy 2023',
    shortName: 'Gujarat RE 2023',
    level: 'state',
    state: 'Gujarat',
    category: 'commercial',
    eligibility: ['Renewable project developers in Gujarat', 'Rooftop and utility-scale provisions'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts', 'gj-rts-topup'],
    disbursementRoute: 'Policy incentives (duty/charge concessions where applicable) per the current notification',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — a state solar policy is not automatically a cash subsidy',
  },
  {
    id: 'up-solar-policy-2022',
    name: 'Uttar Pradesh Solar Energy Policy 2022',
    shortName: 'UP Solar 2022',
    level: 'state',
    state: 'Uttar Pradesh',
    category: 'residential_rooftop',
    eligibility: ['Rooftop and utility-scale solar in Uttar Pradesh', 'Targets under the state policy framework'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts', 'up-rts-topup'],
    disbursementRoute: 'State incentives notified by UPNEDA from time to time',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — check the current UPNEDA notification',
  },
  {
    id: 'rj-solar-policy',
    name: 'Rajasthan solar policy — rooftop & utility-scale incentives',
    shortName: 'Rajasthan Solar',
    level: 'state',
    state: 'Rajasthan',
    category: 'commercial',
    eligibility: ['Rooftop and large-scale solar projects in Rajasthan', 'Land, duty and transmission concessions where notified'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State incentives per the current notification',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — not a fixed per-household amount',
  },
  {
    id: 'tn-solar-policy-2019',
    name: 'Tamil Nadu Solar Energy Policy 2019',
    shortName: 'TN Solar 2019',
    level: 'state',
    state: 'Tamil Nadu',
    category: 'residential_rooftop',
    eligibility: ['Rooftop and utility-scale solar in Tamil Nadu', 'TANGEDCO net-metering process applies'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts', 'tn-rts-topup'],
    disbursementRoute: 'State incentives and net-metering settlement through TANGEDCO',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — check the current TANGEDCO/state notification',
  },
  {
    id: 'ka-re-policy-2022',
    name: 'Karnataka Renewable Energy Policy 2022-2027',
    shortName: 'Karnataka RE 2022-27',
    level: 'state',
    state: 'Karnataka',
    category: 'commercial',
    eligibility: ['Additional renewable capacity including up to 1 GW of rooftop solar', 'Net-metering and open-access provisions'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State incentives and DISCOM settlement per the policy',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — capacity targets, not a per-household subsidy',
  },
  {
    id: 'jh-solar-policy-2022',
    name: 'Jharkhand State Solar Policy 2022',
    shortName: 'Jharkhand Solar 2022',
    level: 'state',
    state: 'Jharkhand',
    category: 'commercial',
    eligibility: ['Solar parks, rooftop and decentralised solar in Jharkhand'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State incentives per the current notification',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — 4,000 MW cumulative target by 2027 (policy target, not a subsidy)',
  },
  {
    id: 'uk-solar-policy-2023',
    name: 'Uttarakhand State Solar Policy 2023',
    shortName: 'Uttarakhand Solar 2023',
    level: 'state',
    state: 'Uttarakhand',
    category: 'residential_rooftop',
    eligibility: ['Decentralised and distributed solar across Uttarakhand', 'Special-category central support can apply'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State incentives per the current notification',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives — ~2,500 MW target by Dec 2027 (policy target, not a subsidy)',
  },
  {
    id: 'sk-rts-policy',
    name: 'Sikkim Grid Connected Rooftop Solar PV System Policy',
    shortName: 'Sikkim Rooftop',
    level: 'state',
    state: 'Sikkim',
    category: 'residential_rooftop',
    eligibility: ['Grid-connected rooftop systems in Sikkim', 'Central rooftop support can be combined with state/DISCOM arrangements'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State/DISCOM process per the current notification',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy framework — state support as notified',
  },
  {
    id: 'dl-rts-support',
    name: 'Delhi PM-Surya Ghar portal support (state implementation)',
    shortName: 'Delhi RTS',
    level: 'state',
    state: 'Delhi',
    category: 'residential_rooftop',
    eligibility: ['Delhi households applying through the dedicated state portal', 'First phase targeted a large multi-lakh household rollout'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'Processed through the Delhi implementation portal alongside the central CFA',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'State implementation support — amounts per the current Delhi notification',
  },
  {
    id: 'br-rts-support',
    name: 'Bihar rooftop solar state support',
    shortName: 'Bihar RTS',
    level: 'state',
    state: 'Bihar',
    category: 'residential_rooftop',
    eligibility: ['Bihar households under the state rooftop programme', 'Central CFA plus any applicable state support'],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'State implementation process — amounts are still being notified',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Announced state support — check the current Bihar notification before quoting any amount',
  },
  {
    id: 'mn-remote-solar',
    name: 'Manipur / Meghalaya / Mizoram / Nagaland / Tripura — off-grid & decentralised solar',
    shortName: 'NE off-grid solar',
    level: 'state',
    state: 'Manipur',
    category: 'residential_rooftop',
    eligibility: [
      'Remote and off-grid habitations across the North-Eastern states',
      'Solar home systems, mini-grids and decentralised solar',
      'Special-category central CFA applies to eligible central programmes',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-janman-shl', 'pm-janman-mini-grid'],
    disbursementRoute: 'Delivered through the state renewable-energy agency',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Programme delivery through the state agency — check the current state notification',
  },
  {
    id: 'an-lakshadweep-islands',
    name: 'Andaman & Nicobar Islands and Lakshadweep — island solar programme',
    shortName: 'Island solar',
    level: 'state',
    state: 'Andaman and Nicobar Islands',
    category: 'residential_rooftop',
    eligibility: [
      'Island households and institutions with high diesel-based generation',
      'Rooftop, off-grid and decentralised solar; PM-JANMAN where eligible',
      'Special-category central treatment applies',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts', 'pm-janman-shl'],
    disbursementRoute: 'Delivered through the island administration / electricity department',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Programme delivery through the island administration',
  },
  {
    id: 'state-solar-policy-generic',
    name: 'State solar policy (any other State/UT)',
    shortName: 'State solar policy',
    level: 'state',
    category: 'residential_rooftop',
    eligibility: [
      'A state solar policy does not automatically mean a cash subsidy',
      'It may instead cover electricity-duty relief, wheeling/banking concessions, net metering or land incentives',
      'Check the state department, regulator and DISCOM process for the current benefit',
    ],
    calc: { type: 'flat', amountINR: 0 },
    stackableWith: ['pm-surya-ghar-rts'],
    disbursementRoute: 'As notified by the state department / regulator / DISCOM',
    officialUrl: MNRE_STATE_POLICIES,
    lastVerified: SCHEME_LAST_VERIFIED,
    isDemoAssumption: true,
    supportType: 'policy_incentive',
    displayAmount: 'Policy incentives vary by state — no central amount to display',
  },
];

const BY_ID = new Map(SUBSIDY_SCHEMES.map((scheme) => [scheme.id, scheme]));

export function getScheme(id: string): SubsidyScheme | undefined {
  return BY_ID.get(id);
}

export function listSchemes(filter: { level?: SchemeLevel; state?: string; category?: SchemeCategory } = {}): SubsidyScheme[] {
  return SUBSIDY_SCHEMES.filter((scheme) => {
    if (filter.level && scheme.level !== filter.level) return false;
    if (filter.state && scheme.state !== filter.state) return false;
    if (filter.category && scheme.category !== filter.category) return false;
    return true;
  });
}

/** Schemes that can be stacked for a state — central rooftop + the state top-up. */
export function stackableSchemesForState(state: string): SubsidyScheme[] {
  const stateSchemes = SUBSIDY_SCHEMES.filter((scheme) => scheme.state === state && scheme.supportType === 'consumer_subsidy');
  const central = getScheme('pm-surya-ghar-rts');
  return central ? [central, ...stateSchemes.filter((scheme) => scheme.id !== central.id)] : stateSchemes;
}

/** Human-readable description of a calc block (used by the scheme reference page). */
export function describeSchemeCalc(calc: SchemeCalc | undefined): string {
  if (!calc) return 'No amount configured';
  if (calc.type === 'flat') {
    if (calc.amountINR === 0) return 'Programme-level support — no fixed amount';
    return `Flat ₹${calc.amountINR.toLocaleString('en-IN')}`;
  }
  if (calc.type === 'percent_of_cost') {
    const cap = calc.capINR ? ` · capped at ₹${calc.capINR.toLocaleString('en-IN')}` : '';
    return `${calc.percent}% of eligible system cost${cap}`;
  }
  const parts: string[] = [];
  let previous = 0;
  calc.slabs.forEach((slab) => {
    const kW = slab.uptoKW - previous;
    parts.push(`${kW} kW × ₹${slab.perKW.toLocaleString('en-IN')}/kW`);
    previous = slab.uptoKW;
  });
  const cap = calc.capINR ? ` · capped at ₹${calc.capINR.toLocaleString('en-IN')}` : '';
  return `${parts.join(' + ')}${cap}`;
}

/** Scheme ids that apply to an application for a given state (central + state). */
export function defaultSchemeIdsForState(state: string): string[] {
  const central = 'pm-surya-ghar-rts';
  const stateTopUp = SUBSIDY_SCHEMES.find((scheme) => scheme.level === 'state' && scheme.state === state && scheme.calc.type === 'flat' && scheme.calc.amountINR > 0);
  return stateTopUp ? [central, stateTopUp.id] : [central];
}

export const SCHEME_SUPPORT_TYPES: SupportType[] = [
  'consumer_subsidy',
  'project_support',
  'manufacturing_incentive',
  'policy_incentive',
  'regulatory_mechanism',
];
