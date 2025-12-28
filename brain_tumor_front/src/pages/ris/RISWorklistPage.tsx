// RIS 판독 워크리스트 페이지
export default function RISWorklistPage() {
  return (
    <div className="page">
      <section className="page-content">
        <div className="card">Worklist Table</div>
      </section>

      <table>
        <thead>
          <tr>
            <th>환자</th>
            <th>검사</th>
            <th>상태</th>
            <th>판독자</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={4} align="center">대기중인 판독 없음</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
