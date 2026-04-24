import React, { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { getWeekEntries } from "../api/timesheet";

type Props = {
  refreshToken?: number;
  weekOffset?: number;
  showWeekHours?: boolean;
};

export default function Profile({ refreshToken, weekOffset = 0, showWeekHours = true }: Props) {
  const { accounts } = useMsal();
  const account = accounts && accounts[0];
  const [weekHours, setWeekHours] = useState<number | null>(null);

  const toDateKeyLocal = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (!account) {
      setWeekHours(null);
      return;
    }

    if (!showWeekHours) {
      setWeekHours(null);
      return;
    }

    let weekOf: string | undefined;
    if (weekOffset !== 0) {
      const ref = new Date();
      ref.setDate(ref.getDate() + weekOffset * 7);
      weekOf = toDateKeyLocal(ref);
    }

    getWeekEntries(weekOf)
      .then((entries) => {
        const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
        setWeekHours(total);
      })
      .catch(() => {
        setWeekHours(null);
      });
  }, [account, refreshToken, weekOffset, showWeekHours]);

  const weekHoursLabel = useMemo(() => {
    if (weekHours === null) return "";
    const normalized = parseFloat(weekHours.toFixed(2));
    return `Total ${normalized}hrs`;
  }, [weekHours]);

  if (!account) {
    return <span className="profile">Not signed in</span>;
  }

  return (
    <span className="profile">
      <strong className="profile-name">{account.name ?? account.username}</strong>
      {showWeekHours && weekHoursLabel && <span className="profile-week-hours">{weekHoursLabel}</span>}
    </span>
  );
}