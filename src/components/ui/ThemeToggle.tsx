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
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      title={computedColorScheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {computedColorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}