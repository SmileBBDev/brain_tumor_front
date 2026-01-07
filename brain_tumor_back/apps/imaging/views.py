from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.utils import timezone
from .models import ImagingStudy, ImagingReport
from .serializers import (
    ImagingStudyListSerializer,
    ImagingStudyDetailSerializer,
    ImagingStudyCreateSerializer,
    ImagingStudyUpdateSerializer,
    ImagingReportSerializer,
    ImagingSearchSerializer,
)


class ImagingStudyPagination(PageNumberPagination):
    """영상 검사 목록 페이지네이션"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ImagingStudyViewSet(viewsets.ModelViewSet):
    """
    영상 검사 CRUD API

    - 목록 조회: 모든 역할 가능
    - 상세 조회: 모든 역할 가능
    - 생성: DOCTOR, RADIOLOGIST, SYSTEMMANAGER만 가능
    - 수정: DOCTOR, RADIOLOGIST, SYSTEMMANAGER만 가능
    - 삭제: SYSTEMMANAGER만 가능 (soft delete)
    """
    queryset = ImagingStudy.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = ImagingStudyPagination

    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return ImagingStudyListSerializer
        elif self.action == 'create':
            return ImagingStudyCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ImagingStudyUpdateSerializer
        else:
            return ImagingStudyDetailSerializer

    def get_queryset(self):
        """검색 및 필터링"""
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'patient',
            'encounter',
            'ordered_by',
            'radiologist'
        )

        # 검색 파라미터
        q = self.request.query_params.get('q', '')
        if q:
            queryset = queryset.filter(
                Q(patient__name__icontains=q) |
                Q(patient__patient_number__icontains=q)
            )

        # 필터링
        modality = self.request.query_params.get('modality')
        if modality:
            queryset = queryset.filter(modality=modality)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        ordered_by = self.request.query_params.get('ordered_by')
        if ordered_by:
            queryset = queryset.filter(ordered_by_id=ordered_by)

        radiologist = self.request.query_params.get('radiologist')
        if radiologist:
            queryset = queryset.filter(radiologist_id=radiologist)

        patient = self.request.query_params.get('patient')
        if patient:
            queryset = queryset.filter(patient_id=patient)

        encounter = self.request.query_params.get('encounter')
        if encounter:
            queryset = queryset.filter(encounter_id=encounter)

        # 판독 상태 필터
        has_report = self.request.query_params.get('has_report')
        if has_report is not None:
            if has_report.lower() == 'true':
                queryset = queryset.exclude(report__isnull=True)
            elif has_report.lower() == 'false':
                queryset = queryset.filter(report__isnull=True)

        report_status = self.request.query_params.get('report_status')
        if report_status:
            queryset = queryset.filter(report__status=report_status)

        # 날짜 범위 필터
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(ordered_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(ordered_at__date__lte=end_date)

        return queryset

    def perform_create(self, serializer):
        """검사 오더 생성"""
        # DOCTOR, RADIOLOGIST, SYSTEMMANAGER만 생성 가능
        if self.request.user.role.code not in ['DOCTOR', 'RIS', 'SYSTEMMANAGER']:
            raise PermissionDenied("검사 오더를 생성할 권한이 없습니다.")

        serializer.save(ordered_by=self.request.user)

    def perform_update(self, serializer):
        """검사 정보 수정"""
        # DOCTOR, RADIOLOGIST, SYSTEMMANAGER만 수정 가능
        if self.request.user.role.code not in ['DOCTOR', 'RIS', 'SYSTEMMANAGER']:
            raise PermissionDenied("검사 정보를 수정할 권한이 없습니다.")

        serializer.save()

    def perform_destroy(self, instance):
        """검사 삭제 (Soft Delete)"""
        # SYSTEMMANAGER만 삭제 가능
        if self.request.user.role.code != 'SYSTEMMANAGER':
            raise PermissionDenied("검사를 삭제할 권한이 없습니다.")

        instance.is_deleted = True
        instance.save()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """검사 완료 처리"""
        study = self.get_object()

        # RADIOLOGIST, SYSTEMMANAGER만 가능
        if request.user.role.code not in ['RIS', 'SYSTEMMANAGER']:
            return Response(
                {'detail': '검사 완료 처리 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if study.status == 'completed':
            return Response(
                {'detail': '이미 완료된 검사입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        study.status = 'completed'
        study.performed_at = timezone.now()
        study.save()

        serializer = self.get_serializer(study)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """검사 취소"""
        study = self.get_object()

        # DOCTOR, RADIOLOGIST, SYSTEMMANAGER만 가능
        if request.user.role.code not in ['DOCTOR', 'RIS', 'SYSTEMMANAGER']:
            return Response(
                {'detail': '검사 취소 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if study.status == 'reported':
            return Response(
                {'detail': '판독이 완료된 검사는 취소할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        study.status = 'cancelled'
        study.save()

        serializer = self.get_serializer(study)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def worklist(self, request):
        """부서별 워크리스트 (RIS 워크리스트)"""
        # 진행 중인 검사만 조회 (ordered, scheduled, in-progress)
        queryset = self.get_queryset().filter(
            status__in=['ordered', 'scheduled', 'in-progress']
        )

        # 페이지네이션 적용
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='patient-history')
    def patient_history(self, request):
        """환자별 영상 히스토리 조회 (타임라인)"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'detail': 'patient_id 파라미터가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 환자의 모든 영상 검사 조회 (날짜 역순)
        queryset = self.get_queryset().filter(
            patient_id=patient_id
        ).order_by('-ordered_at')

        # 페이지네이션 적용
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ImagingReportViewSet(viewsets.ModelViewSet):
    """
    영상 판독문 CRUD API

    - 목록 조회: DOCTOR, RADIOLOGIST, SYSTEMMANAGER 가능
    - 생성: RADIOLOGIST, SYSTEMMANAGER만 가능
    - 수정: 작성자 또는 SYSTEMMANAGER만 가능
    """
    queryset = ImagingReport.objects.all()
    serializer_class = ImagingReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """검색 및 필터링"""
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'imaging_study',
            'imaging_study__patient',
            'radiologist'
        )

        # 특정 검사의 판독문 조회
        imaging_study = self.request.query_params.get('imaging_study')
        if imaging_study:
            queryset = queryset.filter(imaging_study_id=imaging_study)

        # 특정 판독의의 판독문 목록
        radiologist = self.request.query_params.get('radiologist')
        if radiologist:
            queryset = queryset.filter(radiologist_id=radiologist)

        return queryset

    def perform_create(self, serializer):
        """판독문 생성"""
        # RADIOLOGIST, SYSTEMMANAGER만 생성 가능
        if self.request.user.role.code not in ['RIS', 'SYSTEMMANAGER']:
            raise PermissionDenied("판독문을 작성할 권한이 없습니다.")

        serializer.save(radiologist=self.request.user)

        # 검사 상태를 'reported'로 변경
        imaging_study = serializer.instance.imaging_study
        imaging_study.status = 'reported'
        imaging_study.radiologist = self.request.user
        imaging_study.save()

    def perform_update(self, serializer):
        """판독문 수정"""
        report = self.get_object()

        # 작성자 또는 SYSTEMMANAGER만 수정 가능
        if report.radiologist != self.request.user and self.request.user.role.code != 'SYSTEMMANAGER':
            raise PermissionDenied("판독문을 수정할 권한이 없습니다.")

        # 서명된 판독문은 수정 불가
        if report.is_signed:
            raise PermissionDenied("서명된 판독문은 수정할 수 없습니다.")

        serializer.save()

    def perform_destroy(self, instance):
        """판독문 삭제"""
        # SYSTEMMANAGER만 삭제 가능
        if self.request.user.role.code != 'SYSTEMMANAGER':
            raise PermissionDenied("판독문을 삭제할 권한이 없습니다.")

        # 검사 상태를 'completed'로 변경
        imaging_study = instance.imaging_study
        imaging_study.status = 'completed'
        imaging_study.save()

        instance.delete()

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """판독문 서명"""
        report = self.get_object()

        # 작성자 또는 SYSTEMMANAGER만 서명 가능
        if report.radiologist != request.user and request.user.role.code != 'SYSTEMMANAGER':
            return Response(
                {'detail': '판독문을 서명할 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if report.is_signed:
            return Response(
                {'detail': '이미 서명된 판독문입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = 'signed'
        report.signed_at = timezone.now()
        report.save()

        serializer = self.get_serializer(report)
        return Response(serializer.data)
