import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createEntry, updateEntry, deleteEntry, getActiveProjects, getPhasesForProject, getWeekEntries, type Project as ApiProject, type Phase as ApiPhase, type WeekEntry } from "../api/timesheet";
import { getTasksForPhaseAndEmployee, getTasksForProjectPhase, type Task as ApiTask } from "../api/task";

type Entry = {
  workDate: string;
  type?: "project" | "internal";
  project?: string;
  phase?: string;
  task?: string;
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  hours?: number;
  notes?: string;
};

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function format12(value24: string) {
  const [hStr, m] = value24.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h = h - 12;
  return `${h}:${m} ${ampm}`;
}

function generateTimeOptions(stepMinutes = 15) {
  const opts: { value: string; label: string }[] = [];
  for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const value = `${pad(h)}:${pad(m)}`;
    opts.push({ value, label: format12(value) });
  }
  return opts;
}

function minutesFrom(value24: string) {
  const [h, m] = value24.split(":").map((s) => parseInt(s, 10));
  return h * 60 + m;
}

function minutesFromEntryTime(value: string) {
  // Handle both ISO timestamps and HH:MM format
  let timePart = value;
  if (value.includes("T")) {
    // Extract time from ISO string like "1970-01-01T09:00:00.000Z"
    timePart = value.split("T")[1];
  }
  const [h, m] = timePart.split(":").map((s) => parseInt(s, 10));
  return (h || 0) * 60 + (m || 0);
}

const HIDDEN_PROJECT_IDS = new Set([1, 2]);

function shouldShowProject(project: ApiProject): boolean {
  return !HIDDEN_PROJECT_IDS.has(project.id);
}

const SUSTAINING_PROJECT_ID = 2;
const SUSTAINING_PHASE_ID = 1;

