import AiViewer from './AiViewer';
import AiResultPanel from './AiResultPanel';

import { useAuth } from '../auth/AuthProvider';


export default function AiSummaryPage() {
  const { user } = useAuth();
  const role = user?.role.code;

  if (!role) return <div>접근 권한 정보 없음</div>;

  return (
    <div className="page ai-summary">
      {/* <AiSummaryHeader /> */}
      <h1>AI 분석 결과</h1>
      <div className="ai-body">
        {/* 좌측 Viewer */}
        <section className="ai-viewer-area">
          <AiViewer />
        </section>
        {/* 우측 Result Panel */}
        <aside className="ai-panel-area">
          <AiResultPanel />
        </aside>
      </div>
    </div>
  );
}
