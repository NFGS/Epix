import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { GenreChips } from './GenreChips';

const GENRES = ['Comedy', 'Drama', 'Horror'];

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <GenreChips
      genres={GENRES}
      selected={selected}
      legend="Géneros favoritos"
      onToggle={(genre) => {
        setSelected((current) =>
          current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
        );
      }}
    />
  );
}

describe('GenreChips', () => {
  it('renderiza todos los géneros sin seleccionar dentro del fieldset', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Géneros favoritos' })).toBeInTheDocument();
    for (const genre of GENRES) {
      expect(screen.getByRole('button', { name: genre })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('selecciona y deselecciona un género alternando aria-pressed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const drama = screen.getByRole('button', { name: 'Drama' });

    await user.click(drama);
    expect(drama).toHaveAttribute('aria-pressed', 'true');

    await user.click(drama);
    expect(drama).toHaveAttribute('aria-pressed', 'false');
  });

  it('permite seleccionar varios géneros a la vez', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Comedy' }));
    await user.click(screen.getByRole('button', { name: 'Horror' }));

    expect(screen.getByRole('button', { name: 'Comedy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Horror' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'false');
  });
});
