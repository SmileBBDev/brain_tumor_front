from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.accounts.models import User


# =============================================================================
# AI Inference - 확장 가능한 AI 추론 관리 시스템
# =============================================================================
# 상세 기획: app의 기획.md 2.4 AI 추론 관리 참조
# =============================================================================


class AIModel(models.Model):
    """
    AI 모델 정의 (Soft 구조)

    모델 추가/변경이 용이하도록 JSON 기반 설정으로 관리.
    현재 모델: M1(MRI), MG(Genetic), MM(Multimodal)
    """

    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='모델 코드',
        help_text='고유 식별 코드 (예: M1, MG, MM)'
    )

    name = models.CharField(
        max_length=100,
        verbose_name='모델명',
        help_text='사용자 친화적 모델명'
    )

    description = models.TextField(
        blank=True,
        verbose_name='설명',
        help_text='모델 설명 및 용도'
    )

    # OCS 소스 (RIS, LIS 등)
    ocs_sources = models.JSONField(
        default=list,
        verbose_name='OCS 소스',
        help_text='입력 데이터 소스 (예: ["RIS"], ["LIS"], ["RIS", "LIS"])'
    )

    # 필요 데이터 키
    required_keys = models.JSONField(
        default=dict,
        verbose_name='필요 데이터 키',
        help_text='모델별 필요 데이터 키 (예: {"RIS": ["dicom.T1", "dicom.T2"]})'
    )

    version = models.CharField(
        max_length=20,
        default='1.0.0',
        verbose_name='모델 버전'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성화 여부'
    )

    # 추가 설정
    config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='추가 설정',
        help_text='모델별 추가 설정 (타임아웃, 배치 크기 등)'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')

    class Meta:
        db_table = 'ai_model'
        verbose_name = 'AI 모델'
        verbose_name_plural = 'AI 모델 목록'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class AIInferenceRequest(models.Model):
    """
    AI 추론 요청

    환자의 OCS 데이터를 기반으로 AI 모델 추론을 요청.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', '대기 중'
        VALIDATING = 'VALIDATING', '검증 중'
        PROCESSING = 'PROCESSING', '처리 중'
        COMPLETED = 'COMPLETED', '완료'
        FAILED = 'FAILED', '실패'
        CANCELLED = 'CANCELLED', '취소됨'

    class Priority(models.TextChoices):
        LOW = 'low', '낮음'
        NORMAL = 'normal', '보통'
        HIGH = 'high', '높음'
        URGENT = 'urgent', '긴급'

    # 식별자
    request_id = models.CharField(
        max_length=30,
        unique=True,
        verbose_name='요청 ID',
        help_text='사용자 친화적 ID (예: ai_req_0001)'
    )

    # 관계
    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='ai_inference_requests',
        verbose_name='환자'
    )

    model = models.ForeignKey(
        AIModel,
        on_delete=models.PROTECT,
        related_name='inference_requests',
        verbose_name='AI 모델'
    )

    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='ai_inference_requests',
        verbose_name='요청자'
    )

    # 입력 데이터
    ocs_references = models.JSONField(
        default=list,
        verbose_name='OCS 참조',
        help_text='사용된 OCS ID 목록'
    )

    input_data = models.JSONField(
        default=dict,
        verbose_name='입력 데이터',
        help_text='worker_result에서 추출한 입력 데이터'
    )

    # 상태
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='상태'
    )

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        verbose_name='우선순위'
    )

    # 타임스탬프
    requested_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='요청 일시'
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='시작 일시'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='완료 일시'
    )

    # 에러 정보
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='에러 메시지'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')

    class Meta:
        db_table = 'ai_inference_request'
        verbose_name = 'AI 추론 요청'
        verbose_name_plural = 'AI 추론 요청 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request_id']),
            models.Index(fields=['status']),
            models.Index(fields=['patient']),
            models.Index(fields=['model']),
            models.Index(fields=['requested_by']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.request_id} ({self.model.code})"

    def save(self, *args, **kwargs):
        if not self.request_id:
            self.request_id = self._generate_request_id()
        super().save(*args, **kwargs)

    def _generate_request_id(self):
        """request_id 자동 생성 (ai_req_0001 형식)"""
        last_req = AIInferenceRequest.objects.order_by('-id').first()
        if last_req and last_req.request_id:
            try:
                last_num = int(last_req.request_id.split('_')[-1])
                return f"ai_req_{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        return "ai_req_0001"

    @property
    def processing_time(self):
        """처리 소요 시간 (초)"""
        if self.completed_at and self.started_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class AIInferenceResult(models.Model):
    """
    AI 추론 결과

    AI 모델 추론 결과 및 의사 검토 정보 저장.
    """

    class ReviewStatus(models.TextChoices):
        PENDING = 'pending', '검토 대기'
        APPROVED = 'approved', '승인됨'
        REJECTED = 'rejected', '거부됨'

    # 관계
    inference_request = models.OneToOneField(
        AIInferenceRequest,
        on_delete=models.CASCADE,
        related_name='result',
        verbose_name='추론 요청'
    )

    # 결과 데이터
    result_data = models.JSONField(
        default=dict,
        verbose_name='결과 데이터',
        help_text='모델별 결과 데이터'
    )

    confidence_score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='신뢰도',
        help_text='0.0 ~ 1.0'
    )

    # 시각화 파일
    visualization_paths = models.JSONField(
        default=list,
        blank=True,
        verbose_name='시각화 파일 경로',
        help_text='시각화 파일 경로들'
    )

    # 검토 정보
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_ai_results',
        verbose_name='검토자'
    )

    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        verbose_name='검토 상태'
    )

    review_comment = models.TextField(
        blank=True,
        null=True,
        verbose_name='검토 의견'
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='검토 일시'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')

    class Meta:
        db_table = 'ai_inference_result'
        verbose_name = 'AI 추론 결과'
        verbose_name_plural = 'AI 추론 결과 목록'
        ordering = ['-created_at']

    def __str__(self):
        return f"Result for {self.inference_request.request_id}"


class AIInferenceLog(models.Model):
    """
    AI 추론 로그

    추론 과정의 모든 이벤트를 기록하는 감사 테이블.
    """

    class Action(models.TextChoices):
        CREATED = 'CREATED', '요청 생성'
        VALIDATED = 'VALIDATED', '데이터 검증 완료'
        STARTED = 'STARTED', '처리 시작'
        PROGRESS = 'PROGRESS', '처리 진행'
        COMPLETED = 'COMPLETED', '처리 완료'
        FAILED = 'FAILED', '처리 실패'
        CANCELLED = 'CANCELLED', '요청 취소'
        REVIEWED = 'REVIEWED', '결과 검토'

    inference_request = models.ForeignKey(
        AIInferenceRequest,
        on_delete=models.CASCADE,
        related_name='logs',
        verbose_name='추론 요청'
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name='동작'
    )

    message = models.TextField(
        verbose_name='로그 메시지'
    )

    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='상세 정보'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')

    class Meta:
        db_table = 'ai_inference_log'
        verbose_name = 'AI 추론 로그'
        verbose_name_plural = 'AI 추론 로그 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['inference_request']),
            models.Index(fields=['action']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.inference_request.request_id} - {self.get_action_display()}"
