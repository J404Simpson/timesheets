import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getDepartments } from "../api/department";
import type { Department } from "../api/department";

interface DepartmentModalProps {
  open: boolean;
  onSubmit: (departmentId: number) => void;
}

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function FormDropdown({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const rowHeight = 36;
    const verticalPadding = 12;
    const gap = 4;
    const viewportPadding = 8;
    const preferredHeight = Math.max(
      rowHeight + verticalPadding,
      Math.min(options.length, 16) * rowHeight + verticalPadding,
    );
    const maxWidth = window.innerWidth - viewportPadding * 2;
    const width = Math.min(rect.width, maxWidth);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - viewportPadding - width,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableSpace = Math.max(
      rowHeight + verticalPadding,
      openUpward ? spaceAbove : spaceBelow,
    );
    const maxHeight = Math.min(preferredHeight, availableSpace);
    const top = openUpward
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : rect.bottom + gap;

    setMenuStyle({
      top,
      left,
      width,
      maxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current) return;
      const clickedTrigger = rootRef.current.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen || disabled) return;

    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [disabled, isOpen, updateMenuPosition]);

  const selected = options.find((opt) => opt.value === value);
  const display = selected?.label ?? "Choose a department";

  return (
    <div ref={rootRef} className="form-dropdown department-form-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className="form-dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="form-dropdown-value">{display}</span>
        <span className="form-dropdown-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && !disabled && createPortal(
        <ul
          ref={menuRef}
          className="form-dropdown-menu form-dropdown-menu-portal"
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={`department-${opt.value}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  className={`form-dropdown-option ${isSelected ? "selected" : ""}`.trim()}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}

export default function DepartmentModal({ open, onSubmit }: DepartmentModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getDepartments()
        .then(setDepartments)
        .catch(() => setError("Failed to load departments"))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const departmentOptions: DropdownOption[] = departments.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));

  if (!open) return null;

  return (
    <div className="department-modal-overlay" role="presentation">
      <div className="department-modal" role="dialog" aria-modal="true" aria-labelledby="department-modal-title">
        <h2 id="department-modal-title" className="department-modal-title">Select Your Department</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <FormDropdown
            value={selected !== null ? String(selected) : ""}
            options={departmentOptions}
            onChange={(value) => setSelected(Number(value))}
            ariaLabel="Select your department"
          />
        )}
        <div className="department-modal-actions">
          <button
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
