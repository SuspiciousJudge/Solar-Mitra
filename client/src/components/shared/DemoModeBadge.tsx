import { FlaskConical } from 'lucide-react';
import { useDemo } from '@/context/DemoContext';
import { cn } from '@/utils/cn';

export function DemoModeBadge({ className }: { className?: string }) {
  const { demoMode } = useDemo();
  if (!demoMode) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-solar-300 bg-solar-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-solar-800',
        className,
      )}
      title="Running on seeded demo data"
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Demo Mode
    </span>
  );
}
