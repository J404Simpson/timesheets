import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

export type Department = {
  id: number;
  name: string;
};

export async function getDepartments(): Promise<Department[]> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/departments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch departments (${response.status})`);
  }
  const data = await response.json();
  return data.departments;
}

export async function createEmployee(
  firstName: string,
  lastName: string,
  email: string,
  object_id: string,
  department_id: number
): Promise<any> {
  const accessToken = await acquireTokenSilent([
    protectedResources.timesheetApi.scope,
  ]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiBase}/api/employees`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ firstName, lastName, email, object_id, department_id }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create employee (${response.status})`);
  }
  return response.json();
}
