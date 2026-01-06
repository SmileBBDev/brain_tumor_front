import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import AppLayout from '@/layout/AppLayout';
import CommingSoon from '@/pages/common/CommingSoon';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<CommingSoon />} />

      {/* 비밀번호 변경 */}
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* 모든 내부 화면은 AppLayout에서 처리 */}
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}