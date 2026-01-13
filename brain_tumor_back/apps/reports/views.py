import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from .models import FinalReport, ReportAttachment, ReportLog
from .serializers import (
    FinalReportListSerializer,
    FinalReportDetailSerializer,
    FinalReportCreateSerializer,
    FinalReportUpdateSerializer,
)
from apps.common.permission import IsDoctorOrAdmin

logger = logging.getLogger(__name__)


@extend_schema(tags=["Reports"])
class FinalReportListCreateView(APIView):
    """최종 보고서 목록 조회 / 생성"""
    permission_classes = [IsDoctorOrAdmin]

    @extend_schema(
        summary="보고서 목록 조회",
        description="최종 진료 보고서 목록을 조회합니다.",
        parameters=[
            OpenApiParameter(name='patient_id', type=int, description='환자 ID로 필터링'),
            OpenApiParameter(name='status', type=str, description='상태로 필터링'),
            OpenApiParameter(name='report_type', type=str, description='보고서 유형으로 필터링'),
        ],
        responses={200: FinalReportListSerializer(many=True)},
    )
    def get(self, request):
        queryset = FinalReport.objects.filter(is_deleted=False)

        # 필터링
        patient_id = request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        report_type = request.query_params.get('report_type')
        if report_type:
            queryset = queryset.filter(report_type=report_type)

        queryset = queryset.select_related('patient', 'created_by')
        serializer = FinalReportListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="보고서 생성",
        description="새로운 최종 진료 보고서를 생성합니다.",
        request=FinalReportCreateSerializer,
        responses={201: FinalReportDetailSerializer},
    )
    def post(self, request):
        serializer = FinalReportCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            report = serializer.save()
            response_serializer = FinalReportDetailSerializer(report)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Reports"])
class FinalReportDetailView(APIView):
    """최종 보고서 상세 조회 / 수정 / 삭제"""
    permission_classes = [IsDoctorOrAdmin]

    def get_object(self, pk):
        return get_object_or_404(FinalReport, pk=pk, is_deleted=False)

    @extend_schema(
        summary="보고서 상세 조회",
        description="최종 진료 보고서 상세 정보를 조회합니다.",
        responses={200: FinalReportDetailSerializer},
    )
    def get(self, request, pk):
        report = self.get_object(pk)
        serializer = FinalReportDetailSerializer(report)
        return Response(serializer.data)

    @extend_schema(
        summary="보고서 수정",
        description="최종 진료 보고서를 수정합니다. DRAFT 상태에서만 수정 가능합니다.",
        request=FinalReportUpdateSerializer,
        responses={200: FinalReportDetailSerializer},
    )
    def patch(self, request, pk):
        report = self.get_object(pk)
        serializer = FinalReportUpdateSerializer(
            report,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            updated_report = serializer.save()
            response_serializer = FinalReportDetailSerializer(updated_report)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="보고서 삭제",
        description="최종 진료 보고서를 삭제합니다 (소프트 삭제).",
        responses={204: None},
    )
    def delete(self, request, pk):
        report = self.get_object(pk)

        # DRAFT 상태에서만 삭제 가능
        if report.status != FinalReport.Status.DRAFT:
            return Response(
                {'error': '작성 중 상태의 보고서만 삭제할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.is_deleted = True
        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.CANCELLED,
            message='보고서가 삭제되었습니다.',
            actor=request.user
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Reports"])
class FinalReportSubmitView(APIView):
    """보고서 검토 제출"""
    permission_classes = [IsDoctorOrAdmin]

    @extend_schema(
        summary="보고서 검토 제출",
        description="보고서를 검토 대기 상태로 제출합니다.",
        responses={200: FinalReportDetailSerializer},
    )
    def post(self, request, pk):
        report = get_object_or_404(FinalReport, pk=pk, is_deleted=False)

        if report.status != FinalReport.Status.DRAFT:
            return Response(
                {'error': '작성 중 상태의 보고서만 제출할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = FinalReport.Status.PENDING_REVIEW
        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.SUBMITTED,
            message='보고서가 검토 제출되었습니다.',
            actor=request.user
        )

        serializer = FinalReportDetailSerializer(report)
        return Response(serializer.data)


@extend_schema(tags=["Reports"])
class FinalReportApproveView(APIView):
    """보고서 승인"""
    permission_classes = [IsDoctorOrAdmin]

    @extend_schema(
        summary="보고서 승인",
        description="보고서를 승인합니다.",
        responses={200: FinalReportDetailSerializer},
    )
    def post(self, request, pk):
        report = get_object_or_404(FinalReport, pk=pk, is_deleted=False)

        if report.status != FinalReport.Status.PENDING_REVIEW:
            return Response(
                {'error': '검토 대기 상태의 보고서만 승인할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = FinalReport.Status.APPROVED
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.approved_by = request.user
        report.approved_at = timezone.now()
        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.APPROVED,
            message='보고서가 승인되었습니다.',
            actor=request.user
        )

        serializer = FinalReportDetailSerializer(report)
        return Response(serializer.data)


@extend_schema(tags=["Reports"])
class FinalReportFinalizeView(APIView):
    """보고서 최종 확정"""
    permission_classes = [IsDoctorOrAdmin]

    @extend_schema(
        summary="보고서 최종 확정",
        description="보고서를 최종 확정합니다. 확정 후 수정이 불가능합니다.",
        responses={200: FinalReportDetailSerializer},
    )
    def post(self, request, pk):
        report = get_object_or_404(FinalReport, pk=pk, is_deleted=False)

        if report.status != FinalReport.Status.APPROVED:
            return Response(
                {'error': '승인된 보고서만 최종 확정할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = FinalReport.Status.FINALIZED
        report.finalized_at = timezone.now()
        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.FINALIZED,
            message='보고서가 최종 확정되었습니다.',
            actor=request.user
        )

        serializer = FinalReportDetailSerializer(report)
        return Response(serializer.data)
