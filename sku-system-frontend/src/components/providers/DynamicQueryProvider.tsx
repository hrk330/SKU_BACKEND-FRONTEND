'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const QueryProvider = dynamic(
  () => import('./QueryProvider').then((mod) => ({ default: mod.QueryProvider })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

interface DynamicQueryProviderProps {
  children: ReactNode;
}

export function DynamicQueryProvider({ children }: DynamicQueryProviderProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
