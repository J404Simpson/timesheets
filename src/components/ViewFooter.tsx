import type { ReactNode } from "react";

type Props = {
  startContent?: ReactNode;
  centerContent?: ReactNode;
  endContent?: ReactNode;
  className?: string;
};

export default function ViewFooter({
  startContent,
  centerContent,
  endContent,
  className = "week-nav admin-panel-footer",
}: Props): JSX.Element {
  return (
    <div className={className}>
      <div className="week-nav-group week-nav-start">{startContent}</div>
      <div className="week-nav-group week-nav-center">{centerContent}</div>
      <div className="week-nav-group week-nav-end">{endContent}</div>
    </div>
  );
}
