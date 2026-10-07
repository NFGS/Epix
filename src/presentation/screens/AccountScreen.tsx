import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { Spinner } from '@/presentation/components/Spinner';
import {
  CloudOffIcon,
  LogOutIcon,
  RefreshIcon,
  ShieldIcon,
  UserIcon,
} from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { useAccount } from '@/presentation/hooks/use-account';
import { useSyncMeta } from '@/presentation/hooks/use-sync-meta';
import { useSyncStatus } from '@/presentation/hooks/use-sync-status';
import { useI18n } from '@/shared/i18n/i18n-context';
import { formatDateTime, formatTemplate } from '@/shared/lib/format';

const SKELETON_COUNT = 2;

function AccountSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} className="h-28 w-full animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}

function UnconfiguredCard() {
  const { t } = useI18n();

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          <CloudOffIcon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold">{t.screens.account.unconfiguredTitle}</h2>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        {t.screens.account.unconfiguredDescription}
      </p>
    </section>
  );
}

interface LinkedCardProps {
  email: string;
  onSignOut: () => void;
}

function LinkedCard({ email, onSignOut }: LinkedCardProps) {
  const { t, language } = useI18n();
  const { engine } = useDependencies();
  const status = useSyncStatus();
  const lastSyncAt = useSyncMeta('lastSyncAt');
  const isSyncing = status.state === 'syncing';

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text"
        >
          <ShieldIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{t.screens.account.linkedTitle}</h2>
          <p className="truncate text-sm text-muted">
            {formatTemplate(t.screens.account.signedInAs, { email })}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {t.screens.account.linkedDescription}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {lastSyncAt !== undefined && lastSyncAt !== null
            ? formatTemplate(t.screens.profile.lastSync, {
                date: formatDateTime(lastSyncAt, language),
              })
            : t.screens.profile.neverSynced}
        </p>

        <button
          type="button"
          disabled={isSyncing}
          aria-busy={isSyncing}
          onClick={() => {
            void engine.syncNow();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSyncing ? <Spinner /> : <RefreshIcon className="h-4 w-4" />}
          {t.screens.account.syncNow}
        </button>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-danger"
      >
        <LogOutIcon className="h-4 w-4" />
        {t.screens.account.signOut}
      </button>
    </section>
  );
}

interface CredentialsCardProps {
  mode: 'anonymous' | 'signed-out';
  onLinked: () => void;
}

function CredentialsCard({ mode, onLinked }: CredentialsCardProps) {
  const { t } = useI18n();
  const { status, error, requestCode, submitCode, clearError } = useAccount();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const isSending = status === 'sending';
  const isVerifying = status === 'verifying';
  const isBusy = isSending || isVerifying;

  useEffect(() => {
    if (step === 'code') {
      codeRef.current?.focus();
      return;
    }

    emailRef.current?.focus();
  }, [step]);

  const handleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void requestCode(email.trim()).then((sent) => {
      if (sent) {
        setToken('');
        setStep('code');
      }
    });
  };

  const handleVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCode(email.trim(), token.trim()).then((verified) => {
      if (verified) {
        onLinked();
      }
    });
  };

  const handleChangeEmail = () => {
    setStep('email');
    setToken('');
    clearError();
    emailRef.current?.focus();
  };

  const inputClassName =
    'min-h-11 w-full rounded-full border border-border bg-surface-2 px-4 text-sm text-fg placeholder:text-muted transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60';

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text"
        >
          {mode === 'anonymous' ? <ShieldIcon className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
        </span>
        <h2 className="text-lg font-bold">
          {mode === 'anonymous'
            ? t.screens.account.anonymousTitle
            : t.screens.account.signedOutTitle}
        </h2>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        {mode === 'anonymous'
          ? t.screens.account.anonymousDescription
          : t.screens.account.signedOutDescription}
      </p>

      {mode === 'anonymous' && (
        <p className="text-xs leading-relaxed text-muted">{t.screens.account.anonymousNote}</p>
      )}

      {step === 'email' ? (
        <form onSubmit={handleRequest} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="account-email" className="block text-sm font-medium">
              {t.screens.account.emailLabel}
            </label>
            <input
              ref={emailRef}
              id="account-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder={t.screens.account.emailPlaceholder}
              value={email}
              disabled={isBusy}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isBusy || email.trim() === ''}
            aria-busy={isSending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending && <Spinner />}
            {isSending ? t.screens.account.sending : t.screens.account.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            {formatTemplate(t.screens.account.codeSent, { email })}
          </p>

          <div className="space-y-1.5">
            <label htmlFor="account-code" className="block text-sm font-medium">
              {t.screens.account.codeLabel}
            </label>
            <input
              ref={codeRef}
              id="account-code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={token}
              disabled={isBusy}
              onChange={(event) => {
                setToken(event.target.value.replace(/\D/g, ''));
              }}
              className={[inputClassName, 'text-center text-lg tracking-[0.5em]'].join(' ')}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isBusy || token.length < 6}
              aria-busy={isVerifying}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying && <Spinner />}
              {isVerifying ? t.screens.account.verifying : t.screens.account.verify}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleChangeEmail}
              className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-5 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.screens.account.changeEmail}
            </button>
          </div>
        </form>
      )}

      {mode === 'anonymous' && (
        <p className="text-xs leading-relaxed text-muted">{t.screens.account.multiDeviceNote}</p>
      )}

      {status === 'error' && error !== null && (
        <p role="alert" aria-live="assertive" className="text-xs leading-relaxed text-danger">
          {t.screens.account.errors[error]}
        </p>
      )}
    </section>
  );
}

export function AccountScreen() {
  const { t } = useI18n();
  const { state, signOut } = useAccount();
  const [success, setSuccess] = useState<'linked' | 'signed-out' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSignOut = () => {
    setIsDialogOpen(false);
    void signOut().then(() => {
      setSuccess('signed-out');
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
        {t.screens.account.title}
      </h1>

      {success !== null && (
        <p role="status" aria-live="polite" className="text-xs text-success">
          {success === 'linked'
            ? t.screens.account.linkedSuccess
            : t.screens.account.signedOutSuccess}
        </p>
      )}

      {state === null ? (
        <AccountSkeleton />
      ) : state.status === 'unconfigured' ? (
        <UnconfiguredCard />
      ) : state.status === 'linked' ? (
        <LinkedCard
          email={state.email}
          onSignOut={() => {
            setIsDialogOpen(true);
          }}
        />
      ) : (
        <CredentialsCard
          mode={state.status === 'anonymous' ? 'anonymous' : 'signed-out'}
          onLinked={() => {
            setSuccess('linked');
          }}
        />
      )}

      <ConfirmDialog
        open={isDialogOpen}
        title={t.screens.account.signOutTitle}
        description={t.screens.account.signOutDescription}
        confirmLabel={t.screens.account.signOut}
        cancelLabel={t.common.cancel}
        onConfirm={handleSignOut}
        onCancel={() => {
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
