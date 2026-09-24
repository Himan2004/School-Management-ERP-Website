import React from 'react';

export const TaskSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-lg w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-full mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-2/3 mb-4"></div>
    <div className="flex justify-between items-center">
      <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-20"></div>
    </div>
  </div>
);

export const NoticeSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border animate-pulse">
    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-lg w-2/3 mb-3"></div>
    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-full mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg w-3/4 mb-4"></div>
    <div className="flex gap-2">
      <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
      <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg mb-2"></div>
        <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="h-10 w-full sm:w-64 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
        <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-slate-700"></div>
            <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-slate-700"></div>
          </div>
          <div className="h-4 rounded w-24 mb-2 bg-gray-200 dark:bg-slate-700"></div>
          <div className="h-8 rounded w-20 mb-3 bg-gray-200 dark:bg-slate-700"></div>
          <div className="flex justify-between">
            <div className="h-3 rounded w-16 bg-gray-200 dark:bg-slate-700"></div>
            <div className="h-3 rounded w-16 bg-gray-200 dark:bg-slate-700"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Content Layout Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Col 1 & 2 Skeleton (wider) */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-96"></div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-80"></div>
      </div>
      {/* Col 3 Skeleton (sidebar) */}
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-80"></div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-96"></div>
      </div>
    </div>
  </div>
);