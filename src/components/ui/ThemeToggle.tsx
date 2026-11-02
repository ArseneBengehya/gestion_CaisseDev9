'use client';

import React from 'react';
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleColorScheme}
      type="button"
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label={computedColorScheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={computedColorScheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {computedColorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}