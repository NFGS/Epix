import { useId } from 'react';

import { SearchIcon } from './icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  clearLabel: string;
}

export function SearchInput({ value, onChange, label, placeholder, clearLabel }: SearchInputProps) {
  const inputId = useId();

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <SearchIcon className="h-5 w-5" />
      </span>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-12 text-sm text-text placeholder:text-muted focus:border-brand-500 focus:outline-none"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            onChange('');
          }}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
