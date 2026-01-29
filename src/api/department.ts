import React, { useState, useEffect } from "react";
import axios from "axios";
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
  const response = await axios.get(`${apiBase}/api/departments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.departments;
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
  const response = await axios.post(
    `${apiBase}/api/employees`,
    { firstName, lastName, email, object_id, department_id },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}
