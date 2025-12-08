import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { protectedResources } from "../auth/msalConfig";

type Entry = {
  workDate: string;
  project: string;
  phase: string;
  hours: number;
  notes?: string;
};

export default function TimesheetForm() {
  const [entry, setEntry] = useState<Entry>({
    workDate: new Date().toISOString().slice(0, 10),
    project: "",
    phase: "",
    hours: 8,
    notes: ""
  });
  const [status, setStatus] = useState<string | null>(null);

  const { instance, accounts } = useMsal();

  const account = accounts && accounts[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEntry((prev) => ({
      ...prev,
      [name]: name === "hours" ? parseFloat(value) : value
    }));
  };

  const submitLocal = (e: React.FormEvent) => {
    e.preventDefault();
    // For the starter, we'll just show the entry locally
    setStatus(`Saved locally: ${JSON.stringify(entry)}`);
    console.log("Timesheet entry:", entry);
  };

  // Example: call a protected API with an acquired token
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

      // acquire token silently if possible
      let response;
      try {
        response = await instance.acquireTokenSilent(request);
      } catch (silentError) {
        // fallback to interactive if silent acquisition fails
        response = await instance.acquireTokenPopup(request);
      }

      const token = response.accessToken;
      setStatus("Calling protected API...");

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "https://example.com";
      const resp = await axios.post(
        `${apiBase}/api/timesheet/demo`,
        { entry },
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

  return (
    <section>
      <h2>Timesheet Entry</h2>
      <form onSubmit={submitLocal} className="form">
        <label>
          Work date
          <input type="date" name="workDate" value={entry.workDate} onChange={handleChange} />
        </label>

        <label>
          Project
          <input type="text" name="project" value={entry.project} onChange={handleChange} />
        </label>

        <label>
          Phase
          <input type="text" name="phase" value={entry.phase} onChange={handleChange} />
        </label>

        <label>
          Hours
          <input type="number" step="0.25" min="0" max="24" name="hours" value={entry.hours} onChange={handleChange} />
        </label>

        <label>
          Notes
          <textarea name="notes" value={entry.notes} onChange={handleChange} />
        </label>

        <div className="actions">
          <button type="submit" className="btn btn-primary">Save locally</button>
          <button type="button" onClick={callProtectedApi} className="btn btn-accent">
            Call protected API
          </button>
        </div>
      </form>

      {status && <p className="status">{status}</p>}
    </section>
  );
}