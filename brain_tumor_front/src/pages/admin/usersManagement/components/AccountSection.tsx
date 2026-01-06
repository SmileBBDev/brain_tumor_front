import { convert }  from "hangul-romanization";

export interface AccountForm {
  login_id: string;
  // password: string;
  role: string;
}


interface Props {
  value: AccountForm;
  onChange: (v: AccountForm) => void;
  userName: string;
  birthDate: string;
}


// 아이디 생성
const generateLoginId = (name: string, birth: string) => {
  // birth: YYYY-MM-DD
  const shortBirth = birth.replaceAll("-", "").slice(2); // 950321
  console.log("name", name, "birth", birth, "shortBirth", shortBirth);

  console.log(convert("홍길동")); 
  const normalizedName = convert(name)
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9]/g, ""); // 영문/숫자만
  console.log("normalizedName", normalizedName, "name", name, "birth", birth, "shortBirth", shortBirth);
  return `${normalizedName}${shortBirth}`;
};

// 비밀번호 랜덤 생성 함수
// const generatePassword = (length = 10) => {
//   const chars =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
//   return Array.from({ length }, () =>
//     chars[Math.floor(Math.random() * chars.length)]
//   ).join("");
// };


export default function AccountSection({ value, onChange, userName, birthDate }: Props) {
  const handle =
    (key: keyof AccountForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };
  
  const handleGenerateId = () => {
    if (!userName || !birthDate) {
      alert("이름과 생년월일을 먼저 입력해주세요.");
      return;
    }

  const login_id = generateLoginId(userName, birthDate);
    onChange({ ...value, login_id });
  };

  // const handleGeneratePassword = () => {
  //   const password = generatePassword();
  //   onChange({ ...value, password });
  // };

  return (
    <section className="form-section dashed">
      <h3 className="section-title">계정 부여</h3>

      <div className="field">
        <label>User ID</label>
        <input
          className="userInfo"
          value={value.login_id} 
          onChange={handle("login_id")} />
        <button type="button" className="createUser" onClick={handleGenerateId}>
          아이디 생성
        </button>
      </div>

      {/* <div className="field">
        <label>Password</label>
        <input
          type="password"
          className="userInfo"
          value={value.password}
          onChange={handle("password")}
        />
        <button type="button" className="createUser" onClick={handleGeneratePassword}>
          비밀번호 생성
        </button>
      </div> */}

      <div className="field">
        <label>역할</label>
        <select 
          className="userInfoOption"
          value={value.role} 
          onChange={handle("role")}
        >
          <option value="">선택</option>
          <option value="ADMIN">관리자</option>
          <option value="DOCTOR">의사</option>
          <option value="NURSE">간호사</option>
          <option value="PATIENT">환자</option>
          <option value="RIS">영상과</option>
          <option value="LIS">검사과</option>
        </select>
      </div>
    </section>
  );
}
