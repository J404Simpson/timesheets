import axios from "axios";
import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Task = {
  id: number;
  name: string;
  enabled: boolean;
};

export async function getTasksForPhaseAndEmployee(phaseId: number): Promise<Task[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await axios.get(`${apiBase}/api/phases/${phaseId}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.tasks;
}
