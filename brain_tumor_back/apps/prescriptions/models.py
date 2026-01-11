from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.encounters.models import Encounter
from apps.accounts.models import User


# =============================================================================
# Prescriptions - 처방 관리 시스템
# =============================================================================


class Prescription(models.Model):
    """
    처방전 모델
    
    의사가 환자에게 발행하는 처방전 정보.
    상태: DRAFT → ISSUED → DISPENSED / CANCELLED
    """

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', '작성 중'
        ISSUED = 'ISSUED', '발행됨'
        DISPENSED = 'DISPENSED', '조제 완료'
        CANCELLED = 'CANCELLED', '취소됨'

    # 식별자
    prescription_id = models.CharField(
        max_length=30,
        unique=True,
        verbose_name='처방전 ID',
        help_text='사용자 친화적 ID (예: rx_0001)'
    )

    # 관계
    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='prescriptions',
        verbose_name='환자'
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prescriptions_as_doctor',
        verbose_name='처방 의사'
    )

    encounter = models.ForeignKey(
        Encounter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescriptions',
        verbose_name='연관 진료'
    )

    # 상태
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='상태'
    )

    # 진단 정보
    diagnosis = models.TextField(
        blank=True,
        null=True,
        verbose_name='진단명',
        help_text='처방 관련 진단명'
    )

    # 메모
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='비고',
        help_text='추가 지시사항 또는 메모'
    )

    # 타임스탬프
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    issued_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='발행일시'
    )

    dispensed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='조제완료일시'
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='취소일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    # 취소 정보
    cancel_reason = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='취소 사유'
    )

    class Meta:
        db_table = 'prescription'
        verbose_name = '처방전'
        verbose_name_plural = '처방전 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['prescription_id']),
            models.Index(fields=['status']),
            models.Index(fields=['patient']),
            models.Index(fields=['doctor']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.prescription_id} - {self.patient.name} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.prescription_id:
            self.prescription_id = self._generate_prescription_id()
        super().save(*args, **kwargs)

    def _generate_prescription_id(self):
        """prescription_id 자동 생성 (rx_0001 형식)"""
        last_rx = Prescription.objects.order_by('-id').first()
        if last_rx and last_rx.prescription_id:
            try:
                last_num = int(last_rx.prescription_id.split('_')[1])
                return f"rx_{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
        return "rx_0001"

    @property
    def is_editable(self):
        """수정 가능 여부 (DRAFT 상태에서만 수정 가능)"""
        return self.status == self.Status.DRAFT

    @property
    def item_count(self):
        """처방 항목 수"""
        return self.items.count()


class PrescriptionItem(models.Model):
    """
    처방 항목 모델
    
    개별 약품 처방 정보.
    """

    class Frequency(models.TextChoices):
        QD = 'QD', '1일 1회'
        BID = 'BID', '1일 2회'
        TID = 'TID', '1일 3회'
        QID = 'QID', '1일 4회'
        PRN = 'PRN', '필요시'
        QOD = 'QOD', '격일'
        QW = 'QW', '주 1회'

    class Route(models.TextChoices):
        PO = 'PO', '경구'
        IV = 'IV', '정맥주사'
        IM = 'IM', '근육주사'
        SC = 'SC', '피하주사'
        TOPICAL = 'TOPICAL', '외용'
        INHALATION = 'INHALATION', '흡입'
        OTHER = 'OTHER', '기타'

    # 관계
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='처방전'
    )

    # 약품 정보
    medication_name = models.CharField(
        max_length=200,
        verbose_name='약품명'
    )

    medication_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='약품 코드',
        help_text='약품 식별 코드 (선택)'
    )

    # 용량
    dosage = models.CharField(
        max_length=100,
        verbose_name='용량',
        help_text='예: 500mg, 10ml'
    )

    # 복용 빈도
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.TID,
        verbose_name='복용 빈도'
    )

    # 투여 경로
    route = models.CharField(
        max_length=20,
        choices=Route.choices,
        default=Route.PO,
        verbose_name='투여 경로'
    )

    # 처방 기간
    duration_days = models.PositiveIntegerField(
        default=7,
        verbose_name='처방 일수'
    )

    # 총 수량
    quantity = models.PositiveIntegerField(
        default=1,
        verbose_name='총 수량',
        help_text='처방 총 수량'
    )

    # 복용 지시
    instructions = models.TextField(
        blank=True,
        null=True,
        verbose_name='복용 지시',
        help_text='식전/식후, 주의사항 등'
    )

    # 순서
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='순서'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    class Meta:
        db_table = 'prescription_item'
        verbose_name = '처방 항목'
        verbose_name_plural = '처방 항목 목록'
        ordering = ['prescription', 'order', 'id']

    def __str__(self):
        return f"{self.medication_name} ({self.dosage}) - {self.get_frequency_display()}"
