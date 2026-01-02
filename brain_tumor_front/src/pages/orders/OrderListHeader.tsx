// role에 따른 header 제목 매핑 컴포넌트
type Props = {
  role: string;
};


const TITLE_BY_ROLE: Record<string, string> = {
  SYSTEMMANAGER: '오더 관리',
  DOCTOR: '오더 목록',
  RIS: '오더 목록',
};

export default function OrderListHeader({ role }: Props) {
  return (
    <header className="page-header">
      <h2>{TITLE_BY_ROLE[role]}</h2>
    </header>
  );
}
