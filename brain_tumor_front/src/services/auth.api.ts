import {api} from '@/services/api';
import axios from 'axios';

// 인증 API 모음
export const login = (login_id : string, password : string) =>
    api.post('/auth/login/', {login_id, password});

export const fetchMe = () =>
    api.get('/auth/me/');

export const fetchMenu = () =>
    api.get('/auth/menu/');

// 비밀번호 변경 api
export const changePassword = async(
    old_password : string, 
    new_password : string 
) => {
    const token = localStorage.getItem('accessToken');
    return axios.post(
        '/api/auth/change-password/',
        {
            old_password,
            new_password
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    )
}
