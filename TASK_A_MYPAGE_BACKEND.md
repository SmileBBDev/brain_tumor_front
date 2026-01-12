# Agent A 작업 지시서 - My Page 백엔드 API

## 목표
현재 로그인한 사용자의 프로필 조회/수정/비밀번호 변경 API 구현

## 현재 상태
- `User` 모델: 기본 사용자 정보 (login_id, name, email, role 등)
- `UserProfile` 모델: 추가 프로필 정보 (birthDate, phoneMobile, phoneOffice, hireDate, title 등)
- `UserSerializer`: profile 포함하여 반환
- `UserUpdateSerializer`: profile 업데이트 지원

---

## 작업 목록

### 1. MyPage 전용 Serializer 추가

#### 파일: `apps/accounts/serializers.py` (추가)

```python
# 내 프로필 수정용 Serializer (본인만 수정 가능한 필드)
class MyProfileUpdateSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'name',
            'email',
            'profile',
        ]
        # login_id, role, is_active 등은 본인이 수정 불가

    @transaction.atomic
    def update(self, instance, validated_data):
        # profile 업데이트
        profile_data = validated_data.pop('profile', None)
        if profile_data is not None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        # user 기본 필드 (name, email만)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        return instance


# 비밀번호 변경 Serializer
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('현재 비밀번호가 일치하지 않습니다.')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': '새 비밀번호가 일치하지 않습니다.'
            })

        # 현재 비밀번호와 동일한지 체크
        if data['current_password'] == data['new_password']:
            raise serializers.ValidationError({
                'new_password': '현재 비밀번호와 다른 비밀번호를 입력하세요.'
            })

        return data
```

---

### 2. MyPage View 추가

#### 파일: `apps/accounts/views.py` (추가)

```python
from .serializers import MyProfileUpdateSerializer, ChangePasswordSerializer

# 5. 내 정보 조회/수정 (My Page)
class MyProfileView(APIView):
    """
    GET /api/accounts/me/ - 내 정보 조회
    PUT /api/accounts/me/ - 내 정보 수정
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """내 정보 조회"""
        user = request.user

        # is_online 계산
        online_threshold = timezone.now() - timedelta(seconds=60)
        is_online = user.last_seen and user.last_seen >= online_threshold

        serializer = UserSerializer(user)
        data = serializer.data
        data['is_online'] = is_online

        return Response(data)

    def put(self, request):
        """내 정보 수정 (name, email, profile만 수정 가능)"""
        user = request.user
        serializer = MyProfileUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            # 업데이트된 전체 정보 반환
            return Response(UserSerializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 6. 비밀번호 변경 (My Page)
class ChangePasswordView(APIView):
    """
    POST /api/accounts/me/change-password/ - 비밀번호 변경
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.must_change_password = False  # 비밀번호 변경 필수 플래그 해제
            user.save()

            return Response({
                'message': '비밀번호가 성공적으로 변경되었습니다.',
                'must_change_password': False
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

---

### 3. URL 등록

#### 파일: `apps/accounts/urls.py` (수정)

```python
from django.urls import path
from .views import (
    UnlockUserView, UserListView, UserDetailView, UserToggleActiveView,
    MyProfileView, ChangePasswordView  # 추가
)

urlpatterns = [
    # 기존 URL
    path("", UserListView.as_view(), name="user-list"),
    path("<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("<int:pk>/toggle-active/", UserToggleActiveView.as_view(), name="user_toggle_active"),
    path("<int:pk>/unlock/", UnlockUserView.as_view()),

    # My Page API 추가
    path("me/", MyProfileView.as_view(), name="my-profile"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
]
```

---

## API 명세

### 1. GET /api/accounts/me/
내 정보 조회

**Response:**
```json
{
  "id": 1,
  "login_id": "doctor1",
  "name": "김의사",
  "email": "doctor1@hospital.com",
  "role": {
    "code": "DOCTOR",
    "name": "의사"
  },
  "is_active": true,
  "last_login": "2026-01-12T10:30:00Z",
  "created_at": "2025-01-01T09:00:00Z",
  "is_online": true,
  "must_change_password": false,
  "profile": {
    "birthDate": "1985-03-15",
    "phoneMobile": "010-1234-5678",
    "phoneOffice": "02-1234-5678",
    "hireDate": "2020-01-01",
    "departmentId": 1,
    "title": "전문의"
  }
}
```

### 2. PUT /api/accounts/me/
내 정보 수정

**Request:**
```json
{
  "name": "김의사",
  "email": "doctor1@hospital.com",
  "profile": {
    "phoneMobile": "010-9999-8888",
    "phoneOffice": "02-9999-8888",
    "title": "과장"
  }
}
```

**Response:** 업데이트된 전체 사용자 정보

### 3. POST /api/accounts/me/change-password/
비밀번호 변경

**Request:**
```json
{
  "current_password": "현재비밀번호",
  "new_password": "새비밀번호123!",
  "confirm_password": "새비밀번호123!"
}
```

**Response (성공):**
```json
{
  "message": "비밀번호가 성공적으로 변경되었습니다.",
  "must_change_password": false
}
```

**Response (실패):**
```json
{
  "current_password": ["현재 비밀번호가 일치하지 않습니다."]
}
```

---

## 테스트 체크리스트

- [ ] GET /api/accounts/me/ - 로그인한 사용자 정보 조회
- [ ] PUT /api/accounts/me/ - 이름, 이메일, 프로필 수정
- [ ] PUT /api/accounts/me/ - role, is_active 등은 수정 불가 확인
- [ ] POST /api/accounts/me/change-password/ - 비밀번호 변경
- [ ] 비밀번호 변경 후 must_change_password = False 확인
- [ ] 잘못된 현재 비밀번호 시 에러
- [ ] 새 비밀번호 불일치 시 에러

---

## 참고 파일
- 모델: `apps/accounts/models/user.py`, `apps/accounts/models/user_profile.py`
- 기존 Serializer: `apps/accounts/serializers.py`
- 기존 View: `apps/accounts/views.py`
