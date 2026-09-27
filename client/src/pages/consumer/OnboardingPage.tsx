import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgePercent, FileText, HandCoins, IndianRupee, ScanLine, SolarPanel, Sun, TrendingDown, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyActions } from '@/components/consumer/StickyActions';
import { Button } from '@/components/ui/button';
import { useConsumer } from '@/context/ConsumerContext';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';

interface Slide {
  title: TranslationKey;
  text: TranslationKey;
  art: ReactNode;
}

const Bubble = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn('absolute flex items-center justify-center rounded-2xl bg-white shadow-lift', className)}>{children}</span>
);

const SLIDES: Slide[] = [
  {
    title: 'onb1Title',
    text: 'onb1Text',
    art: (
      <div className="relative h-full w-full">
        <span className="absolute inset-8 rounded-full bg-gradient-to-br from-solar-100 to-solar-200" />
        <span className="absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-solar-400 shadow-lift">
          <Zap className="h-12 w-12 text-forest-950" />
        </span>
        <Bubble className="left-4 top-8 h-14 w-14">
          <IndianRupee className="h-7 w-7 text-red-500" />
        </Bubble>
        <Bubble className="bottom-8 right-4 h-14 w-14">
          <TrendingDown className="h-7 w-7 text-forest-600" />
        </Bubble>
      </div>
    ),
  },
  {
    title: 'onb2Title',
    text: 'onb2Text',
    art: (
      <div className="relative h-full w-full">
        <span className="absolute inset-8 rounded-full bg-gradient-to-br from-forest-100 to-forest-200" />
        <span className="absolute inset-0 m-auto flex h-28 w-24 items-center justify-center rounded-2xl border-2 border-forest-200 bg-white shadow-lift">
          <FileText className="h-12 w-12 text-forest-700" />
        </span>
        <Bubble className="right-6 top-6 h-14 w-14">
          <ScanLine className="h-7 w-7 text-solar-600" />
        </Bubble>
        <Bubble className="bottom-6 left-6 h-14 w-14">
          <BadgePercent className="h-7 w-7 text-forest-600" />
        </Bubble>
      </div>
    ),
  },
  {
    title: 'onb3Title',
    text: 'onb3Text',
    art: (
      <div className="relative h-full w-full">
        <span className="absolute inset-8 rounded-full bg-gradient-to-br from-solar-100 via-white to-forest-100" />
        <span className="absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-forest-700 shadow-lift">
          <SolarPanel className="h-12 w-12 text-solar-300" />
        </span>
        <Bubble className="left-6 top-6 h-14 w-14">
          <Sun className="h-7 w-7 text-solar-500" />
        </Bubble>
        <Bubble className="bottom-6 right-6 h-14 w-14">
          <HandCoins className="h-7 w-7 text-forest-600" />
        </Bubble>
      </div>
    ),
  },
];

export function OnboardingPage() {
  const { t } = useLanguage();
  const { completeOnboarding } = useConsumer();
  const navigate = useNavigate();
  const [[index, direction], setSlide] = useState<[number, number]>([0, 1]);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  useDocumentTitle(t(slide.title));

  const finish = () => {
    completeOnboarding();
    navigate('/consumer/audit');
  };
  const go = (delta: number) => setSlide(([current]) => [Math.min(SLIDES.length - 1, Math.max(0, current + delta)), delta]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={SLIDES.length} aria-valuenow={index + 1} aria-label={t('progressLabel', { current: index + 1, total: SLIDES.length })}>
          {SLIDES.map((_, i) => (
            <span key={i} className={cn('h-2 rounded-full transition-all duration-300', i === index ? 'w-8 bg-forest-600' : i < index ? 'w-2 bg-forest-400' : 'w-2 bg-slate-200')} />
          ))}
        </div>
        {!isLast && (
          <button type="button" onClick={finish} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            {t('skip')}
          </button>
        )}
      </div>

      <div className="relative flex flex-1 items-center overflow-hidden px-5 py-6">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full text-center"
            aria-live="polite"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 && !isLast) go(1);
              if (info.offset.x > 60 && index > 0) go(-1);
            }}
          >
            <div className="mx-auto aspect-square w-full max-w-[260px]" aria-hidden="true">
              {slide.art}
            </div>
            <h1 className="mt-6 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">{t(slide.title)}</h1>
            <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-slate-600">{t(slide.text)}</p>
          </motion.section>
        </AnimatePresence>
      </div>

      <StickyActions>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="outline" size="xl" onClick={() => go(-1)} className="w-28">
              {t('back')}
            </Button>
          )}
          <Button size="xl" variant={isLast ? 'solar' : 'primary'} className="flex-1" onClick={() => (isLast ? finish() : go(1))}>
            {isLast ? t('startAudit') : t('next')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </StickyActions>
    </div>
  );
}
