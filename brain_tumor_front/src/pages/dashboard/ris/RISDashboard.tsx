import { RISSummaryCards } from "./RISSummaryCards";
import { RISWorklist } from "./RISWorklist";
import { RISPendingReports } from "./RISPendingReports";

export default function RISDashboard() {
  return (
    <div className="dashboard ris">
      <RISSummaryCards />
      <div className="dashboard-row">
        <RISWorklist />
        <RISPendingReports />
      </div>
    </div>
  );
}
