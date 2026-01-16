from django.urls import path
from .views import (
    FinalReportListCreateView,
    FinalReportDetailView,
    FinalReportSubmitView,
    FinalReportApproveView,
    FinalReportFinalizeView,
)

urlpatterns = [
    # 보고서 목록/생성
    path('', FinalReportListCreateView.as_view(), name='report-list-create'),

    # 보고서 상세/수정/삭제
    path('<int:pk>/', FinalReportDetailView.as_view(), name='report-detail'),

    # 보고서 상태 변경
    path('<int:pk>/submit/', FinalReportSubmitView.as_view(), name='report-submit'),
    path('<int:pk>/approve/', FinalReportApproveView.as_view(), name='report-approve'),
    path('<int:pk>/finalize/', FinalReportFinalizeView.as_view(), name='report-finalize'),
]
