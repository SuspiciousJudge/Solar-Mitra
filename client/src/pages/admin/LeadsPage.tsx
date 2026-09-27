import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LeadsPage() {
  useDocumentTitle('Leads');
  return (
    <>
      <PageHeader title="Lead management" subtitle="Verify new solar + green-loan requests from households. Approve or reject pending leads." />
      <LeadsManager mode="leads" />
    </>
  );
}
