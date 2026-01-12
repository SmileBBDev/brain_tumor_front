# Agent B 작업 지시서 - My Page 프론트엔드 구현

## 목표
로그인한 사용자의 프로필 조회/수정/비밀번호 변경 페이지 구현

## 사전 조건
- A의 My Page 백엔드 API 완료 필요:
  - `GET /api/accounts/me/`
  - `PUT /api/accounts/me/`
  - `POST /api/accounts/me/change-password/`

---

## 작업 목록

### 1. 타입 추가

#### 파일: `src/types/user.ts` (추가)

```typescript
// My Page 프로필 수정용 (본인만 수정 가능한 필드)
export interface MyProfileUpdateForm {
  name: string;
  email: string;
  profile: {
    phoneMobile: string;
    phoneOffice: string;
    title: string;
  };
}

// 비밀번호 변경
export interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
```

---

### 2. API 서비스 추가

#### 파일: `src/services/mypage.api.ts` (신규)

```typescript
import { api } from '@/services/api';
import type { User, MyProfileUpdateForm, ChangePasswordForm } from '@/types/user';

// 내 정보 조회
export const getMyProfile = async (): Promise<User> => {
  const response = await api.get('/accounts/me/');
  return response.data;
};

// 내 정보 수정
export const updateMyProfile = async (data: MyProfileUpdateForm): Promise<User> => {
  const response = await api.put('/accounts/me/', data);
  return response.data;
};

// 비밀번호 변경
export const changeMyPassword = async (data: ChangePasswordForm): Promise<{ message: string }> => {
  const response = await api.post('/accounts/me/change-password/', data);
  return response.data;
};
```

---

### 3. MyPage 컴포넌트 생성

#### 파일: `src/pages/mypage/MyPage.tsx` (신규)

```typescript
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getMyProfile, updateMyProfile, changeMyPassword } from '@/services/mypage.api';
import type { User, MyProfileUpdateForm, ChangePasswordForm } from '@/types/user';
import { toast } from 'react-toastify';
import './MyPage.css';

export default function MyPage() {
  const { user: authUser, setUser } = useAuthStore();
  const [user, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [editMode, setEditMode] = useState(false);

  // 프로필 폼
  const [profileForm, setProfileForm] = useState<MyProfileUpdateForm>({
    name: '',
    email: '',
    profile: {
      phoneMobile: '',
      phoneOffice: '',
      title: '',
    },
  });

  // 비밀번호 폼
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // 데이터 로드
  useEffect(() => {
    loadMyProfile();
  }, []);

  const loadMyProfile = async () => {
    try {
      const data = await getMyProfile();
      setUserData(data);
      setProfileForm({
        name: data.name,
        email: data.email,
        profile: {
          phoneMobile: data.profile?.phoneMobile || '',
          phoneOffice: data.profile?.phoneOffice || '',
          title: data.profile?.title || '',
        },
      });
    } catch (err) {
      toast.error('프로필 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    try {
      const updated = await updateMyProfile(profileForm);
      setUserData(updated);
      setUser(updated); // authStore 업데이트
      setEditMode(false);
      toast.success('프로필이 수정되었습니다.');
    } catch (err) {
      toast.error('프로필 수정에 실패했습니다.');
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      await changeMyPassword(passwordForm);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      toast.success('비밀번호가 변경되었습니다.');
    } catch (err: any) {
      const errorMsg = err.response?.data?.current_password?.[0]
        || err.response?.data?.new_password?.[0]
        || '비밀번호 변경에 실패했습니다.';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="mypage-container">
      <div className="mypage-header">
        <h1>마이페이지</h1>
        <p className="subtitle">{user?.name}님의 계정 정보</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mypage-tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          프로필 정보
        </button>
        <button
          className={`tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          비밀번호 변경
        </button>
      </div>

      {/* 프로필 탭 */}
      {activeTab === 'profile' && (
        <div className="mypage-content">
          <div className="profile-section">
            <h3>계정 정보</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>로그인 ID</label>
                <span>{user?.login_id}</span>
              </div>
              <div className="info-item">
                <label>역할</label>
                <span className="role-badge">{user?.role?.name}</span>
              </div>
              <div className="info-item">
                <label>마지막 로그인</label>
                <span>{user?.last_login ? new Date(user.last_login).toLocaleString() : '-'}</span>
              </div>
              <div className="info-item">
                <label>계정 생성일</label>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <div className="section-header">
              <h3>개인 정보</h3>
              {!editMode && (
                <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                  수정
                </button>
              )}
            </div>

            {editMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>이름</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>이메일</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>휴대폰</label>
                  <input
                    type="tel"
                    value={profileForm.profile.phoneMobile}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        profile: { ...profileForm.profile, phoneMobile: e.target.value },
                      })
                    }
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="form-group">
                  <label>사무실 전화</label>
                  <input
                    type="tel"
                    value={profileForm.profile.phoneOffice}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        profile: { ...profileForm.profile, phoneOffice: e.target.value },
                      })
                    }
                    placeholder="02-0000-0000"
                  />
                </div>
                <div className="form-group">
                  <label>직함</label>
                  <input
                    type="text"
                    value={profileForm.profile.title}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        profile: { ...profileForm.profile, title: e.target.value },
                      })
                    }
                    placeholder="전문의, 과장 등"
                  />
                </div>

                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
                    취소
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveProfile}>
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <label>이름</label>
                  <span>{user?.name}</span>
                </div>
                <div className="info-item">
                  <label>이메일</label>
                  <span>{user?.email}</span>
                </div>
                <div className="info-item">
                  <label>휴대폰</label>
                  <span>{user?.profile?.phoneMobile || '-'}</span>
                </div>
                <div className="info-item">
                  <label>사무실 전화</label>
                  <span>{user?.profile?.phoneOffice || '-'}</span>
                </div>
                <div className="info-item">
                  <label>직함</label>
                  <span>{user?.profile?.title || '-'}</span>
                </div>
                <div className="info-item">
                  <label>입사일</label>
                  <span>{user?.profile?.hireDate || '-'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 비밀번호 변경 탭 */}
      {activeTab === 'password' && (
        <div className="mypage-content">
          <div className="profile-section">
            <h3>비밀번호 변경</h3>
            <div className="password-form">
              <div className="form-group">
                <label>현재 비밀번호</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current_password: e.target.value })
                  }
                  placeholder="현재 비밀번호 입력"
                />
              </div>
              <div className="form-group">
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new_password: e.target.value })
                  }
                  placeholder="8자 이상 입력"
                />
              </div>
              <div className="form-group">
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                  placeholder="새 비밀번호 재입력"
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={
                    !passwordForm.current_password ||
                    !passwordForm.new_password ||
                    !passwordForm.confirm_password
                  }
                >
                  비밀번호 변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 4. 스타일 추가

