from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.utils import timezone
from .models import Encounter
from .serializers import (
    EncounterListSerializer,
    EncounterDetailSerializer,
    EncounterCreateSerializer,
    EncounterUpdateSerializer,
    EncounterSearchSerializer,
)


class EncounterPagination(PageNumberPagination):
    """진료 목록 페이지네이션"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class EncounterViewSet(viewsets.ModelViewSet):
    """
    진료 CRUD API

    권한 체크는 프론트엔드 라우터에서 관리
    """
    queryset = Encounter.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = EncounterPagination

    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return EncounterListSerializer
        elif self.action == 'create':
            return EncounterCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return EncounterUpdateSerializer
        return EncounterDetailSerializer

    def perform_destroy(self, instance):
        """Soft Delete"""
        instance.is_deleted = True
        instance.save()

    def get_queryset(self):
        """검색 및 필터링"""
        queryset = super().get_queryset()

        # 검색 파라미터 처리
        search_serializer = EncounterSearchSerializer(data=self.request.query_params)
        if not search_serializer.is_valid():
            return queryset

        data = search_serializer.validated_data

        # 텍스트 검색 (환자명, 환자번호, 주호소)
        q = data.get('q')
        if q:
            queryset = queryset.filter(
                Q(patient__name__icontains=q) |
                Q(patient__patient_number__icontains=q) |
                Q(chief_complaint__icontains=q)
            )

        # 진료 유형 필터
        encounter_type = data.get('encounter_type')
        if encounter_type:
            queryset = queryset.filter(encounter_type=encounter_type)

        # 진료 상태 필터
        encounter_status = data.get('status')
        if encounter_status:
            queryset = queryset.filter(status=encounter_status)

        # 진료과 필터
        department = data.get('department')
        if department:
            queryset = queryset.filter(department=department)

        # 담당 의사 필터
        attending_doctor = data.get('attending_doctor')
        if attending_doctor:
            queryset = queryset.filter(attending_doctor_id=attending_doctor)

        # 환자 필터
        patient_id = data.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        # 날짜 범위 필터
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date:
            queryset = queryset.filter(admission_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(admission_date__lte=end_date)

        return queryset.select_related('patient', 'attending_doctor')

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """진료 통계 조회"""
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'by_type': {},
            'by_status': {},
            'by_department': {},
        }

        # 진료 유형별 통계
        for enc_type, label in Encounter.ENCOUNTER_TYPE_CHOICES:
            count = queryset.filter(encounter_type=enc_type).count()
            stats['by_type'][enc_type] = {
                'label': label,
                'count': count
            }

        # 상태별 통계
        for enc_status, label in Encounter.STATUS_CHOICES:
            count = queryset.filter(status=enc_status).count()
            stats['by_status'][enc_status] = {
                'label': label,
                'count': count
            }

        # 진료과별 통계
        for dept, label in Encounter.DEPARTMENT_CHOICES:
            count = queryset.filter(department=dept).count()
            stats['by_department'][dept] = {
                'label': label,
                'count': count
            }

        return Response(stats)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """진료 완료 처리"""
        encounter = self.get_object()

        if encounter.status == 'completed':
            return Response(
                {'detail': '이미 완료된 진료입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        encounter.status = 'completed'
        if not encounter.discharge_date:
            encounter.discharge_date = timezone.now()
        encounter.save()

        serializer = self.get_serializer(encounter)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """진료 취소"""
        encounter = self.get_object()

        if encounter.status == 'completed':
            return Response(
                {'detail': '완료된 진료는 취소할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        encounter.status = 'cancelled'
        encounter.save()

        serializer = self.get_serializer(encounter)
        return Response(serializer.data)
