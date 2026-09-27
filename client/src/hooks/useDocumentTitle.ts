import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · SolarMitra` : 'SolarMitra — Your Solar Friend';
  }, [title]);
}
