// src/api/endpoints.js
export const EP = {
  orthanc: {
    uploadPatient: "/api/orthanc/upload-patient/",
    patients: "/api/orthanc/patients/",
    studies: "/api/orthanc/studies/",
    series: "/api/orthanc/series/",
    instances: "/api/orthanc/instances/",
    instanceFile: (orthancId) => `/api/orthanc/instances/${orthancId}/file/`,
    deletePatient: (patientId) => `/api/orthanc/patients/${patientId}/`,
    deleteStudy: (studyId) => `/api/orthanc/studies/${studyId}/`,
    deleteSeries: (seriesId) => `/api/orthanc/series/${seriesId}/`,
  },
};
