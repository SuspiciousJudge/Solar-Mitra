import { Download } from 'lucide-react';
import { FilterBar } from '@/components/admin/FilterBar';
import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOperatorFilters } from '@/hooks/useOperatorFilters';
import { leadsExportUrl } from '@/services/leadService';

export function LeadsPage() {
  useDocumentTitle('Leads');
  const filters = useOperatorFilters();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead management"
        subtitle="Verify new solar + green-loan requests. Filters here are shareable — the URL carries the exact slice you are looking at."
        actions={
          <Button variant="subtle" size="sm" onClick={() => (window.location.href = leadsExportUrl(filters.filters))}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />
      <FilterBar api={filters} />
      <LeadsManager mode="leads" filters={filters} />
    </div>
  );
}
