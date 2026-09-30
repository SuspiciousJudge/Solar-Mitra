import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, FileText, ScanLine, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/context/LanguageContext';
import { extractBillFields, type BillExtraction } from '@/utils/billOcr';

type Phase = 'idle' | 'reading' | 'done' | 'error';

interface BillUploadCardProps {
  onExtracted: (values: BillExtraction) => void;
  completed: boolean;
}

/** Runs open-source OCR locally in the browser. Only extracted fields are sent to the audit API. */
export function BillUploadCard({ onExtracted, completed }: BillUploadCardProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(completed ? 'done' : 'idle');
  const [progress, setProgress] = useState(completed ? 100 : 0);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const activeWorker = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  useEffect(() => () => { void activeWorker.current?.terminate(); }, []);

  const readFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhase('error');
      setMessage(t('ocrImageOnly'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setPhase('error');
      setMessage(t('ocrTooLarge'));
      return;
    }

    setPhase('reading');
    setProgress(3);
    setMessage('');
    try {
      const worker = await createWorker('eng', 1, {
        logger: (event) => {
          if (event.status === 'recognizing text') setProgress(10 + Math.round(event.progress * 85));
          else if (event.status === 'loading language traineddata') setProgress(5 + Math.round(event.progress * 5));
        },
      });
      activeWorker.current = worker;
      const { data } = await worker.recognize(file);
      const fields = extractBillFields(data.text);
      if (fields.monthlyUnits === undefined && fields.monthlyBill === undefined) {
        setPhase('error');
        setMessage(t('ocrNoFields'));
        return;
      }
      onExtracted(fields);
      setProgress(100);
      setPhase('done');
    } catch {
      setPhase('error');
      setMessage(t('ocrFailure'));
    } finally {
      await activeWorker.current?.terminate();
      activeWorker.current = null;
    }
  };

  const busy = phase === 'reading';
  return (
    <Card className="overflow-hidden">
      <div className="relative bg-gradient-to-br from-forest-50 via-white to-solar-50 p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-14 shrink-0 items-center justify-center rounded-xl border border-forest-200 bg-white shadow-sm">
            <FileText className="h-7 w-7 text-forest-700" aria-hidden="true" />
            <AnimatePresence>
              {busy && <motion.span className="absolute inset-x-1 h-0.5 rounded bg-solar-400 shadow-[0_0_12px_2px_rgba(255,191,32,0.7)]" initial={{ top: 6 }} animate={{ top: [6, 56, 6] }} exit={{ opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />}
            </AnimatePresence>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t('uploadTitle')}</h2>
              {phase === 'done' && <Badge variant="green">OCR</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-600">{t('uploadHint')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('ocrLocalNote')}</p>
          </div>
        </div>

        <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" onChange={(event) => { void readFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        <div className="mt-5" aria-live="polite">
          {(phase === 'idle' || phase === 'error' || phase === 'done') && (
            <Button size="xl" className="w-full" onClick={() => fileInput.current?.click()}>
              <Upload className="h-5 w-5" aria-hidden="true" />
              {phase === 'done' ? t('tryAgain') : t('uploadButton')}
            </Button>
          )}
          {busy && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm font-semibold text-forest-800">
                <span className="flex items-center gap-2"><ScanLine className="h-4 w-4 animate-pulse" aria-hidden="true" />{t('readingBill')}</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} label={t('readingBill')} />
            </div>
          )}
          {phase === 'done' && <p className="mt-3 flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-3 font-semibold text-white"><CircleCheck className="h-5 w-5 text-solar-300" aria-hidden="true" />{t('ocrDone')}</p>}
          {message && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
        </div>
      </div>
    </Card>
  );
}
