import React, { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { getWeekEntries } from "../api/timesheet";

type Props = {
  refreshToken?: number;
};

export default function Profile({ refreshToken }: Props) {
  const { accounts } = useMsal();
  const account = accounts && accounts[0];
  const [weekHours, setWeekHours] = useState<number | null>(null);

  useEffect(() => {
    if (!account) {
      setWeekHours(null);
      return;
    }

    getWeekEntries()
      .then((entries) => {
        const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
        setWeekHours(total);
      })
      .catch(() => {
        setWeekHours(null);
      });
  }, [account, refreshToken]);

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
      {weekHoursLabel && <span className="profile-week-hours">{weekHoursLabel}</span>}
    </span>
  );
}