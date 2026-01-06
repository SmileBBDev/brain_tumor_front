import type { UserProfileForm } from "@/types/user";
import { useState } from "react";
import type { AccountForm } from "./AccountSection";

const [userProfile, setUserProfile] = useState<UserProfileForm>({
  name: "",
  birthDate: "",
  phoneMobile: "",
  email: "",
  phoneOffice: "",
  hireDate: "",
  departmentId: "",
  title: "",
});

const [account, setAccount] = useState<AccountForm>({
  login_id: "",
  password: "",
  role: "",
});
