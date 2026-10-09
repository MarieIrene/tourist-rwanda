import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { HillLines, SmartImage } from '@/components/ui';
import { images } from '@/data/images';

export function AuthShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-600 lg:block">
        <SmartImage src={images.volcanoes} alt="Virunga volcanoes above the clouds" quiet className="absolute inset-0 h-full w-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-600/95 to-brand-600/35" aria-hidden />
        <HillLines className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <Logo light />
          <p className="mt-6 max-w-md font-display text-3xl font-bold leading-tight">Every visit can support a guide, a weaver, a farmer or a ranger.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-slate-600">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
