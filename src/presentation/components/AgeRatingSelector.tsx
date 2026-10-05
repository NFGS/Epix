import { AGE_RATINGS } from '@/domain/content-rating';
import type { AgeRating } from '@/domain/entities/preferences';

interface AgeRatingSelectorProps {
  value: AgeRating;
  onChange: (rating: AgeRating) => void;
  legend: string;
  descriptions: Record<AgeRating, string>;
}

/** Selector de edad máxima en pills segmentadas, con descripción corta por nivel. */
export function AgeRatingSelector({
  value,
  onChange,
  legend,
  descriptions,
}: AgeRatingSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AGE_RATINGS.map((rating) => {
          const isSelected = value === rating;

          return (
            <button
              key={rating}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onChange(rating);
              }}
              className={[
                'flex min-h-11 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors duration-150',
                isSelected
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-surface-2 text-muted hover:text-fg',
              ].join(' ')}
            >
              <span className="text-sm font-bold">{rating}</span>
              <span className={['text-[11px]', isSelected ? 'text-white/80' : ''].join(' ')}>
                {descriptions[rating]}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
