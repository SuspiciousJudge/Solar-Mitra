import { Download } from 'lucide-react';
import { FilterBar } from '@/components/admin/FilterBar';
import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOperatorFilters } from '@/hooks/useOperatorFilters';
import { applicationsExportUrl } from '@/services/applicationService';

export function ApplicationsPage() {
  useDocumentTitle('Applications');
  const filters = useOperatorFilters();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="Track every file through approval, loan sanction and disbursement, installation, net metering and subsidy credit."
        actions={
          <Button variant="subtle" size="sm" onClick={() => (window.location.href = applicationsExportUrl(filters.filters))}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />
      <FilterBar api={filters} />
      <LeadsManager mode="applications" filters={filters} />
    </div>
  );
}
