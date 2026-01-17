import logging
import psutil

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Count, Q
from django.db import connection
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.accounts.models import User
from apps.patients.models import Patient
from apps.ocs.models import OCS
from apps.encounters.models import Encounter
from apps.audit.models import AuditLog
from apps.common.permission import IsAdmin, IsExternalOrAdmin, IsDoctorOrAdmin

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    헬스 체크 엔드포인트
    Docker/Kubernetes 헬스 체크 및 로드밸런서용
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Health"],
        summary="서버 헬스 체크",
        description="서버 상태 및 데이터베이스 연결을 확인합니다.",
        responses={
            200: OpenApiResponse(description="정상"),
            503: OpenApiResponse(description="서비스 불가"),
        }
    )
    def get(self, request):
        health_status = {
            "status": "healthy",
            "database": "unknown",
            "timestamp": timezone.now().isoformat(),
        }

        # Database 연결 확인
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_status["database"] = "connected"
        except Exception as e:
            logger.error(f"Health check - DB error: {str(e)}")
            health_status["status"] = "unhealthy"
            health_status["database"] = "disconnected"
            return Response(health_status, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(health_status, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Dashboard"],
    summary="관리자 대시보드 통계",
    description="관리자용 대시보드 통계를 조회합니다. ADMIN, SYSTEMMANAGER 역할 접근 가능합니다.",
    responses={
        200: OpenApiResponse(description="통계 조회 성공"),
        403: OpenApiResponse(description="권한 없음"),
        500: OpenApiResponse(description="서버 오류"),
    }
)
class AdminDashboardStatsView(APIView):
    """관리자 대시보드 통계 API"""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            week_ago = now - timedelta(days=7)

            # 사용자 통계
            users = User.objects.filter(is_active=True)
            user_by_role = dict(
                users.values('role__code')
                .annotate(count=Count('id'))
                .values_list('role__code', 'count')
            )

            # 환자 통계
            patients = Patient.objects.filter(is_deleted=False)

            # OCS 통계
            ocs_all = OCS.objects.filter(is_deleted=False)
            ocs_by_status = dict(
                ocs_all.values('ocs_status')
                .annotate(count=Count('id'))
                .values_list('ocs_status', 'count')
            )

            return Response({
                'users': {
                    'total': users.count(),
                    'by_role': user_by_role,
                    'recent_logins': users.filter(last_login__gte=week_ago).count(),
                },
                'patients': {
                    'total': patients.count(),
                    'new_this_month': patients.filter(created_at__gte=month_start).count(),
                },
                'ocs': {
                    'total': ocs_all.count(),
                    'by_status': ocs_by_status,
                    'pending_count': ocs_all.filter(
                        ocs_status__in=[
                            OCS.OcsStatus.ORDERED,
                            OCS.OcsStatus.ACCEPTED,
                            OCS.OcsStatus.IN_PROGRESS
                        ]
                    ).count(),
                },
            })
        except Exception as e:
            logger.error(f"Admin dashboard stats error: {str(e)}")
            return Response(
                {'detail': '통계를 불러오는 중 오류가 발생했습니다.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=["Dashboard"],
    summary="외부기관 대시보드 통계",
    description="외부기관용 대시보드 통계를 조회합니다. EXTERNAL, ADMIN, SYSTEMMANAGER 역할 접근 가능합니다.",
    responses={
        200: OpenApiResponse(description="통계 조회 성공"),
        403: OpenApiResponse(description="권한 없음"),
        500: OpenApiResponse(description="서버 오류"),
    }
)
class ExternalDashboardStatsView(APIView):
    """외부기관 대시보드 통계 API"""
    permission_classes = [IsExternalOrAdmin]

    def get(self, request):
        try:
            now = timezone.now()
            week_ago = now - timedelta(days=7)

            # 외부 LIS 업로드 (extr_ prefix)
            lis_external = OCS.objects.filter(
                ocs_id__startswith='extr_',
                job_role='LIS',
                is_deleted=False
            )

            # 외부 RIS 업로드 (risx_ prefix)
            ris_external = OCS.objects.filter(
                ocs_id__startswith='risx_',
                job_role='RIS',
                is_deleted=False
            )

            # 최근 업로드
            recent = OCS.objects.filter(
                Q(ocs_id__startswith='extr_') | Q(ocs_id__startswith='risx_'),
                is_deleted=False
            ).select_related('patient').order_by('-created_at')[:10]

            return Response({
                'lis_uploads': {
                    'pending': lis_external.filter(ocs_status=OCS.OcsStatus.RESULT_READY).count(),
                    'completed': lis_external.filter(ocs_status=OCS.OcsStatus.CONFIRMED).count(),
                    'total_this_week': lis_external.filter(created_at__gte=week_ago).count(),
                },
                'ris_uploads': {
                    'pending': ris_external.filter(ocs_status=OCS.OcsStatus.RESULT_READY).count(),
                    'completed': ris_external.filter(ocs_status=OCS.OcsStatus.CONFIRMED).count(),
                    'total_this_week': ris_external.filter(created_at__gte=week_ago).count(),
                },
                'recent_uploads': [
                    {
                        'id': o.id,
                        'ocs_id': o.ocs_id,
                        'job_role': o.job_role,
                        'status': o.ocs_status,
                        'uploaded_at': o.created_at.isoformat(),
                        'patient_name': o.patient.name if o.patient else '-',
                    }
                    for o in recent
                ],
            })
        except Exception as e:
            logger.error(f"External dashboard stats error: {str(e)}")
            return Response(
                {'detail': '통계를 불러오는 중 오류가 발생했습니다.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=["Dashboard"],
    summary="의사 대시보드 통계",
    description="의사용 대시보드 통계를 조회합니다. DOCTOR, ADMIN, SYSTEMMANAGER 역할 접근 가능합니다. 금일 예약 환자 5명을 반환합니다.",
    responses={
        200: OpenApiResponse(description="통계 조회 성공"),
        403: OpenApiResponse(description="권한 없음"),
        500: OpenApiResponse(description="서버 오류"),
    }
)
class DoctorDashboardStatsView(APIView):
    """의사 대시보드 통계 API"""
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        try:
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            # 전체 금일 통계 (상태별) - cancelled 제외
            all_today = Encounter.objects.filter(
                attending_doctor=request.user,
                admission_date__gte=today_start,
                admission_date__lt=today_end,
                is_deleted=False
            ).exclude(status='cancelled')

            waiting = all_today.filter(status='scheduled').count()
            in_progress = all_today.filter(status='in_progress').count()
            completed = all_today.filter(status='completed').count()

            # 금일 예약환자 5명 (시간순, 취소 제외)
            today_appointments = all_today.select_related('patient').order_by('admission_date')[:5]

            return Response({
                'today_appointments': [
                    {
                        'encounter_id': enc.id,
                        'patient_id': enc.patient.id,
                        'patient_name': enc.patient.name,
                        'patient_number': enc.patient.patient_number,
                        'appointment_time': enc.admission_date.isoformat(),
                        'scheduled_time': enc.scheduled_time.strftime('%H:%M:%S') if enc.scheduled_time else None,
                        'encounter_type': enc.encounter_type,
                        'status': enc.status,
                        'reason': enc.chief_complaint or '',
                        'department': enc.department,
                    }
                    for enc in today_appointments
                ],
                'stats': {
                    'total_today': all_today.count(),
                    'waiting': waiting,
                    'in_progress': in_progress,
                    'completed': completed,
                },
            })

        except Exception as e:
            logger.error(f"Doctor dashboard stats error: {str(e)}")
            return Response(
                {'detail': '통계를 불러오는 중 오류가 발생했습니다.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=["System Monitor"],
    summary="시스템 모니터링 통계",
    description="시스템 상태, CPU/메모리 사용량, 활성 세션, 로그인 통계 등을 조회합니다. ADMIN, SYSTEMMANAGER 역할 접근 가능합니다.",
    responses={
        200: OpenApiResponse(description="통계 조회 성공"),
        403: OpenApiResponse(description="권한 없음"),
        500: OpenApiResponse(description="서버 오류"),
    }
)
class SystemMonitorView(APIView):
    """시스템 모니터링 API"""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # 1. 서버 상태 (Health Check)
            server_status = "healthy"
            database_status = "connected"
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except Exception:
                server_status = "unhealthy"
                database_status = "disconnected"

            # 2. 시스템 리소스 (CPU, Memory, Disk)
            import os
            try:
                cpu_percent = psutil.cpu_percent(interval=0.1)
            except Exception:
                cpu_percent = 0.0

            try:
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                memory_used_gb = memory.used / (1024**3)
                memory_total_gb = memory.total / (1024**3)
            except Exception:
                memory_percent = 0.0
                memory_used_gb = 0.0
                memory_total_gb = 0.0

            try:
                # Windows/Linux 호환 디스크 경로
                if os.name == 'nt':  # Windows
                    disk = psutil.disk_usage('C:\\')
                else:  # Linux/Mac
                    disk = psutil.disk_usage('/')
                disk_percent = disk.percent
            except Exception:
                disk_percent = 0.0

            # 3. 활성 세션 수 (최근 30분 이내 last_seen이 있는 사용자)
            session_threshold = now - timedelta(minutes=30)
            active_sessions = User.objects.filter(
                is_active=True,
                last_seen__gte=session_threshold
            ).count()

            # 4. 금일 로그인 통계 (AuditLog 기반)
            today_login_success = AuditLog.objects.filter(
                action='LOGIN_SUCCESS',
                created_at__gte=today_start
            ).count()

            today_login_fail = AuditLog.objects.filter(
                action='LOGIN_FAIL',
                created_at__gte=today_start
            ).count()

            # 5. 오류 발생 건수 (금일 로그인 실패 + 잠금)
            today_login_locked = AuditLog.objects.filter(
                action='LOGIN_LOCKED',
                created_at__gte=today_start
            ).count()

            error_count = today_login_fail + today_login_locked

            # 6. 서버 상태 판단 (warning/error 조건)
            if server_status == "unhealthy":
                status_level = "error"
            elif cpu_percent > 90 or memory_percent > 90 or error_count > 10:
                status_level = "warning"
            else:
                status_level = "ok"

            return Response({
                'server': {
                    'status': status_level,
                    'database': database_status,
                },
                'resources': {
                    'cpu_percent': round(cpu_percent, 1),
                    'memory_percent': round(memory_percent, 1),
                    'memory_used_gb': round(memory_used_gb, 2),
                    'memory_total_gb': round(memory_total_gb, 2),
                    'disk_percent': round(disk_percent, 1),
                },
                'sessions': {
                    'active_count': active_sessions,
                },
                'logins': {
                    'today_total': today_login_success + today_login_fail,
                    'today_success': today_login_success,
                    'today_fail': today_login_fail,
                    'today_locked': today_login_locked,
                },
                'errors': {
                    'count': error_count,
                },
                'timestamp': now.isoformat(),
            })

        except Exception as e:
            logger.error(f"System monitor error: {str(e)}")
            return Response(
                {'detail': '시스템 모니터링 데이터를 불러오는 중 오류가 발생했습니다.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# 모니터링 알림 설정 기본값
DEFAULT_MONITOR_ALERTS = {
    "server_warning": {
        "title": "서버 상태 주의",
        "description": "CPU 또는 메모리 사용률이 임계값을 초과했습니다.",
        "actions": [
            "불필요한 프로세스 종료",
            "서버 리소스 확장 검토",
            "메모리 누수 점검"
        ]
    },
    "server_error": {
        "title": "서버 상태 오류",
        "description": "데이터베이스 연결에 실패했습니다.",
        "actions": [
            "DB 서버 상태 확인",
            "네트워크 연결 점검",
            "DB 서비스 재시작"
        ]
    },
    "cpu_warning": {
        "title": "CPU 사용률 주의",
        "description": "CPU 사용률이 임계값을 초과했습니다.",
        "threshold": 90,
        "actions": [
            "CPU 집약적 작업 확인",
            "프로세스 모니터링",
            "서버 스케일업 검토"
        ]
    },
    "memory_warning": {
        "title": "메모리 사용률 주의",
        "description": "메모리 사용률이 임계값을 초과했습니다.",
        "threshold": 90,
        "actions": [
            "메모리 누수 점검",
            "캐시 정리",
            "불필요한 프로세스 종료"
        ]
    },
    "disk_warning": {
        "title": "디스크 사용률 주의",
        "description": "디스크 사용률이 임계값을 초과했습니다.",
        "threshold": 90,
        "actions": [
            "로그 파일 정리",
            "불필요한 파일 삭제",
            "디스크 용량 확장"
        ]
    },
    "error_warning": {
        "title": "오류 발생 주의",
        "description": "로그인 실패 및 계정 잠금이 다수 발생했습니다.",
        "threshold": 10,
        "actions": [
            "로그인 실패 원인 분석",
            "보안 점검",
            "비정상 접근 시도 확인"
        ]
    }
}


class MonitorAlertConfigView(APIView):
    """
    시스템 모니터링 알림 설정 API
    - GET: 현재 설정 조회
    - PUT: 설정 수정
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        """모니터링 알림 설정 조회"""
        from .models import SystemConfig

        config = SystemConfig.get_value('monitor_alerts', DEFAULT_MONITOR_ALERTS)
        return Response(config)

    def put(self, request):
        """모니터링 알림 설정 수정"""
        from .models import SystemConfig
        import json

        try:
            data = request.data

            # 유효성 검사: 필수 키 확인
            required_keys = ['server_warning', 'server_error', 'cpu_warning',
                           'memory_warning', 'disk_warning', 'error_warning']
            for key in required_keys:
                if key not in data:
                    return Response(
                        {'detail': f'필수 설정 항목이 누락되었습니다: {key}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # 설정 저장
            SystemConfig.set_value(
                key='monitor_alerts',
                value=data,
                description='시스템 모니터링 알림 설정',
                user=request.user
            )

            return Response({'detail': '설정이 저장되었습니다.', 'data': data})

        except json.JSONDecodeError:
            return Response(
                {'detail': '잘못된 JSON 형식입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Monitor alert config save error: {str(e)}")
            return Response(
                {'detail': '설정 저장 중 오류가 발생했습니다.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
