from django.urls import path
from .views import ChangePasswordView, LoginView, MeView
from apps.menus.views import UserMenuView   # ✅ menus 앱에서 가져오기

# 함수형 뷰라면 .as_view() 미작성 
# 클래스 기반 뷰라면 .as_view()를 사용
urlpatterns = [
    path("login/", LoginView.as_view(), name="login"), # 로그인
    path("me/", MeView.as_view(), name="me"), # 로그인 사용자 정보 조회 
    path("menu/", UserMenuView, name="user-menu"),  # 사용자 메뉴 조회
    path("change-password/", ChangePasswordView.as_view()), # 비밀번호 변경
    
]
