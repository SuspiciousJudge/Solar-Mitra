import { Check, ChevronDown, Filter, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
}

/**
 * Checkbox dropdown used by every operator filter. Renders as a button showing
 * how many values are selected, so the filter bar stays one row tall on mobile.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  placeholder,
  searchable = false,
  disabled = false,
  emptyLabel = 'No options available',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(term));
  }, [options, search]);

  const summary = selected.length === 0 ? (placeholder ?? `All ${label.toLowerCase()}`) : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={container} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-forest-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          selected.length ? 'border-forest-500 text-forest-900' : 'border-slate-300 text-slate-600',
        )}
      >
        <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="truncate">{summary}</span>
        {selected.length > 0 ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            className="ml-auto rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
                onClear();
              }
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : (
          <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div role="listbox" aria-label={label} aria-multiselectable="true" className="absolute left-0 top-full z-40 mt-1.5 w-full min-w-[15rem] rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
          {searchable && options.length > 8 && (
            <div className="p-1 pb-2">
              <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="h-9 text-sm" aria-label={`Search ${label}`} />
            </div>
          )}
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {visible.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">{emptyLabel}</li>}
            {visible.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => onToggle(option.value)}
                    className={cn('flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50', checked && 'bg-forest-50/70 text-forest-900')}
                  >
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-forest-600 bg-forest-600 text-white' : 'border-slate-300 bg-white')}>
                      {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.hint && <span className="block truncate text-xs text-slate-500">{option.hint}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
