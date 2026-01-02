import { useAuth } from '../auth/AuthProvider';
import OrderListHeader from './OrderListHeader';
import OrderListFilter from './OrderListFilter';
import OrderListTable from './OrderListTable';

export default function OrderListPage() {
  const { user } = useAuth();
  const role = user?.role.code;
  if (!role) return <div>접근 권한 정보 없음</div>;

  return (
    <div className="page">
      <OrderListHeader role={role} />
      <OrderListFilter role={role} />
      <OrderListTable role={role} />
    </div>
  );
}
