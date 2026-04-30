import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Task = {
  id: number;
  name: string;
  enabled: boolean;
  active: boolean;
  department_id?: number | null;
  task_type?: "LEAVE" | "PROJECT" | "SUSTAINING";
  phases?: { id: number; name: string }[];
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
    // Fastify rejects requests that declare JSON content-type with an empty body.
    // Send an explicit empty JSON object so the server's JSON parser accepts the request.
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const status = response.status;
    // Do not read or log response body here to avoid exposing any sensitive data in browser console.
    console.error(`deactivateTask failed: status ${status}`);
    throw new Error(`Failed to deactivate task (${status})`);
  }
}

export async function updateTaskEnabled(taskId: number, enabled: boolean): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/enabled`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task enabled state (${response.status})`);
  }

  const data = await response.json();
  return data.task;
}

export async function updateTaskActive(taskId: number, active: boolean): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/active`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ active }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task active state (${response.status})`);
  }

  const data = await response.json();
  return data.task;
}

export async function getAllTasks(includeInactive = true): Promise<Task[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const q = includeInactive ? "?includeInactive=true" : "";
  const response = await fetch(`${apiBase}/api/tasks${q}`, {
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
