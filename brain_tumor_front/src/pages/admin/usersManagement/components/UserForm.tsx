import { useState } from "react";
import UserInfoSection from "./UserInfoSection";
import AccountSection, { type AccountForm } from "./AccountSection";
import type { UserProfileForm } from "@/types/user";

interface Props {
  onSubmit: (data: { profile: UserProfileForm; account: AccountForm }) => void;
  onClose: () => void;
  onCreated: () => void;
  initialData?: {
    profile?: UserProfileForm;
    account?: AccountForm;
  };
}

export default function UserForm({ onSubmit, initialData }: Props) {
  const [profile, setProfile] = useState<UserProfileForm>({
    name: "",
    birthDate: "",
    phoneMobile: "",
    phoneOffice: "",
    email: "",
    hireDate: "",
    departmentId: "",
    title: "",
    ...initialData?.profile,
  });

  const [account, setAccount] = useState<AccountForm>({
    login_id: "",
    role: "",
    ...initialData?.account,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.login_id || !account.role) {
      alert("계정 정보를 모두 입력하세요.");
      return;
    }

    if (!profile.name || !profile.birthDate) {
      alert("필수 개인정보가 누락되었습니다.");
      return;
    }

    // 데이터 넘김
    await onSubmit({ profile, account });
  };

  return (
    <form className="user-form" id="user-form" onSubmit={handleSubmit}>
      <UserInfoSection value={profile} onChange={setProfile} />
      <AccountSection 
        value={account} 
        onChange={setAccount} 
        userName={profile.name}
        birthDate={profile.birthDate}
      />
    </form>
  );
}