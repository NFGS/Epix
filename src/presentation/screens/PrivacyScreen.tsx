import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n/i18n-context';

const paragraphClassName = 'text-sm leading-relaxed text-muted';
const linkClassName =
  'inline-flex min-h-11 items-center text-sm font-medium text-accent-text underline underline-offset-2';

interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PrivacyScreen() {
  const { t } = useI18n();
  const privacy = t.screens.privacy;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {privacy.title}
        </h1>
        <p className={paragraphClassName}>{privacy.intro}</p>
      </header>

      <Section id="privacy-device" title={privacy.device.title}>
        <p className={paragraphClassName}>{privacy.device.description}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          {privacy.device.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={paragraphClassName}>{privacy.device.footer}</p>
      </Section>

      <Section id="privacy-cloud" title={privacy.cloud.title}>
        <p className={paragraphClassName}>{privacy.cloud.description}</p>
      </Section>

      <Section id="privacy-telemetry" title={privacy.telemetry.title}>
        <p className={paragraphClassName}>{privacy.telemetry.description}</p>
        <p className={paragraphClassName}>{privacy.telemetry.deletion}</p>
        <Link to="/activity" className={linkClassName}>
          {privacy.telemetry.activityLink}
        </Link>
      </Section>

      <Section id="privacy-error-reports" title={privacy.errorReports.title}>
        <p className={paragraphClassName}>{privacy.errorReports.description}</p>
      </Section>

      <Section id="privacy-gps" title={privacy.gps.title}>
        <p className={paragraphClassName}>{privacy.gps.description}</p>
      </Section>

      <Section id="privacy-notifications" title={privacy.notifications.title}>
        <p className={paragraphClassName}>{privacy.notifications.description}</p>
      </Section>

      <Section id="privacy-accounts" title={privacy.accounts.title}>
        <p className={paragraphClassName}>{privacy.accounts.description}</p>
      </Section>

      <Section id="privacy-rights" title={privacy.rights.title}>
        <p className={paragraphClassName}>{privacy.rights.description}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Link to="/activity" className={linkClassName}>
            {privacy.rights.activityLink}
          </Link>
          <Link to="/account" className={linkClassName}>
            {privacy.rights.accountLink}
          </Link>
        </div>
      </Section>

      <Section id="privacy-contact" title={privacy.contact.title}>
        <p className={paragraphClassName}>{privacy.contact.description}</p>
        <a href={`mailto:${privacy.contact.email}`} className={linkClassName}>
          {privacy.contact.email}
        </a>
      </Section>

      <Section id="privacy-tvmaze" title={privacy.tvmaze.title}>
        <p className={paragraphClassName}>{privacy.tvmaze.description}</p>
        <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer" className={linkClassName}>
          tvmaze.com
        </a>
      </Section>
    </article>
  );
}
