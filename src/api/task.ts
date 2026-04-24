import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Task = {
  id: number;
  name: string;
  enabled: boolean;
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
