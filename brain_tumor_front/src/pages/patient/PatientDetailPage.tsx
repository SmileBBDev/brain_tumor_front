import { useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import PatientDetailTabs from './PatientDetailTabs';
import PatientDetailContent from './PatientDetailContent';
import { useEffect } from 'react';
import '@/assets/style/patientDetailView.css';

export default function PatientDetailPage() {
  const { user } = useAuth();
  const role = user?.role.code;
  const { patientId } = useParams();

  const [params, setParams] = useSearchParams();

  useEffect(()=>{
    // 탭 파라미터가 없으면 기본값 설정
    if (!params.get('tab')) {
      setParams({ tab: 'summary' }, {replace: true});
    }
  }, []);

  // 접근 권한 체크
  if (!role) return <div>접근 권한 정보 없음</div>;

  return (
    <div className="page patient-detail">
      {/* Header 영역 - 환자 기본 정보 */}
      <section className="page-header">
        <div className="header-right">
          <button className="btn">환자 요약</button>
        </div>
      </section>
      
      {/* 환자 정보 */}
      {/* <PatientInfoBar />  Todo :  환자 정보 컴포넌트 생성하기 */}
      <section className="patient-info-bar">
        <div className="info-item">
          <span>환자 ID:</span>
          <span>{patientId}</span>
        </div>
        <div className="info-item">
          <span>이름:</span>
          <span>홍길동</span>
        </div>
        <div className="info-item">
          <span>나이:</span>
          <span>54</span>
        </div>
        <div className="info-item">
          <span>성별:</span>
          <span>남성</span>
        </div>
      </section>

      <PatientDetailTabs role={role} />
      <PatientDetailContent role={role} />
    </div>
  );
}
