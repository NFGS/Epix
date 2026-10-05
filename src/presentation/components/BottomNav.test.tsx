import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { BottomNav } from './BottomNav';

function renderBottomNav(initialPath = '/') {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <BottomNav />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('BottomNav', () => {
  it('renderiza los 5 destinos con sus etiquetas', () => {
    renderBottomNav();

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();

    for (const label of ['Inicio', 'Buscar', 'Agenda', 'Favoritos', 'Historial']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }

    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('marca el destino activo con aria-current', () => {
    renderBottomNav('/search');

    expect(screen.getByRole('link', { name: 'Buscar' })).toHaveAttribute('aria-current', 'page');
  });
});
