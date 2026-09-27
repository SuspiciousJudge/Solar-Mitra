import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BillData, FinancingChoice, SubmittedApplication, Vendor } from '@/types';
import { DEMO_FINANCING } from '@/utils/policyConfig';
import { calculateLoanSummary, calculateSolarRecommendation, type SolarRecommendation, type SubsidyResult } from '@/utils/solarCalculator';

const STORAGE_KEY = 'solarmitra.consumer';

export interface ApplicantDetails {
  name: string;
  phone: string;
  location: string;
}

interface PersistedConsumerState {
  billData: BillData | null;
  auditId?: string;
  financing: FinancingChoice | null;
  selectedVendor: Vendor | null;
  applicant: ApplicantDetails | null;
  application: SubmittedApplication | null;
  onboardingComplete: boolean;
}

interface ConsumerContextValue extends PersistedConsumerState {
  /** Derived from billData with the shared calculator, so it can never go stale. */
  solarRecommendation: SolarRecommendation | null;
  subsidy: SubsidyResult | null;
  /** Financing currently in effect (the stored choice, or the default EMI plan). */
  activeFinancing: FinancingChoice | null;
  setBillData: (bill: BillData) => void;
  setAuditId: (id: string | undefined) => void;
  setFinancing: (financing: FinancingChoice) => void;
  selectVendor: (vendor: Vendor | null) => void;
  setApplicant: (details: ApplicantDetails) => void;
  setApplication: (application: SubmittedApplication) => void;
  completeOnboarding: () => void;
  resetConsumer: () => void;
}

const EMPTY_STATE: PersistedConsumerState = {
  billData: null,
  financing: null,
  selectedVendor: null,
  applicant: null,
  application: null,
  onboardingComplete: false,
};

function readState(): PersistedConsumerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<PersistedConsumerState>) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export function defaultFinancing(netCost: number): FinancingChoice {
  const { emi } = calculateLoanSummary(netCost, DEMO_FINANCING.annualInterestRate, DEMO_FINANCING.tenureMonths);
  return { mode: 'emi', loanAmount: netCost, interestRate: DEMO_FINANCING.annualInterestRate, tenureMonths: DEMO_FINANCING.tenureMonths, emi };
}

const ConsumerContext = createContext<ConsumerContextValue | null>(null);

export function ConsumerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedConsumerState>(readState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const solarRecommendation = useMemo(
    () => (state.billData ? calculateSolarRecommendation(state.billData.monthlyUnits, state.billData.state, state.billData.monthlyBill) : null),
    [state.billData],
  );

  const subsidy = useMemo<SubsidyResult | null>(
    () =>
      solarRecommendation
        ? {
            centralSubsidy: solarRecommendation.centralSubsidy,
            stateSubsidy: solarRecommendation.stateSubsidy,
            totalSubsidy: solarRecommendation.totalSubsidy,
            stateSupported: solarRecommendation.stateSupported,
          }
        : null,
    [solarRecommendation],
  );

  const activeFinancing = useMemo(
    () => state.financing ?? (solarRecommendation ? defaultFinancing(solarRecommendation.netCost) : null),
    [state.financing, solarRecommendation],
  );

  // A new bill invalidates every downstream decision.
  const setBillData = useCallback(
    (billData: BillData) => setState((prev) => ({ ...prev, billData, auditId: undefined, financing: null, application: null })),
    [],
  );
  const setAuditId = useCallback((auditId: string | undefined) => setState((prev) => ({ ...prev, auditId })), []);
  const setFinancing = useCallback((financing: FinancingChoice) => setState((prev) => ({ ...prev, financing })), []);
  const selectVendor = useCallback((selectedVendor: Vendor | null) => setState((prev) => ({ ...prev, selectedVendor })), []);
  const setApplicant = useCallback((applicant: ApplicantDetails) => setState((prev) => ({ ...prev, applicant })), []);
  const setApplication = useCallback((application: SubmittedApplication) => setState((prev) => ({ ...prev, application })), []);
  const completeOnboarding = useCallback(() => setState((prev) => ({ ...prev, onboardingComplete: true })), []);
  const resetConsumer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(EMPTY_STATE);
  }, []);

  const value = useMemo<ConsumerContextValue>(
    () => ({
      ...state,
      solarRecommendation,
      subsidy,
      activeFinancing,
      setBillData,
      setAuditId,
      setFinancing,
      selectVendor,
      setApplicant,
      setApplication,
      completeOnboarding,
      resetConsumer,
    }),
    [state, solarRecommendation, subsidy, activeFinancing, setBillData, setAuditId, setFinancing, selectVendor, setApplicant, setApplication, completeOnboarding, resetConsumer],
  );

  return <ConsumerContext.Provider value={value}>{children}</ConsumerContext.Provider>;
}

export function useConsumer() {
  const context = useContext(ConsumerContext);
  if (!context) throw new Error('useConsumer must be used inside ConsumerProvider');
  return context;
}
