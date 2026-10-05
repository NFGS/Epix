import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { GpsCountryChip, LocationBanner } from './LocationBanner';

function renderWithI18n(node: ReactNode) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

describe('LocationBanner', () => {
  it('muestra el CTA «Usar mi ubicación» cuando aún no hay GPS', () => {
    renderWithI18n(<LocationBanner status="idle" message={null} onRequest={vi.fn()} />);

    expect(
      screen.getByText('Activa tu ubicación para ver la programación de tu país'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usar mi ubicación/i })).toBeEnabled();
  });

  it('deshabilita y marca aria-busy mientras detecta la ubicación', () => {
    renderWithI18n(<LocationBanner status="requesting" message={null} onRequest={vi.fn()} />);

    const button = screen.getByRole('button', { name: /detectando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('anuncia el mensaje de permiso denegado en un role status', () => {
    renderWithI18n(
      <LocationBanner
        status="error"
        message="Permiso denegado. Elige tu país manualmente en Agenda."
        onRequest={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Permiso denegado');
    expect(screen.getByText(/elige tu país manualmente/i)).toBeInTheDocument();
  });

  it('invoca onRequest al pulsar el botón', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    renderWithI18n(<LocationBanner status="idle" message={null} onRequest={onRequest} />);

    await user.click(screen.getByRole('button', { name: /usar mi ubicación/i }));

    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});

describe('GpsCountryChip', () => {
  it('muestra el país detectado y permite volver a la selección manual', async () => {
    const user = userEvent.setup();
    const onChooseManually = vi.fn();
    renderWithI18n(<GpsCountryChip country="CO" onChooseManually={onChooseManually} />);

    expect(screen.getByText('Según tu ubicación · CO')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /elegir país/i }));

    expect(onChooseManually).toHaveBeenCalledTimes(1);
  });
});
