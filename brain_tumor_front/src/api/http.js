// src/api/http.js
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 60000,
});

// 공통 인터셉터(선택) - 필요하면 확장
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // 여기서 공통 에러 포맷팅 가능
    return Promise.reject(err);
  }
);
