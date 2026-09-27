import { LeadsManager } from '@/components/admin/LeadsManager';
import { PageHeader } from '@/components/admin/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ApplicationsPage() {
  useDocumentTitle('Applications');
  return (
    <>
      <PageHeader title="Applications" subtitle="Track every application through approval, installation scheduling and solar activation." />
      <LeadsManager mode="applications" />
    </>
  );
}
