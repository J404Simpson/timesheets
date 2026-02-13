import React, { useState, useEffect, useRef } from "react";
import { createEntry, getActiveProjects, getPhasesForProject, Project as ApiProject, Phase as ApiPhase } from "../api/timesheet";
import { getTasksForPhaseAndEmployee, Task as ApiTask } from "../api/task";

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


// Remove hardcoded projects, use state for fetched projects

export default function TimesheetForm({
  onCancel,
  onSaved,
  initialDate,
  initialHour,
  initialMinute
}: {
  onCancel?: () => void;
  onSaved?: () => void;
  initialDate?: string;
  initialHour?: number;
  initialMinute?: number;
}) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [phases, setPhases] = useState<ApiPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingProjects(true);
    getActiveProjects()
      .then((data) => {
        setProjects(data);
        setProjectError(null);
      })
      .catch(() => {
        setProjectError("Failed to load projects");
      })
      .finally(() => setLoadingProjects(false));
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const STEP_MINUTES = 15; // 0.25 hour increments
  const timeOptions = generateTimeOptions(STEP_MINUTES);

  // Calculate initial start time based on selected hour and minute
  const getInitialStartTime = (): string => {
    if (initialHour !== undefined && initialMinute !== undefined) {
      return `${String(initialHour).padStart(2, "0")}:${String(initialMinute).padStart(2, "0")}`;
    }
    if (initialHour !== undefined) {
      return `${String(initialHour).padStart(2, "0")}:00`;
    }
    return "09:00";
  };

  const getInitialEndTime = (startTime: string): string => {
    const startMin = minutesFrom(startTime);
    const minEnd = startMin + STEP_MINUTES;
    const candidate = timeOptions.find((opt) => minutesFrom(opt.value) >= minEnd);
    return candidate ? candidate.value : "17:00";
  };

  const initialStartTime = getInitialStartTime();
  const initialEndTime = getInitialEndTime(initialStartTime);

  const [entry, setEntry] = useState<Entry>({
    workDate: initialDate || today,
    startTime: initialStartTime,
    endTime: initialEndTime,
    notes: ""
  });
  const [selectedType, setSelectedType] = useState<"none" | "project" | "internal">("none");
  const [status, setStatus] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleField = (name: keyof Entry, value?: string) => {
    setEntry((prev) => ({ ...prev, [name]: value }));
    setStatus(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "startTime") {
      const startMin = minutesFrom(value);
      const minEnd = startMin + STEP_MINUTES;
      const candidate = timeOptions.find((opt) => minutesFrom(opt.value) >= minEnd);
      setEntry((prev) => ({
        ...prev,
        startTime: value,
        endTime: candidate ? candidate.value : prev.endTime
      }));
      setStatus(null);
      return;
    }

    setEntry((prev) => ({ ...prev, [name as keyof Entry]: value }));
    setStatus(null);
  };

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    // validation
    if (selectedType === "none") {
      setStatus("Please select Project or Internal Meeting.");
      return;
    }

    if (selectedType === "project") {
      if (entry.project == null) {
        setStatus("Please select a project.");
        return;
      }
      if (phases.length > 0 && !entry.phase) {
        setStatus("Please select a phase.");
        return;
      }
      if (tasks.length > 0 && !entry.task) {
        setStatus("Please select a task.");
        return;
      }
    }

    if (!entry.startTime || !entry.endTime) {
      setStatus("Please select start and end times.");
      return;
    }

    const startMin = minutesFrom(entry.startTime);
    const endMin = minutesFrom(entry.endTime);
    if (endMin < startMin + STEP_MINUTES) {
      setStatus(`End time must be at least ${STEP_MINUTES} minutes after start time.`);
      return;
    }

    const hours = +(((endMin - startMin) / 60).toFixed(2));

    try {
      setStatus("Saving...");
      await createEntry({
        projectId: Number(entry.project ?? 0),
        phaseId: entry.phase ? Number(entry.phase) : null,
        taskId: selectedType === "internal" ? null : entry.task ? Number(entry.task) : null,
        date: entry.workDate,
        startTime: entry.startTime,
        endTime: entry.endTime,
        hours,
        notes: entry.notes
      });
      setStatus("Saved.");
      onSaved?.();
    } catch (err) {
      setStatus(`Save failed: ${(err as any)?.message ?? err}`);
    }
  };

  // compute end options based on start
  const startMin = entry.startTime ? minutesFrom(entry.startTime) : 0;
  const minEnd = startMin + STEP_MINUTES;
  const endOptions = timeOptions.filter((opt) => minutesFrom(opt.value) >= minEnd);

  const selectedProject = entry.project != null ? projects.find((p) => String(p.id) === entry.project) : undefined;
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

  // determine when to show time inputs
  const timeInputsVisible = (() => {
    if (selectedType === "internal") return true;
    if (selectedType === "project" && entry.project != null) {
      if (loadingPhases) return false;
      if (phases.length === 0) return true; // No phases for this project
      if (tasks.length > 0) return entry.task != null; // Only show if a task is selected
      return false;
    }
    return false;
  })();

  // Back handler: only revert the top-level selection (project/internal) and clear project/phase
  const handleBack = () => {
    if (selectedType === "project" || selectedType === "internal") {
      setSelectedType("none");
      setEntry((prev) => ({ ...prev, project: undefined, phase: undefined, task: undefined }));
      setStatus(null);
    }
  };

  return (
    <section>
      <div className="new-entry-header" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>New Entry</h2>
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
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {selectedType !== "internal" && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelectedType("project");
                setStatus(null);
                setEntry((prev) => ({ ...prev, project: undefined, phase: undefined }));
              }}
            >
              Project
            </button>
          )}

          {selectedType !== "project" && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelectedType("internal");
                setStatus(null);
                setEntry((prev) => ({ ...prev, project: "0", phase: undefined, task: undefined }));
              }}
            >
              Internal Meeting
            </button>
          )}
        </div>

        {/* Project dropdown shows after selecting Project */}
        {selectedType === "project" && (
          <>
            <label>
              <select
                name="project"
                value={entry.project ?? ""}
                onChange={(e) => {
                  handleChange(e);
                  handleField("phase", undefined);
                }}
                disabled={loadingProjects || !!projectError}
              >
                <option value="">{loadingProjects ? "Loading projects..." : projectError ? projectError : "Select a project"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {/* Phase shown if project has phases */}
        {selectedType === "project" && entry.project != null && (
          <label>
            <select
              name="phase"
              value={entry.phase ?? ""}
              onChange={async (e) => {
                handleChange(e);
                handleField("task", undefined);
                const phaseId = Number(e.target.value);
                if (phaseId != null && !isNaN(phaseId) && phaseId > 0) {
                  setLoadingTasks(true);
                  setTaskError(null);
                  setTasks([]);
                  try {
                    const fetchedTasks = await getTasksForPhaseAndEmployee(phaseId);
                    setTasks(fetchedTasks);
                  } catch {
                    setTaskError("Failed to load tasks");
                  } finally {
                    setLoadingTasks(false);
                  }
                } else {
                  setTasks([]);
                }
              }}
              disabled={loadingPhases || !!phaseError || phases.length === 0}
            >
              <option value="">{loadingPhases ? "Loading phases..." : phaseError ? phaseError : "Select a phase"}</option>
              {phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Task dropdown shown after phase selection and tasks loaded */}
        {selectedType === "project" && entry.project != null && entry.phase != null && (
          <label>
            <select
              name="task"
              value={entry.task ?? ""}
              onChange={handleChange}
              disabled={loadingTasks || !!taskError || tasks.length === 0}
            >
              <option value="">{loadingTasks ? "Loading tasks..." : taskError ? taskError : "Select a task"}</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Time inputs and notes are shown only when ready */}
        {timeInputsVisible && (
          <>
            <label>
              Start
              <select name="startTime" value={entry.startTime} onChange={handleChange} aria-label="Start time">
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              End
              <select name="endTime" value={entry.endTime} onChange={handleChange} aria-label="End time">
                {endOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="muted">
                Duration:{" "}
                {entry.startTime && entry.endTime
                  ? `${(((minutesFrom(entry.endTime) - minutesFrom(entry.startTime)) / 60) || 0).toFixed(2)} hrs`
                  : "—"}
              </div>
            </div>

            <label>
              Notes
              <textarea name="notes" value={entry.notes} onChange={handleChange} />
            </label>
          </>
        )}

        {/* actions: Save shown only when time inputs visible; show Back only when top-level selection made; Cancel kept at bottom */}
        <div className="actions">
          {timeInputsVisible && (
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          )}

          {/* Back appears only when Project or Internal Meeting is selected and reverts that selection */}
          {(selectedType === "project" || selectedType === "internal") && (
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

      {status && <p className="status">{status}</p>}
    </section>
  );
}