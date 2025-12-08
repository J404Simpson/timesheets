import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { protectedResources } from "../auth/msalConfig";

type Entry = {
  workDate: string;
  type?: "project" | "internal";
  project?: string;
  phase?: string;
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

/* Example project/phase data — replace with real data source later */
const PROJECTS: { id: string; name: string; phases: string[] }[] = [
  { id: "proj-a", name: "Alpha Project", phases: ["Design", "Development", "QA"] },
  { id: "proj-b", name: "Beta Project", phases: ["Planning", "Implementation"] }
];

export default function TimesheetForm({ onCancel }: { onCancel?: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const STEP_MINUTES = 15; // 0.25 hour increments
  const timeOptions = generateTimeOptions(STEP_MINUTES);

  const [entry, setEntry] = useState<Entry>({
    workDate: today,
    startTime: "09:00",
    endTime: "17:00",
    notes: ""
  });
  const [selectedType, setSelectedType] = useState<"none" | "project" | "internal">("none");
  const [status, setStatus] = useState<string | null>(null);

  const { instance, accounts } = useMsal();
  const account = accounts && accounts[0];

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

  const submitLocal = (e: React.FormEvent) => {
    e.preventDefault();

    // validation
    if (selectedType === "project") {
      if (!entry.project) {
        setStatus("Please select a project.");
        return;
      }
      const phases = PROJECTS.find((p) => p.id === entry.project)?.phases ?? [];
      if (phases.length > 0 && !entry.phase) {
        setStatus("Please select a phase.");
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
    const out = { ...entry, type: selectedType === "none" ? undefined : selectedType, hours };

    setStatus(`Saved locally: ${JSON.stringify(out)}`);
    console.log("Timesheet entry:", out);
  };

  const callProtectedApi = async () => {
    setStatus("Acquiring token...");
    if (!account) {
      setStatus("No signed-in account found.");
      return;
    }
    try {
      const request = {
        scopes: [protectedResources.timesheetApi.scope],
        account
      };

      let response;
      try {
        response = await instance.acquireTokenSilent(request);
      } catch (silentError) {
        response = await instance.acquireTokenPopup(request);
      }

      const token = response.accessToken;
      setStatus("Calling protected API...");

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "https://example.com";
      const resp = await axios.post(
        `${apiBase}/api/timesheet/demo`,
        { entry: { ...entry, hours: +(((minutesFrom(entry.endTime!) - minutesFrom(entry.startTime!)) / 60).toFixed(2)), type: selectedType } },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setStatus(`API responded: ${JSON.stringify(resp.data)}`);
    } catch (err) {
      console.error("API call failed", err);
      setStatus(`API call error: ${(err as any)?.message ?? err}`);
    }
  };

  // compute end options based on start
  const startMin = entry.startTime ? minutesFrom(entry.startTime) : 0;
  const minEnd = startMin + STEP_MINUTES;
  const endOptions = timeOptions.filter((opt) => minutesFrom(opt.value) >= minEnd);

  const availablePhases = entry.project ? PROJECTS.find((p) => p.id === entry.project)?.phases ?? [] : [];

  // determine when to show time inputs
  const timeInputsVisible =
    selectedType === "internal" ||
    (selectedType === "project" && entry.project && (availablePhases.length === 0 || !!entry.phase));

  return (
    <section>
      <div className="new-entry-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>New Entry</h2>

        <input
          type="date"
          name="workDate"
          value={entry.workDate}
          max={today}
          onChange={(e) => handleField("workDate", e.target.value)}
          aria-label="Work date"
        />
      </div>

      <form onSubmit={submitLocal} className="form">
        {/* Top area: two buttons initially. show selected button and hide the other when selected */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(selectedType === "none" || selectedType === "project") && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelectedType("project");
                setStatus(null);
              }}
            >
              Project
            </button>
          )}

          {(selectedType === "none" || selectedType === "internal") && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelectedType("internal");
                setStatus(null);
              }}
            >
              Internal Meeting
            </button>
          )}
        </div>

        {/* Project dropdown shows after selecting Project */}
        {selectedType === "project" && (
          <label>
            Project
            <select
              name="project"
              value={entry.project ?? ""}
              onChange={(e) => {
                // selecting a project; clear phase until chosen
                handleChange(e);
                handleField("phase", undefined);
              }}
            >
              <option value="">Select a project</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Phase shown if project has phases */}
        {selectedType === "project" && entry.project && availablePhases.length > 0 && (
          <label>
            Phase
            <select name="phase" value={entry.phase ?? ""} onChange={handleChange}>
              <option value="">Select a phase</option>
              {availablePhases.map((ph) => (
                <option key={ph} value={ph}>
                  {ph}
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

        {/* actions: Save shown only when time inputs visible; Cancel always visible and kept at bottom */}
        <div className="actions">
          {timeInputsVisible && (
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          )}

          <button
            type="button"
            onClick={() => {
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