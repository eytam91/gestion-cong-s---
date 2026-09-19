import React from 'react';

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  label = 'Pagination',
}) => {
  if (pageCount <= 1) return null;

  const buttonClass =
    'px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors';

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 px-4 py-3 shadow-xs"
    >
      <span className="text-xs text-stone-500 font-mono">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} sur {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={buttonClass}>
          Précédent
        </button>
        <span className="text-xs font-bold text-stone-700 font-mono">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={buttonClass}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
};
