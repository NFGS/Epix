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
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
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
        className="h-12 w-full rounded-full border border-transparent bg-surface-2 pl-11 pr-14 text-base text-fg placeholder:text-muted transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            onChange('');
          }}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted transition-colors duration-150 hover:text-fg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
