interface GenreChipsProps {
  genres: readonly string[];
  selected: readonly string[];
  onToggle: (genre: string) => void;
  legend: string;
}

/**
 * Multi-select de géneros como chips (RF-05).
 * El grupo de chips seleccionados cuenta como un único uso visible del acento.
 */
export function GenreChips({ genres, selected, onToggle, legend }: GenreChipsProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {genres.map((genre) => {
          const isSelected = selected.includes(genre);

          return (
            <button
              key={genre}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onToggle(genre);
              }}
              className={[
                'min-h-11 rounded-full border px-3 text-sm font-medium transition-colors duration-150',
                isSelected
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-surface-2 text-muted hover:text-fg',
              ].join(' ')}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
