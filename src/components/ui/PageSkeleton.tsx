import React from 'react';

type PageSkeletonLayout =
  | 'cards'
  | 'table'
  | 'cards-table'
  | 'dashboard'
  | 'member-dashboard'
  | 'activity-list'
  | 'profile'
  | 'rules';

interface PageSkeletonProps {
  layout: PageSkeletonLayout;
  cards?: number;
  columns?: number;
  rows?: number;
  showSearch?: boolean;
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

function CardGridSkeleton({
  count,
  className = 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
          </div>
          <SkeletonBlock className="mt-3 h-6 w-1/2" />
          <SkeletonBlock className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({
  columns,
  rows,
  showSearch,
}: {
  columns: number;
  rows: number;
  showSearch: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {showSearch && (
        <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <SkeletonBlock className="h-10 w-full max-w-sm rounded-xl" />
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div
            className="grid gap-6 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70 sm:px-6"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, index) => (
              <SkeletonBlock key={index} className="h-3 w-3/4" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid items-center gap-6 border-b border-slate-100 px-4 py-5 last:border-0 dark:border-slate-800 sm:px-6"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }, (_, columnIndex) => (
                <SkeletonBlock
                  key={columnIndex}
                  className={`${columnIndex === 0 ? 'h-5 w-4/5' : 'h-4 w-2/3'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-5 w-28 rounded-full" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 last:border-0 dark:border-slate-800 sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-40 max-w-full" />
              <SkeletonBlock className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <SkeletonBlock className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={5} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-56" />
            <SkeletonBlock className="h-3 w-72 max-w-full" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />
      <ActivityListSkeleton rows={5} />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-36 shrink-0 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <SkeletonBlock className="h-40 w-40 rounded-full" />
          <SkeletonBlock className="mt-5 h-6 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-32" />
          <div className="mt-6 w-full space-y-3">
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <SkeletonBlock className="h-5 w-48" />
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function RulesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <SkeletonBlock className="h-6 w-64 max-w-full" />
        <SkeletonBlock className="h-4 w-full max-w-2xl" />
      </div>
      <CardGridSkeleton count={3} className="grid-cols-1 sm:grid-cols-3" />
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <SkeletonBlock className="h-5 w-1/2" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageSkeleton({
  layout,
  cards = 3,
  columns = 5,
  rows = 6,
  showSearch = true,
}: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Chargement de la page" className="w-full">
      <span className="sr-only">Chargement en cours...</span>
      {layout === 'cards' ? (
        <CardGridSkeleton count={cards} />
      ) : layout === 'table' ? (
        <TableSkeleton columns={columns} rows={rows} showSearch={showSearch} />
      ) : layout === 'cards-table' ? (
        <div className="space-y-6">
          <CardGridSkeleton count={cards} />
          <TableSkeleton columns={columns} rows={rows} showSearch={showSearch} />
        </div>
      ) : layout === 'dashboard' ? (
        <DashboardSkeleton />
      ) : layout === 'member-dashboard' ? (
        <MemberDashboardSkeleton />
      ) : layout === 'activity-list' ? (
        <ActivityListSkeleton rows={rows} />
      ) : layout === 'profile' ? (
        <ProfileSkeleton />
      ) : (
        <RulesSkeleton />
      )}
    </div>
  );
}
