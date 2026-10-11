'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type DropDownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type DropDownProps = {
  options: DropDownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  compact?: boolean;
  className?: string;
  panelClassName?: string;
  emptyText?: string;
  name?: string;
  id?: string;
  'aria-label'?: string;
};

const css = `
.dd {
  position: relative;
  width: 100%;
}
.dd-trigger {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--tertiary, #12577A);
  border-radius: 8px;
  background: var(--foreground, #FFFFFF);
  font-family: var(--font-montserrat), sans-serif;
  font-size: 14px;
  color: var(--background, #0B1117);
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms ease;
}
.dd-trigger:hover:not(:disabled) { border-color: var(--secondary, #1479A8); }
.dd-trigger:disabled { cursor: not-allowed; opacity: .6; }
.dd-trigger--compact { min-height: 40px; padding: 8px 12px; }
.dd-trigger--error { border-color: var(--secondary, #1479A8); }
.dd-placeholder { color: var(--tertiary, #12577A); }
.dd-chevron {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--secondary, #1479A8);
  transition: transform 150ms ease;
}
.dd-chevron--open { transform: rotate(180deg); }
.dd-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  width: 100%;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--tertiary, #12577A);
  border-radius: 8px;
  background: var(--foreground, #FFFFFF);
  box-shadow: 0 10px 15px -3px rgb(11 17 23 / .1), 0 4px 6px -4px rgb(11 17 23 / .1);
  font-family: var(--font-montserrat), sans-serif;
  font-size: 14px;
}
.dd-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: var(--foreground, #FFFFFF);
  color: var(--background, #0B1117);
  font-family: var(--font-montserrat), sans-serif;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}
.dd-option:hover:not(.dd-option--selected):not(:disabled) { background: var(--surface, #F3F7F8); }
.dd-option--selected { background: var(--primary, #08AAA5); color: var(--foreground, #FFFFFF); }
.dd-option:disabled { cursor: not-allowed; opacity: .5; }
.dd-empty { padding: 12px 16px; color: var(--tertiary, #12577A); }
`;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function DropDown({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
  error = false,
  compact = false,
  className,
  panelClassName,
  emptyText = 'No options found',
  name,
  id,
  'aria-label': ariaLabel = 'Select an option',
}: DropDownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <style>{css}</style>
      <div className={joinClasses('dd', className)}>
        {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
        <button
          id={id}
          type="button"
          className={joinClasses(
            'dd-trigger',
            compact && 'dd-trigger--compact',
            error && 'dd-trigger--error',
          )}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'ArrowDown' && !open) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span className={joinClasses('dd-label', !selected && 'dd-placeholder')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            className={joinClasses('dd-chevron', open && 'dd-chevron--open')}
            size={16}
            aria-hidden="true"
          />
        </button>

        {open && !disabled ? (
          <div
            role="listbox"
            aria-label={ariaLabel}
            className={joinClasses('dd-menu', panelClassName)}
          >
            {options.length === 0 ? (
              <div className="dd-empty">{emptyText}</div>
            ) : (
              options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={option.disabled}
                    className={joinClasses(
                      'dd-option',
                      active && 'dd-option--selected',
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}