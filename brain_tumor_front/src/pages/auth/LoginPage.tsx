// 로그인 화면
/**
 * 로그인 처리 플로우
 * [LoginPage]
    ↓
    POST /api/auth/login/
    ↓
    accessToken / refreshToken 발급
    ↓
    GET /api/auth/me
    ↓
    GET /api/menus
    ↓
    AuthProvider 상태 갱신
    ↓
    Sidebar 자동 갱신

 */
import { useState } from 'react';
import { login } from '../../services/auth.api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/pages/auth/AuthProvider';

import '@/assets/style/login.css';
import Swal from 'sweetalert2';

export default function LoginPage(){
    const [id, setId] = useState('');
    const [pw, setPw] = useState('');    
    const navigate = useNavigate();

    const { refreshAuth } = useAuth();
    
    const handleLogin = async () => {
        //api 호출해서 로그인 처리 기능
        try{
            /** 로그인 API 호출 */
            const res = await login(id, pw);
            // 로그인 성공 - 토큰 저장
            localStorage.setItem('accessToken', res.data.access); // access 토큰 저장
            localStorage.setItem('refreshToken', res.data.refresh); // refresh 토큰도 저장

            await refreshAuth();

            await Swal.fire({
                icon: 'success',
                title: '로그인 성공',
                text: '오늘도 화이팅하세요.',
                timer: 1200,
                width: 424,
                padding: '1.25rem',
                showConfirmButton: false,
            });

            //  홈으로 이동
            navigate('/dashboard', {replace : true});
        }catch(error){
            // 로그인 실패
            Swal.fire({
                icon: 'error',
                title: '인증 실패',
                text: '아이디 또는 비밀번호를 확인해주세요.',
                width: 424,
                padding: '1.25rem',
                confirmButtonText: '확인',
                confirmButtonColor: '#1d4ed8', // 기존 버튼 색이랑 맞춤
                
            });
            console.error(error);
        }
        
    }

    return(
        <div className="login-page">
            <div className="login-overlay" />

            <header className="login-header">
                <div className="logo">                
                <span className="logo-icon">
                    <i className="fa-solid fa-brain"></i>
                </span>
                <div>
                    <strong>CDSS</strong>
                    <span className="sub">(brain_tumor)</span>
                    <div className="desc">CLINICAL DECISION SUPPORT SYSTEM</div>
                </div>
                </div>
            </header>

            <div className="login-container">
                <div className="login-card">
                <h2>로그인</h2>

                <div className="login-field">
                    <input
                    placeholder="아이디"
                    onChange={(e) => setId(e.target.value)}
                    />
                </div>

                <div className="login-field">
                    <input
                    type="password"
                    placeholder="비밀번호"
                    onChange={(e) => setPw(e.target.value)}
                    />
                </div>

                <button className="login-button" onClick={handleLogin}>
                    로그인
                </button>

                <div className="login-footer">
                    <a href="#">비밀번호를 잊으셨나요?</a>
                </div>
                </div>
            </div>
        </div>
    )
}