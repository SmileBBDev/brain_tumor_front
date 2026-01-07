from .models import Menu, MenuPermission
from apps.accounts.services.permission_service import get_user_permission

# 특정 유저가 접근 가능한 메뉴를 반환하는 함수.
def get_user_menus(user):
    # 권한 체크 비활성화 - 모든 활성화된 메뉴 반환
    menus = (
        Menu.objects.filter(
            is_active=True
        )
        .select_related("parent")
        .prefetch_related("children", "labels")
        .order_by("order")
    )

    return menus

# 주어진 권한 코드로 접근 가능한 메뉴를 반환하는 함수.
def get_accessible_menus(permission_codes: list[str]):
    """
    permission_codes:
      ['VIEW_DASHBOARD', 'VIEW_PATIENT_LIST', ...]
    """

    menus = (
        Menu.objects
        .filter(
            is_active=True,
            menupermission__permission__code__in=permission_codes
        )
        .distinct()
        .select_related("parent")
        .prefetch_related("children")
        .order_by("order")
    )

    return menus