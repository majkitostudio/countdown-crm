import { forwardRef, type ComponentPropsWithoutRef } from "react";

const FIELD_CLASS_NAME = "w-full rounded-control border border-border-default bg-surface-inset px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50";

export function getFieldClassName(): string {
  return FIELD_CLASS_NAME;
}

type FieldProps<T extends "input" | "select" | "textarea"> = Omit<ComponentPropsWithoutRef<T>, "className" | "style"> & {
  className?: never;
  style?: never;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps<"input">>(function TextField({ style: _style, ...props }, ref) {
  void _style;
  return <input ref={ref} className={FIELD_CLASS_NAME} {...props} />;
});

export const SelectField = forwardRef<HTMLSelectElement, FieldProps<"select">>(function SelectField({ style: _style, ...props }, ref) {
  void _style;
  return <select ref={ref} className={FIELD_CLASS_NAME} {...props} />;
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps<"textarea">>(function TextAreaField({ style: _style, ...props }, ref) {
  void _style;
  return <textarea ref={ref} className={FIELD_CLASS_NAME} {...props} />;
});

export type FieldLabelProps = Omit<ComponentPropsWithoutRef<"label">, "className" | "style"> & {
  className?: never;
  style?: never;
};

export function FieldLabel({ style: _style, ...props }: FieldLabelProps) {
  void _style;
  return <label className="mb-1.5 block text-xs font-medium text-text-secondary" {...props} />;
}
