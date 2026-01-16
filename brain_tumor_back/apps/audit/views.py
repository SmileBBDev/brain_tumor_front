from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, CharFilter, ChoiceFilter, DateFilter

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogFilter(FilterSet):
    """감사 로그 필터"""
    user_login_id = CharFilter(field_name='user__login_id', lookup_expr='icontains')
    action = ChoiceFilter(choices=AuditLog.ACTION_CHOICES)
    date = DateFilter(field_name='created_at', lookup_expr='date')
    date_from = DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = AuditLog
        fields = ['user_login_id', 'action', 'date', 'date_from', 'date_to']


class AuditLogListView(generics.ListAPIView):
    """
    감사 로그 목록 조회 API
    - 관리자 전용
    - 필터: user_login_id, action, date, date_from, date_to
    - 정렬: created_at (기본 내림차순)
    """
    queryset = AuditLog.objects.select_related('user').order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = AuditLogFilter
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']
