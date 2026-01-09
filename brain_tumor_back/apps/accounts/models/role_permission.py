"""
RolePermission 모델 - DEPRECATED

참고: 실제 역할-권한 매핑은 Role.permissions ManyToMany 필드를 통해 관리됩니다.
이는 자동으로 accounts_role_permissions 테이블을 생성합니다.

이 모델은 기존 마이그레이션 호환성을 위해 유지되지만,
새로운 데이터는 Role.permissions를 사용해야 합니다.

SQL 시드 데이터: accounts_role_permissions 테이블 사용
"""
from django.db import models
from .role import Role
from .permission import Permission


class RolePermission(models.Model):
    """
    [DEPRECATED] - 사용하지 않음
    Role.permissions ManyToMany를 대신 사용하세요.

    기존 마이그레이션 호환성을 위해 유지됩니다.
    menu FK 제거됨 - 순환 의존성 해결
    """
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("role", "permission")
        db_table = 'accounts_rolepermission'  # 명시적 테이블명
        managed = False  # Django가 이 테이블을 관리하지 않음 (마이그레이션 제외)
