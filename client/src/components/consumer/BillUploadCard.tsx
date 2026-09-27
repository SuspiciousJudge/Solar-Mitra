import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, FileText, ScanLine, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/context/LanguageContext';
import { DEMO_OCR_RESULT } from '@/data/states';

type Phase = 'idle' | 'uploading' | 'reading' | 'done';

interface BillUploadCardProps {
  onExtracted: (values: typeof DEMO_OCR_RESULT) => void;
  completed: boolean;
}

/**
 * Simulated OCR for the hackathon demo: it animates an upload + read and then
 * returns fixed demo values. No file leaves the device.
 */
export function BillUploadCard({ onExtracted, completed }: BillUploadCardProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(completed ? 'done' : 'idle');
  const [progress, setProgress] = useState(completed ? 100 : 0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setPhase('uploading');
    setProgress(0);
    window.clearInterval(timer.current);
    let value = 0;
    timer.current = window.setInterval(() => {
      value += value < 40 ? 6 : 3.5;
      if (value >= 40) setPhase('reading');
      if (value >= 100) {
        window.clearInterval(timer.current);
        setProgress(100);
        setPhase('done');
        onExtracted(DEMO_OCR_RESULT);
        return;
      }
      setProgress(value);
    }, 90);
  };

  const busy = phase === 'uploading' || phase === 'reading';

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-gradient-to-br from-forest-50 via-white to-solar-50 p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-14 shrink-0 items-center justify-center rounded-xl border border-forest-200 bg-white shadow-sm">
            <FileText className="h-7 w-7 text-forest-700" aria-hidden="true" />
            <AnimatePresence>
              {busy && (
                <motion.span
                  className="absolute inset-x-1 h-0.5 rounded bg-solar-400 shadow-[0_0_12px_2px_rgba(255,191,32,0.7)]"
                  initial={{ top: 6 }}
                  animate={{ top: [6, 56, 6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t('uploadTitle')}</h2>
              {phase === 'done' && <Badge variant="yellow">{t('demoOcr')}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-600">{t('uploadHint')}</p>
          </div>
        </div>

        <div className="mt-5" aria-live="polite">
          {phase === 'idle' && (
            <Button size="xl" className="w-full" onClick={start}>
              <Upload className="h-5 w-5" aria-hidden="true" />
              {t('uploadButton')}
            </Button>
          )}
          {busy && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm font-semibold text-forest-800">
                <span className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 animate-pulse" aria-hidden="true" />
                  {phase === 'uploading' ? t('uploading') : t('readingBill')}
                </span>
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} label={phase === 'uploading' ? t('uploading') : t('readingBill')} />
            </div>
          )}
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between gap-3 rounded-2xl bg-forest-700 px-4 py-3 text-white"
            >
              <span className="flex items-center gap-2 font-semibold">
                <CircleCheck className="h-5 w-5 text-solar-300" aria-hidden="true" />
                {t('ocrDone')}
              </span>
              <button type="button" onClick={start} className="rounded-lg px-2 py-1 text-xs font-semibold text-forest-100 underline-offset-2 hover:underline">
                <Upload className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                {t('tryAgain')}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
}
