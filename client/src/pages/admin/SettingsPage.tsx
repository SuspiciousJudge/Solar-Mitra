import { Database, FlaskConical, KeyRound, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDemo } from '@/context/DemoContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/services/api';
import { formatINR } from '@/utils/format';
import { DEMO_FINANCING, DEMO_GRID_EMISSION_FACTOR, DEMO_POLICY } from '@/utils/policyConfig';

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { demoMode, apiReachable, resetDemo, refreshStatus } = useDemo();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemo();
      await refreshStatus();
      toast.success('Demo reset', { description: 'Leads, applications, vendors, analytics and consumer state restored.' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reset the demo.'));
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Demo controls and the configurable assumptions behind every estimate." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-solar-50 text-solar-700">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">Demo mode</h2>
                <p className="text-sm text-slate-500">Seeded data so the full story works without a database.</p>
              </div>
            </div>
            <Badge variant={demoMode ? 'yellow' : 'green'}>{demoMode ? 'Demo data' : 'Live database'}</Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Database className="h-3.5 w-3.5" aria-hidden="true" /> Data source
              </dt>
              <dd className="mt-0.5 font-semibold">{demoMode ? 'In-memory demo store' : 'MongoDB'}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">API</dt>
              <dd className="mt-0.5 font-semibold">{apiReachable === null ? 'Checking…' : apiReachable ? 'Reachable' : 'Unreachable'}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/50 p-4">
            <h3 className="font-bold text-slate-900">Reset Demo</h3>
            <p className="mt-1 text-sm text-slate-600">
              Restores seeded leads, applications, vendors and analytics, and clears consumer state on this device. Use it between presentations.
            </p>
            <Button variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset Demo
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Demo Policy Assumptions</h2>
              <p className="text-sm text-slate-500">Configured in policyConfig.ts (client &amp; server).</p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-solar-50 p-3 text-xs leading-relaxed text-solar-900">
            Policy values used in this prototype are configurable assumptions for demonstration purposes. Actual subsidy eligibility and amount should be verified against current official government guidelines.
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="py-2">Size</th>
                <th scope="col" className="py-2">System cost</th>
                <th scope="col" className="py-2">Central subsidy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(DEMO_POLICY.baseSystemCost).map((kw) => (
                <tr key={kw}>
                  <td className="py-2 font-semibold">{kw} kW</td>
                  <td className="py-2 tabular-nums">{formatINR(DEMO_POLICY.baseSystemCost[Number(kw)])}</td>
                  <td className="py-2 tabular-nums">{formatINR(DEMO_POLICY.centralSubsidy[Number(kw)])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
            {Object.entries(DEMO_POLICY.stateTopUp).map(([state, amount]) => (
              <li key={state} className="flex justify-between">
                <span>State top-up · {state.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
                <span className="font-semibold tabular-nums">{formatINR(amount)}</span>
              </li>
            ))}
            <li className="flex justify-between"><span>Generation per kW</span><span className="font-semibold">{DEMO_POLICY.unitPerKW} kWh/month</span></li>
            <li className="flex justify-between"><span>Default loan terms</span><span className="font-semibold">{DEMO_FINANCING.annualInterestRate}% · {DEMO_FINANCING.tenureMonths} months</span></li>
            <li className="flex justify-between"><span>Demo grid emission factor</span><span className="font-semibold">{DEMO_GRID_EMISSION_FACTOR} kg CO₂/kWh</span></li>
          </ul>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <p className="text-sm text-slate-600">
              Demo credentials (<span className="font-mono">admin@solarmitra.demo / demo123</span>) are for the hackathon only. Set <span className="font-mono">ADMIN_EMAIL</span>,{' '}
              <span className="font-mono">ADMIN_PASSWORD</span> and <span className="font-mono">JWT_SECRET</span> in server/.env for any shared deployment.
            </p>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Reset the demo?"
        description="All new applications and status changes will be discarded and seeded data restored."
        confirmLabel="Reset Demo"
        loading={resetting}
        onCancel={() => setConfirming(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
