"use client";

import React from "react";

function cx(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "brand";
type ButtonSize = "sm" | "md" | "lg";

const buttonSize: Record<ButtonSize, string> = {
  sm: "h-12 px-5 text-base",
  md: "h-14 px-6 text-base",
  lg: "h-16 px-7 text-lg",
};

const buttonVariant: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ui-primary)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-primary-hover)]",
  brand:
    "bg-[var(--ui-brand)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-brand-600)]",
  secondary:
    "border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]",
  ghost:
    "bg-transparent text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--ui-radius-control)] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-brand)]/40",
        "shadow-[var(--ui-shadow-1)] hover:shadow-none",
        buttonSize[size],
        buttonVariant[variant],
        className
      )}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6 shadow-[var(--ui-shadow-1)] backdrop-blur-xl",
        className
      )}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-14 w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-4 text-base text-[var(--ui-text)]",
        "placeholder:text-[var(--ui-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]/30",
        className
      )}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "h-14 w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-4 text-base text-[var(--ui-text)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]/30",
        className
      )}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cx(
        "inline-flex items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--ui-text)]",
        className
      )}
    />
  );
}

