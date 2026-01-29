import React, { useEffect, useState } from "react";
import { getDepartments, createEmployee, Department } from "../api/department";

interface DepartmentModalProps {
  open: boolean;
  onSubmit: (departmentId: number) => void;
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

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Select Your Department</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <select
            value={selected ?? ""}
            onChange={e => setSelected(Number(e.target.value))}
          >
            <option value="" disabled>
              Choose a department
            </option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <div className="modal-actions">
          <button
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