#### 파일: `src/pages/mypage/MyPage.css` (신규)

```css
.mypage-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.mypage-header {
  margin-bottom: 24px;
}

.mypage-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.mypage-header .subtitle {
  color: var(--text-secondary, #666);
}

.mypage-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  margin-bottom: 24px;
}

.mypage-tabs .tab {
  padding: 12px 24px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary, #666);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.mypage-tabs .tab.active {
  color: var(--primary, #1976d2);
  border-bottom-color: var(--primary, #1976d2);
}

.mypage-tabs .tab:hover:not(.active) {
  background: var(--bg-secondary, #f5f5f5);
}

.mypage-content {
  background: var(--bg-primary, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.profile-section {
  padding: 24px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.profile-section:last-child {
  border-bottom: none;
}

.profile-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin-bottom: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.info-item span {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.role-badge {
  display: inline-block;
  padding: 4px 8px;
  background: var(--primary-light, #e3f2fd);
  color: var(--primary, #1976d2);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.edit-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary, #1976d2);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary, #1976d2);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark, #1565c0);
}

.btn-primary:disabled {
  background: var(--disabled, #ccc);
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
}

.btn-secondary:hover {
  background: var(--border-color, #e0e0e0);
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
```

---

### 5. 라우트 등록

#### 파일: `src/router/index.tsx` (수정)

```typescript
// import 추가
import MyPage from '@/pages/mypage/MyPage';

// routes 배열에 추가
{
  path: '/mypage',
  element: <MyPage />,
},
```

---

### 6. 헤더/사이드바에 마이페이지 링크 추가 (선택)

사용자 아이콘 클릭 시 드롭다운 또는 사이드바에 "마이페이지" 메뉴 추가

```tsx
// 헤더 컴포넌트에서
<Link to="/mypage">마이페이지</Link>
```

---

## 테스트 체크리스트

- [ ] 마이페이지 접근 (로그인 필요)
- [ ] 프로필 정보 조회 (이름, 이메일, 휴대폰, 직함 등)
- [ ] 계정 정보 조회 (로그인 ID, 역할, 마지막 로그인)
- [ ] 프로필 수정 모드 전환
- [ ] 프로필 저장 (이름, 이메일, 연락처, 직함)
- [ ] 비밀번호 변경 탭 전환
- [ ] 비밀번호 변경 (현재 비밀번호 확인)
- [ ] 새 비밀번호 불일치 시 에러 표시
- [ ] 반응형 레이아웃 (모바일)

---

## 참고 파일
- 기존 사용자 관리: `src/pages/admin/usersManagement/UserDetailPage.tsx`
- 타입: `src/types/user.ts`
- 인증 API: `src/services/auth.api.ts`
- AuthStore: `src/stores/authStore.ts`
