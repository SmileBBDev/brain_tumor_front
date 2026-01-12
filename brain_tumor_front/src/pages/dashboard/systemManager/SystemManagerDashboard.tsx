import {useState} from "react";
import DoctorDashboard from "../doctor/DoctorDashboard";
import NurseDashboard from "../nurse/NurseDashboard";
import LISDashboard from "../lis/LISDashboard";
import RISDashboard from "../ris/RISDashboard";
import PatientDashboardPreview from "../patient/PatientDashboardPreview";

const dashboards = {
  DOCTOR: <DoctorDashboard />,
  NURSE: <NurseDashboard />,
  LIS: <LISDashboard />,
  RIS: <RISDashboard />,
  PATIENT: <PatientDashboardPreview />,
};

export default function SystemManagerDashboard() {
  const [active, setActive] =
    useState<keyof typeof dashboards>('DOCTOR');

  return (
    <>
      <div className="role-tabs">
        {Object.keys(dashboards).map(role => (
          <button key={role} onClick={() => setActive(role as any)}>
            {role}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {dashboards[active]}
      </div>
    </>
  );
}


// export default function SystemManagerDashboard() {
//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
//       <section>
//         <h2>Doctor Dashboard</h2>
//         <DoctorDashboard />
//       </section>

//       <section>
//         <h2>Nurse Dashboard</h2>
//         <NurseDashboard />
//       </section>

//       <section>
//         <h2>LIS Dashboard</h2>
//         <CommingSoon />
//       </section>

//       <section>
//         <h2>RIS Dashboard</h2>
//         <CommingSoon />
//       </section>
//     </div>
//   );
// }
