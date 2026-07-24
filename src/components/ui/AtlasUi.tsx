import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CircleAlert,
  Info,
  MapPin,
  Minus
} from 'lucide-react';

export function AtlasMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[11px] bg-[var(--color-primary-dark)] text-[var(--color-paper)] ${className}`}
      aria-hidden="true"
    >
      <BookOpen className="size-[52%]" strokeWidth={1.7} />
      <MapPin className="absolute bottom-[15%] right-[14%] size-[31%] fill-[var(--color-bronze)] text-[var(--color-bronze)]" />
      <span className="absolute bottom-[18%] left-[16%] h-px w-[28%] bg-[var(--color-paper)]/70" />
    </span>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`atlas-icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  kicker,
  title,
  action
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="atlas-kicker">{kicker}</p>}
        <h2 className={`${kicker ? 'mt-1' : ''} atlas-section-title`}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function StatusNotice({
  title,
  message,
  variant = 'info',
  action
}: {
  title: string;
  message?: string;
  variant?: 'info' | 'warning' | 'error';
  action?: React.ReactNode;
}) {
  const Icon =
    variant === 'error'
      ? CircleAlert
      : variant === 'warning'
        ? AlertTriangle
        : Info;
  const tone =
    variant === 'error'
      ? 'border-[color-mix(in_srgb,var(--color-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-paper))] text-[var(--color-danger)]'
      : variant === 'warning'
        ? 'border-[color-mix(in_srgb,var(--color-warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_9%,var(--color-paper))] text-[var(--color-warning)]'
        : 'border-[color-mix(in_srgb,var(--color-mineral)_24%,transparent)] bg-[var(--color-mineral-soft)] text-[var(--color-mineral)]';

  return (
    <div
      className={`flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 ${tone}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
        {message && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-soft)]">
            {message}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-paper-muted)] text-[var(--color-ink-muted)]">
          {icon || <Minus className="size-5" />}
        </span>
        <h3 className="mt-4 font-serif text-xl font-semibold text-[var(--color-ink)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          {message}
        </p>
      </div>
    </div>
  );
}