function FormDropdown({
  name,
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  className,
}: {
  name: string;
  value: string;
  options: DropdownOption[];
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
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
  const display = selected?.label ?? "Select";

  return (
    <div ref={rootRef} className={`form-dropdown ${className ?? ""}`.trim()}>
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
              <li key={`${name}-${opt.value}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  className={`form-dropdown-option ${isSelected ? "selected" : ""}`.trim()}
                  onClick={() => {
                    onChange(name, opt.value);
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


// Remove hardcoded projects, use state for fetched projects

export default function TimesheetForm({
  onCancel,
  onSaved,
  initialDate,
  initialHour,
  initialMinute,
  initialEndHour,
  initialEndMinute,
  editingEntry,
  targetEmployeeId,
}: {
  onCancel?: () => void;
  onSaved?: () => void;
  initialDate?: string;
  initialHour?: number;
  initialMinute?: number;
  initialEndHour?: number;
  initialEndMinute?: number;
  editingEntry?: WeekEntry;
  targetEmployeeId?: number;
}) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [phases, setPhases] = useState<ApiPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [weekEntries, setWeekEntries] = useState<WeekEntry[]>([]);

  useEffect(() => {
    setLoadingProjects(true);
    getActiveProjects()
      .then((data) => {
        setProjects(data.filter(shouldShowProject));
        setProjectError(null);
      })
      .catch(() => {
        setProjectError("Failed to load projects");
      })
      .finally(() => setLoadingProjects(false));
  }, []);

  const loadWeekEntries = useCallback((weekOf?: string) => {
    getWeekEntries(weekOf, targetEmployeeId)
      .then(setWeekEntries)
      .catch(() => {
        // ignore entry load errors for time disabling
      });
  }, [targetEmployeeId]);


  const today = new Date().toISOString().slice(0, 10);
  const STEP_MINUTES = 15; // 0.25 hour increments
  const timeOptions = generateTimeOptions(STEP_MINUTES);

  // Calculate initial start time based on selected hour and minute (for new entries)
  const getInitialStartTime = (): string => {
    if (editingEntry) {
      const timePart = editingEntry.start_time.includes("T") 
        ? editingEntry.start_time.split("T")[1] 
        : editingEntry.start_time;
      return timePart.substring(0, 5); // HH:MM
    }
    if (initialHour !== undefined && initialMinute !== undefined) {
      return `${String(initialHour).padStart(2, "0")}:${String(initialMinute).padStart(2, "0")}`;
    }
    if (initialHour !== undefined) {
      return `${String(initialHour).padStart(2, "0")}:00`;
    }
    return "08:00";
  };

  const getInitialEndTime = (startTime: string): string => {
    if (editingEntry) {
      const timePart = editingEntry.end_time.includes("T") 
        ? editingEntry.end_time.split("T")[1] 
        : editingEntry.end_time;
      return timePart.substring(0, 5); // HH:MM
    }
    if (initialEndHour !== undefined && initialEndMinute !== undefined) {
      const endCandidate = `${String(initialEndHour).padStart(2, "0")}:${String(initialEndMinute).padStart(2, "0")}`;
      const endCandidateMinutes = minutesFrom(endCandidate);
      const startMinutes = minutesFrom(startTime);
      if (endCandidateMinutes >= startMinutes + STEP_MINUTES) {
        return endCandidate;
      }
    }

    const startMin = minutesFrom(startTime);
    const minEnd = startMin + STEP_MINUTES;
    const candidate = timeOptions.find((opt) => minutesFrom(opt.value) >= minEnd);
    return candidate ? candidate.value : "17:00";
  };

  const initialStartTime = getInitialStartTime();
  const initialEndTime = getInitialEndTime(initialStartTime);

  const getInitialEntry = (): Entry => {
    if (editingEntry) {
      return {
        workDate: editingEntry.date.split("T")[0],
        startTime: initialStartTime,
        endTime: initialEndTime,
        project: String(editingEntry.project?.id ?? 0),
        phase: editingEntry.project_phase?.phase?.id ? String(editingEntry.project_phase.phase.id) : undefined,
        task: editingEntry.task?.id ? String(editingEntry.task.id) : undefined,
        notes: editingEntry.notes ?? "",
      };
    }
    return {
      workDate: initialDate || today,
      startTime: initialStartTime,
      endTime: initialEndTime,
      notes: ""
    };
  };

  const getInitialSelectedType = (): "none" | "project" | "internal" => {
    if (!editingEntry) return "none";
    const projectId = editingEntry.project?.id;
    if (projectId === 2) return "internal"; // Sustaining
    if (projectId) return "project";
    return "none";
  };

  const [entry, setEntry] = useState<Entry>(getInitialEntry());
  const [selectedType, setSelectedType] = useState<"none" | "project" | "internal">(getInitialSelectedType());
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadWeekEntries(entry.workDate);
  }, [entry.workDate, loadWeekEntries]);

  const handleField = (name: keyof Entry, value?: string) => {
    setEntry((prev) => ({ ...prev, [name]: value }));
  };

  const applyFieldChange = (name: string, value: string) => {
    if (name === "startTime") {
      const startMin = minutesFrom(value);
      const minEnd = startMin + STEP_MINUTES;
      const candidate = timeOptions.find((opt) => minutesFrom(opt.value) >= minEnd);
      setEntry((prev) => ({
        ...prev,
        startTime: value,
        endTime: candidate ? candidate.value : prev.endTime
      }));
      return;
    }

    setEntry((prev) => ({ ...prev, [name as keyof Entry]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    applyFieldChange(name, value);
  };

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    // validation
    if (selectedType === "none") {
      return;
    }

    if (selectedType === "project") {
      if (entry.project == null) {
        return;
      }
      if (phases.length > 0 && !entry.phase) {
        return;
      }
      if (tasks.length > 0 && !entry.task) {
        return;
      }
    }

    if (selectedType === "internal" && !entry.task) {
      return;
    }

    if (!entry.startTime || !entry.endTime) {
      return;
    }

    const startMin = minutesFrom(entry.startTime);
    const endMin = minutesFrom(entry.endTime);
    if (endMin < startMin + STEP_MINUTES) {
      return;
    }

    const hours = +(((endMin - startMin) / 60).toFixed(2));

    const payload = {
      projectId: Number(entry.project ?? 0),
      phaseId: entry.phase ? Number(entry.phase) : null,
      taskId: entry.task ? Number(entry.task) : null,
      date: entry.workDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      hours,
      notes: entry.notes
    };

    const saveEntry = async () => {
      if (editingEntry) {
        await updateEntry(editingEntry.id, payload, targetEmployeeId);
      } else {
        await createEntry(payload, targetEmployeeId);
      }
    };

    try {
      await saveEntry();
      onSaved?.();
      // Reload entries after save
      getWeekEntries(undefined, targetEmployeeId).then(setWeekEntries).catch(() => {});
    } catch (err) {
      // Retry once for transient failures and keep UI free of technical errors.
      try {
        await saveEntry();
        onSaved?.();
        getWeekEntries(undefined, targetEmployeeId).then(setWeekEntries).catch(() => {});
      } catch (finalErr) {
        console.error("Entry save failed", finalErr ?? err);
      }
    }
  };

  // compute end options based on start
  const startMin = entry.startTime ? minutesFrom(entry.startTime) : 0;
  const endMin = entry.endTime ? minutesFrom(entry.endTime) : 0;
  const minEnd = startMin + STEP_MINUTES;
  const endOptions = timeOptions.filter((opt) => minutesFrom(opt.value) >= minEnd);

  const dayEntries = weekEntries.filter((e) => {
    const entryDate = e.date.split("T")[0];
    return entryDate === entry.workDate;
  });

  const blockingEntries = dayEntries.filter((e) => {
    if (!editingEntry) return true;
    return e.id !== editingEntry.id;
  });

  const isStartBlocked = (value: string) => {
    const startMinutes = minutesFrom(value);
    const blocked = blockingEntries.some((e) => {
      const entryStart = minutesFromEntryTime(e.start_time);
      const entryEnd = minutesFromEntryTime(e.end_time);
      return startMinutes >= entryStart && startMinutes < entryEnd;
    });
    return blocked;
  };

  const isEndBlocked = (value: string) => {
    if (!entry.startTime) return false;
    const startMinutes = minutesFrom(entry.startTime);
    const endMinutes = minutesFrom(value);
    const blocked = blockingEntries.some((e) => {
      const entryStart = minutesFromEntryTime(e.start_time);
      const entryEnd = minutesFromEntryTime(e.end_time);
      return startMinutes < entryEnd && endMinutes > entryStart;
    });
    return blocked;
  };

  const findValidStartTime = (preferred?: string) => {
    const preferredIndex = preferred
      ? timeOptions.findIndex((opt) => opt.value === preferred)
      : -1;

    const ordered = preferredIndex >= 0
      ? [...timeOptions.slice(preferredIndex), ...timeOptions.slice(0, preferredIndex)]
      : timeOptions;

    return ordered.find((opt) => !isStartBlocked(opt.value))?.value;
  };

  const findValidEndTime = (startValue: string) => {
    const startMinutes = minutesFrom(startValue);
    const minEndMinutes = startMinutes + STEP_MINUTES;
    return timeOptions
      .filter((opt) => minutesFrom(opt.value) >= minEndMinutes)
      .find((opt) => {
        const endMinutes = minutesFrom(opt.value);
        return !blockingEntries.some((e) => {
          const entryStart = minutesFromEntryTime(e.start_time);
          const entryEnd = minutesFromEntryTime(e.end_time);
          return startMinutes < entryEnd && endMinutes > entryStart;
        });
      })?.value;
  };

  const showEntryFields = selectedType !== "none";
  const showProjectFields = selectedType === "project";
  const showInternalFields = selectedType === "internal";
  const phaseRequired = showProjectFields && !!entry.project && phases.length > 0;
  const taskRequiredForProject = showProjectFields && !!entry.phase && tasks.length > 0;

  const canSubmit = (() => {
    if (!showEntryFields || !entry.startTime || !entry.endTime) return false;
    if (endMin < startMin + STEP_MINUTES) return false;

    if (showProjectFields) {
      if (!entry.project) return false;
      if (phaseRequired && !entry.phase) return false;
      if (taskRequiredForProject && !entry.task) return false;
      return true;
    }

    if (showInternalFields) {
      return !!entry.task;
    }

    return false;
  })();

  const getPhasePlaceholder = () => {
    if (!entry.project) return "Select a project first";
    if (loadingPhases) return "Loading phases...";
    if (phaseError) return "Unable to load phases";
    if (phases.length === 0) return "No phase required";
    return "Select a phase";
  };

  const getTaskPlaceholder = () => {
    if (showInternalFields) {
      if (loadingTasks) return "Loading tasks...";
      if (taskError) return "Unable to load tasks";
      return tasks.length === 0 ? "No tasks available" : "Select a task";
    }

    if (!entry.project) return "Select a project first";
    if (phaseRequired && !entry.phase) return "Select a phase first";
    if (loadingTasks) return "Loading tasks...";
    if (taskError) return "Unable to load tasks";
    if (phases.length === 0) return "No task required";
    return tasks.length === 0 ? "No tasks available" : "Select a task";
  };

  useEffect(() => {
    if (!showEntryFields || !entry.workDate) return;

    setEntry((prev) => {
      const preferredStart = prev.startTime;
      const validStart = preferredStart && !isStartBlocked(preferredStart)
        ? preferredStart
        : findValidStartTime(preferredStart);

      if (!validStart) {
        return prev;
      }

      const validEnd = prev.endTime && !isEndBlocked(prev.endTime)
        ? prev.endTime
        : findValidEndTime(validStart);

      if (!validEnd) {
        return {
          ...prev,
          startTime: validStart,
        };
      }

      if (prev.startTime === validStart && prev.endTime === validEnd) {
        return prev;
      }

      return {
        ...prev,
        startTime: validStart,
        endTime: validEnd,
      };
    });
  }, [showEntryFields, entry.workDate, dayEntries.length, editingEntry?.id]);

  // Fetch phases when project changes
  useEffect(() => {
    if (selectedType === "project" && entry.project != null) {
      setLoadingPhases(true);
      setPhases([]);
      setPhaseError(null);
      getPhasesForProject(Number(entry.project))
        .then((data) => {
          setPhases(data.filter((ph) => ph.enabled !== false));
        })
        .catch(() => setPhaseError("Failed to load phases"))
        .finally(() => setLoadingPhases(false));
    } else {
      setPhases([]);
      setPhaseError(null);
    }
  }, [selectedType, entry.project]);

  // Fetch tasks for Project mode when phase is available (supports edit pre-population)
  useEffect(() => {
    if (selectedType !== "project") return;

    const phaseId = Number(entry.phase);
    if (Number.isNaN(phaseId) || phaseId <= 0) {
      setTasks([]);
      setTaskError(null);
      return;
    }

    setLoadingTasks(true);
    setTaskError(null);
    setTasks([]);
    getTasksForPhaseAndEmployee(phaseId)
      .then((fetchedTasks) => setTasks(fetchedTasks))
      .catch(() => setTaskError("Failed to load tasks"))
      .finally(() => setLoadingTasks(false));
  }, [selectedType, entry.phase]);

  // Auto-populate task for Meetings phase.
  useEffect(() => {
    if (selectedType !== "project") return;
    if (!entry.phase || tasks.length === 0) return;

    const selectedPhase = phases.find((ph) => String(ph.id) === String(entry.phase));
    if (!selectedPhase || selectedPhase.name.trim().toLowerCase() !== "meetings") return;

    const meetingTask = tasks.find((task) => task.name.trim().toLowerCase() === "meeting") ?? tasks[0];
    if (!meetingTask) return;

    if (String(entry.task ?? "") === String(meetingTask.id)) return;
    setEntry((prev) => ({ ...prev, task: String(meetingTask.id) }));
  }, [selectedType, entry.phase, entry.task, phases, tasks]);

  // Fetch tasks for Sustaining (project 2, phase 1) automatically
  useEffect(() => {
    if (selectedType !== "internal") return;
    if (entry.project !== String(SUSTAINING_PROJECT_ID) || entry.phase !== String(SUSTAINING_PHASE_ID)) return;

    setLoadingTasks(true);
    setTaskError(null);
    setTasks([]);
    getTasksForProjectPhase(SUSTAINING_PROJECT_ID, SUSTAINING_PHASE_ID)
      .then((fetchedTasks) => setTasks(fetchedTasks))
      .catch(() => setTaskError("Failed to load tasks"))
      .finally(() => setLoadingTasks(false));
  }, [selectedType, entry.project, entry.phase]);

  // Back handler: only revert the top-level selection (project/internal) and clear project/phase
  const handleBack = () => {
    if (selectedType === "project" || selectedType === "internal") {
      setSelectedType("none");
      setEntry((prev) => ({ ...prev, project: undefined, phase: undefined, task: undefined }));
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    const confirmed = window.confirm("Delete this entry?");
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteEntry(editingEntry.id, targetEmployeeId);
      onSaved?.();
      getWeekEntries(undefined, targetEmployeeId).then(setWeekEntries).catch(() => {});
    } catch (err) {
      console.error("Entry delete failed", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section>
      <div className="new-entry-header" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div className="date-picker">
          <span className="date-display" aria-live="polite">
            {entry.workDate
              ? new Date(`${entry.workDate}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })
              : ""}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            name="workDate"
            className="date-input"
            value={entry.workDate}
            max={today}
            onChange={(e) => handleField("workDate", e.target.value)}
            onKeyDown={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            inputMode="none"
            aria-label="Work date"
            style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
          />
          <button
            type="button"
            className="date-picker-btn"
            onClick={() => {
              if (dateInputRef.current?.showPicker) {
                dateInputRef.current.showPicker();
              } else {
                dateInputRef.current?.focus();
              }
            }}
            aria-label="Open date picker"
          >
            📅
          </button>
        </div>
      </div>

      <form onSubmit={submitEntry} className="form">
        {/* Top area: keep selected button visible and hide the other.
            - Initial (none): show both
            - Project selected: Project visible, Internal hidden
            - Internal selected: Internal visible, Project hidden
        */}
        <div className="entry-type-row">
          {selectedType !== "internal" && (
            <button
              type="button"
              className="btn entry-type-choice"
              disabled={!!editingEntry}
              onClick={() => {
                setSelectedType("project");
                setEntry((prev) => ({ ...prev, project: undefined, phase: undefined, task: undefined }));
              }}
            >
              Project
            </button>
          )}

          {selectedType !== "project" && (
            <button
              type="button"
              className="btn entry-type-choice"
              disabled={!!editingEntry}
              onClick={() => {
                setSelectedType("internal");
                setEntry((prev) => ({
                  ...prev,
                  project: String(SUSTAINING_PROJECT_ID),
                  phase: String(SUSTAINING_PHASE_ID),
                  task: undefined,
                }));
              }}
            >
              Sustaining
            </button>
          )}
        </div>

        {showEntryFields && (
          <>
            <div className="entry-time-row">
              <label className="entry-time-field">
                Start
                <FormDropdown
                  className="time-select"
                  name="startTime"
                  value={entry.startTime ?? ""}
                  ariaLabel="Start time"
                  onChange={applyFieldChange}
                  options={timeOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    disabled: isStartBlocked(opt.value),
                  }))}
                />
              </label>

              <label className="entry-time-field">
                End
                <FormDropdown
                  className="time-select"
                  name="endTime"
                  value={entry.endTime ?? ""}
                  ariaLabel="End time"
                  onChange={applyFieldChange}
                  options={endOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    disabled: isEndBlocked(opt.value),
                  }))}
                />
              </label>
            </div>

            <div className="entry-duration muted">
              Duration:{" "}
              {entry.startTime && entry.endTime
                ? `${(((minutesFrom(entry.endTime) - minutesFrom(entry.startTime)) / 60) || 0).toFixed(2)} hrs`
                : "—"}
            </div>
          </>
        )}

        {/* Sustaining task dropdown (project 2, phase 1 fixed in background) */}
        {showInternalFields && (
          <label>
            <FormDropdown
              name="task"
              value={entry.task ?? ""}
              ariaLabel="Task"
              onChange={applyFieldChange}
              disabled={loadingTasks || !!taskError || tasks.length === 0}
              options={[
                { value: "", label: getTaskPlaceholder() },
                ...tasks.map((task) => ({ value: String(task.id), label: task.name })),
              ]}
            />
          </label>
        )}

        {/* Project dropdown shows after selecting Project */}
        {showProjectFields && (
          <>
            <label>
              <FormDropdown
                name="project"
                value={entry.project ?? ""}
                ariaLabel="Project"
                onChange={(name, value) => {
                  applyFieldChange(name, value);
                  handleField("phase", undefined);
                  handleField("task", undefined);
                }}
                disabled={loadingProjects || !!projectError}
                options={[
                  { value: "", label: loadingProjects ? "Loading projects..." : "Select a project" },
                  ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                ]}
              />
            </label>
          </>
        )}

        {/* Phase shown if project has phases */}
        {showProjectFields && (
          <label>
            <FormDropdown
              name="phase"
              value={entry.phase ?? ""}
              ariaLabel="Phase"
              onChange={(name, value) => {
                applyFieldChange(name, value);
                handleField("task", undefined);
              }}
              disabled={!entry.project || loadingPhases || !!phaseError || phases.length === 0}
              options={[
                { value: "", label: getPhasePlaceholder() },
                ...phases.map((ph) => ({ value: String(ph.id), label: ph.name })),
              ]}
            />
          </label>
        )}

        {/* Task dropdown shown after phase selection and tasks loaded */}
        {showProjectFields && (
          <label>
            <FormDropdown
              name="task"
              value={entry.task ?? ""}
              ariaLabel="Task"
              onChange={applyFieldChange}
              disabled={!entry.project || (phaseRequired && !entry.phase) || loadingTasks || !!taskError || tasks.length === 0}
              options={[
                { value: "", label: getTaskPlaceholder() },
                ...tasks.map((task) => ({ value: String(task.id), label: task.name })),
              ]}
            />
          </label>
        )}

        {showEntryFields && (
          <>
            <label>
              Notes
              <textarea name="notes" value={entry.notes} onChange={handleChange} />
            </label>
          </>
        )}

        {/* actions */}
        <div className="actions">
          {showEntryFields && (
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {editingEntry ? "Update" : "Save"}
            </button>
          )}

          {/* Back appears in create mode only when Project or Sustaining is selected */}
          {!editingEntry && (selectedType === "project" || selectedType === "internal") && (
            <button
              type="button"
              className="btn secondary"
              onClick={handleBack}
              aria-label="Back"
              title="Revert selection"
            >
              Back
            </button>
          )}

          {/* Delete replaces Back in edit mode */}
          {editingEntry && (
            <button
              type="button"
              className="btn secondary"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Delete entry"
              title="Delete this entry"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedType("none");
              setEntry((prev) => ({ ...prev, project: undefined, phase: undefined, task: undefined }));
              onCancel?.();
            }}
            className="btn secondary"
          >
            Cancel
          </button>
        </div>
      </form>

    </section>
  );
}