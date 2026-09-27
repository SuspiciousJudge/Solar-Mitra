import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { buttonVariants } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6 text-center">
      <Logo />
      <Compass className="h-12 w-12 text-forest-600" aria-hidden="true" />
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mt-1 text-slate-500">The page you are looking for doesn’t exist.</p>
      </div>
      <Link to="/" className={buttonVariants()}>
        Back to home
      </Link>
    </div>
  );
}
