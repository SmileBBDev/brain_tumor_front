// src/components/UploadSection.jsx
import React, { useMemo, useRef, useState } from "react";
import "./UploadSection.css";
import { uploadPatientFolder } from "../api/orthancApi";

export default function UploadSection({ onUploaded }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [seriesPaths, setSeriesPaths] = useState([]);
  const [folderName, setFolderName] = useState(""); // Patient ID
  const [studyDescription, setStudyDescription] = useState(""); // ✅ Study Description
  const [uploadStatus, setUploadStatus] = useState(null);

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const canUpload = useMemo(
    () => Boolean(folderName && selectedFiles.length && !isUploading),
    [folderName, selectedFiles, isUploading]
  );

  const onFolderChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) {
      setSelectedFiles([]);
      setSeriesPaths([]);
      return;
    }

    setSelectedFiles(files);

    const sp = files.map((f) => {
      const rel = f.webkitRelativePath || "";
      const parts = rel.split(/[\\/]/);
      return parts[1] || "";
    });
    setSeriesPaths(sp);

    if (!folderName && files.length) {
      const rel = files[0].webkitRelativePath || "";
      setFolderName(rel.split(/[\\/]/)[0]);
    }
  };

  const resetAll = ({ clearPatientId = false, clearStudyDesc = false } = {}) => {
    setSelectedFiles([]);
    setSeriesPaths([]);
    setUploadStatus(null);
    setIsUploading(false);

    if (clearPatientId) setFolderName("");
    if (clearStudyDesc) setStudyDescription("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onUpload = async () => {
    if (!folderName || !selectedFiles.length) return;

    setIsUploading(true);
    setUploadStatus({ type: "info", text: "업로드 중..." });

    try {
      await uploadPatientFolder({
        patientId: folderName,
        studyDescription: studyDescription?.trim() || "",
        files: selectedFiles,
        seriesPaths,
      });

      setUploadStatus({ type: "success", text: "업로드 완료" });

      if (typeof onUploaded === "function") {
        await onUploaded();
      }
    } catch (e) {
      console.error("업로드 실패", e);
      setUploadStatus({
        type: "error",
        text: e?.response?.data?.detail || e?.message || "업로드 실패",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="uploadCard">
      <div className="uploadCardHeader">
        <h2 className="uploadTitle">폴더 업로드</h2>
        <p className="uploadHint">폴더명 = PatientID, 하위 폴더명 = Series 구분용</p>
      </div>

      <div className="uploadGrid">
        {/* Patient ID */}
        <div className="field">
          <label className="label">Patient ID</label>
          <input
            className="input"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="ex) sub-0004"
            disabled={isUploading}
          />
        </div>

        {/* ✅ Study Description */}
        <div className="field">
          <label className="label">Study Description</label>
          <input
            className="input"
            type="text"
            value={studyDescription}
            onChange={(e) => setStudyDescription(e.target.value)}
            placeholder='ex) Brain MRI Restoration (또는 "sub-0004_T2w")'
            disabled={isUploading}
          />
          <div className="metaRow subtle">
            <span>StudyDescription(0008,1030)로 저장</span>
            <span>{studyDescription ? `입력: ${studyDescription}` : "미입력"}</span>
          </div>
        </div>

        {/* Folder */}
        <div className="field">
          <label className="label">DICOM Folder</label>
          <input
            ref={fileInputRef}
            className="file"
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={onFolderChange}
            disabled={isUploading}
          />
          <div className="metaRow">
            <span>선택 파일: {selectedFiles.length}</span>
            <span>SeriesPath 샘플: {seriesPaths[0] || "-"}</span>
          </div>
        </div>

        {/* actions */}
        <div className="actions">
          <button className="btn" onClick={onUpload} disabled={!canUpload}>
            {isUploading ? "업로드 중..." : "업로드"}
          </button>

          <button
            className="btn ghost"
            onClick={() => resetAll({ clearPatientId: true, clearStudyDesc: true })}
            disabled={isUploading}
            title="파일 선택/상태/PatientID/StudyDescription 모두 초기화"
          >
            전체 초기화
          </button>

          <button
            className="btn ghost"
            onClick={() => resetAll({ clearPatientId: false, clearStudyDesc: false })}
            disabled={isUploading}
            title="파일 선택/상태만 초기화 (PatientID/StudyDescription 유지)"
          >
            파일만 초기화
          </button>
        </div>

        {/* status */}
        {uploadStatus && <div className={`status ${uploadStatus.type}`}>{uploadStatus.text}</div>}
      </div>
    </section>
  );
}
