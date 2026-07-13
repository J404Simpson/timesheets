import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Task = {
  id: number;
  name: string;
  enabled: boolean;
  active: boolean;
  task_type?: "LEAVE" | "PROJECT" | "SUSTAINING";
  phases?: { id: number; name: string }[];
  departments?: { id: number; name: string }[];
};

function normalizeDepartments(value: unknown): { id: number; name: string }[] {
  const toArray = (input: unknown): unknown[] => {
    if (Array.isArray(input)) return input;
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return toArray(value)
    .map((item) => {
      const obj = item as { id?: unknown; name?: unknown };
      return {
        id: typeof obj.id === "number" ? obj.id : Number(obj.id ?? 0),
        name: typeof obj.name === "string" ? obj.name : String(obj.name ?? ""),
      };
    })
    .filter((d) => Number.isFinite(d.id) && d.id > 0 && d.name.length > 0);
}

function normalizeTask(task: Task & { departments?: unknown }): Task {
  return {
    ...task,
    departments: normalizeDepartments(task.departments),
  };
}

async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json() as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim()) {
      return `${data.error} (${response.status})`;
    }
  } catch {
    // Fall back to generic message when body is unavailable.
  }

  return `${fallback} (${response.status})`;
}

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
  return (data.tasks ?? []).map(normalizeTask);
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
  return (data.tasks ?? []).map(normalizeTask);
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

export async function updateTaskName(
  taskId: number,
  name: string,
  options?: { allowSimilarName?: boolean }
): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/name`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      ...(options?.allowSimilarName ? { allowSimilarName: true } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "Failed to update task name"));
  }

  const data = await response.json();
  return data.task;
}

export async function updateTaskDepartments(taskId: number, department_ids: number[]): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/departments`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ department_ids }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task departments (${response.status})`);
  }

  const data = await response.json();
  return normalizeTask(data.task);
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
export async function createSustainingTask(
  name: string,
  department_ids: number[],
  enabled: boolean,
  options?: { allowSimilarName?: boolean }
): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/sustaining`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      department_ids,
      enabled,
      ...(options?.allowSimilarName ? { allowSimilarName: true } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "Failed to create sustaining task"));
  }

  const data = await response.json();
  return data.task;
}

export async function createTask(
  name: string,
  department_ids: number[],
  phase_ids: number[],
  enabled: boolean,
  options?: { allowSimilarName?: boolean }
): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      department_ids,
      phase_ids,
      enabled,
      ...(options?.allowSimilarName ? { allowSimilarName: true } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "Failed to create task"));
  }

  const data = await response.json();
  return data.task;
}

export async function updateTaskPhases(taskId: number, phase_ids: number[]): Promise<Task> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/tasks/${taskId}/phases`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phase_ids }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task phases (${response.status})`);
  }

  const data = await response.json();
  return normalizeTask(data.task);
}