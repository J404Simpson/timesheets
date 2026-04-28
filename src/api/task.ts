import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Task = {
  id: number;
  name: string;
  enabled: boolean;
  active: boolean;
  department_id?: number | null;
};

export async function getTasksForPhaseAndEmployee(phaseId: number): Promise<Task[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/phases/${phaseId}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks (${response.status})`);
  }
  const data = await response.json();
  return data.tasks;
}

export async function getTasksForProjectPhase(projectId: number, phaseId: number): Promise<Task[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(
    `${apiBase}/api/projects/${projectId}/phases/${phaseId}/tasks`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch project phase tasks (${response.status})`);
  }
  const data = await response.json();
  return data.tasks;
}

export async function getTasksForProjectPhaseWithInactive(projectId: number, phaseId: number, includeInactive = false): Promise<Task[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const q = includeInactive ? "?includeInactive=true" : "";
  const response = await fetch(
    `${apiBase}/api/projects/${projectId}/phases/${phaseId}/tasks${q}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch project phase tasks (${response.status})`);
  }
  const data = await response.json();
  return data.tasks;
}

export async function deactivateTask(taskId: number): Promise<void> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/deactivate`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to deactivate task (${response.status})`);
  }
}
