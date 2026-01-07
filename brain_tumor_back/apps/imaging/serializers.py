from rest_framework import serializers
from .models import ImagingStudy, ImagingReport
from apps.patients.models import Patient
from apps.encounters.models import Encounter
from apps.accounts.models import User


class ImagingStudyListSerializer(serializers.ModelSerializer):
    """영상 검사 목록용 Serializer"""

    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    encounter_id = serializers.IntegerField(source='encounter.id', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.name', read_only=True)
    radiologist_name = serializers.CharField(source='radiologist.name', read_only=True, allow_null=True)
    modality_display = serializers.CharField(source='get_modality_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_report = serializers.BooleanField(read_only=True)

    class Meta:
        model = ImagingStudy
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_number',
            'encounter',
            'encounter_id',
            'modality',
            'modality_display',
            'body_part',
            'status',
            'status_display',
            'ordered_by',
            'ordered_by_name',
            'ordered_at',
            'scheduled_at',
            'performed_at',
            'radiologist',
            'radiologist_name',
            'has_report',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ImagingStudyDetailSerializer(serializers.ModelSerializer):
    """영상 검사 상세 정보용 Serializer"""

    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='patient.age', read_only=True)
    encounter_id = serializers.IntegerField(source='encounter.id', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.name', read_only=True)
    radiologist_name = serializers.CharField(source='radiologist.name', read_only=True, allow_null=True)
    modality_display = serializers.CharField(source='get_modality_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    has_report = serializers.BooleanField(read_only=True)

    class Meta:
        model = ImagingStudy
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_number',
            'patient_gender',
            'patient_age',
            'encounter',
            'encounter_id',
            'modality',
            'modality_display',
            'body_part',
            'status',
            'status_display',
            'ordered_by',
            'ordered_by_name',
            'ordered_at',
            'scheduled_at',
            'performed_at',
            'radiologist',
            'radiologist_name',
            'study_uid',
            'series_count',
            'instance_count',
            'clinical_info',
            'special_instruction',
            'is_completed',
            'has_report',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_completed',
            'has_report',
            'created_at',
            'updated_at',
        ]


class ImagingStudyCreateSerializer(serializers.ModelSerializer):
    """영상 검사 오더 생성용 Serializer"""

    class Meta:
        model = ImagingStudy
        fields = [
            'patient',
            'encounter',
            'modality',
            'body_part',
            'scheduled_at',
            'clinical_info',
            'special_instruction',
        ]

    def validate_patient(self, value):
        """환자 유효성 검사"""
        if value.is_deleted:
            raise serializers.ValidationError("삭제된 환자입니다.")
        if value.status != 'active':
            raise serializers.ValidationError("활성 상태가 아닌 환자입니다.")
        return value

    def validate_encounter(self, value):
        """진료 유효성 검사"""
        if value.is_deleted:
            raise serializers.ValidationError("삭제된 진료입니다.")
        return value

    def validate(self, data):
        """전체 유효성 검사"""
        # 환자와 진료의 환자가 일치하는지 확인
        if data['patient'] != data['encounter'].patient:
            raise serializers.ValidationError({
                'encounter': '선택한 진료의 환자와 일치하지 않습니다.'
            })
        return data


class ImagingStudyUpdateSerializer(serializers.ModelSerializer):
    """영상 검사 정보 수정용 Serializer"""

    class Meta:
        model = ImagingStudy
        fields = [
            'status',
            'scheduled_at',
            'performed_at',
            'radiologist',
            'study_uid',
            'series_count',
            'instance_count',
            'clinical_info',
            'special_instruction',
        ]

    def validate_radiologist(self, value):
        """판독의 유효성 검사"""
        if value and value.role.code not in ['RIS', 'DOCTOR']:
            raise serializers.ValidationError("판독의는 RIS 또는 DOCTOR 역할이어야 합니다.")
        return value


class ImagingReportSerializer(serializers.ModelSerializer):
    """판독문 Serializer"""

    radiologist_name = serializers.CharField(source='radiologist.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_signed = serializers.BooleanField(read_only=True)
    imaging_study_modality = serializers.CharField(source='imaging_study.get_modality_display', read_only=True)
    patient_name = serializers.CharField(source='imaging_study.patient.name', read_only=True)

    class Meta:
        model = ImagingReport
        fields = [
            'id',
            'imaging_study',
            'imaging_study_modality',
            'patient_name',
            'radiologist',
            'radiologist_name',
            'findings',
            'impression',
            'tumor_detected',
            'tumor_location',
            'tumor_size',
            'status',
            'status_display',
            'signed_at',
            'is_signed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_signed',
            'created_at',
            'updated_at',
        ]

    def validate_imaging_study(self, value):
        """영상 검사 유효성 검사"""
        if value.is_deleted:
            raise serializers.ValidationError("삭제된 영상 검사입니다.")
        if hasattr(value, 'report'):
            raise serializers.ValidationError("이미 판독문이 작성된 검사입니다.")
        return value

    def validate_radiologist(self, value):
        """판독의 유효성 검사"""
        if value.role.code not in ['RIS', 'DOCTOR']:
            raise serializers.ValidationError("판독의는 RIS 또는 DOCTOR 역할이어야 합니다.")
        return value


class ImagingSearchSerializer(serializers.Serializer):
    """영상 검사 검색용 Serializer"""

    q = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='검색어 (환자명, 환자번호)'
    )
    modality = serializers.ChoiceField(
        choices=ImagingStudy.MODALITY_CHOICES,
        required=False,
        help_text='검사 종류'
    )
    status = serializers.ChoiceField(
        choices=ImagingStudy.STATUS_CHOICES,
        required=False,
        help_text='검사 상태'
    )
    ordered_by = serializers.IntegerField(
        required=False,
        help_text='오더 의사 ID'
    )
    radiologist = serializers.IntegerField(
        required=False,
        help_text='판독의 ID'
    )
    patient = serializers.IntegerField(
        required=False,
        help_text='환자 ID'
    )
    encounter = serializers.IntegerField(
        required=False,
        help_text='진료 ID'
    )
    start_date = serializers.DateField(
        required=False,
        help_text='검사 시작일 (YYYY-MM-DD)'
    )
    end_date = serializers.DateField(
        required=False,
        help_text='검사 종료일 (YYYY-MM-DD)'
    )

    def validate(self, data):
        """날짜 범위 검증"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("시작일은 종료일보다 이전이어야 합니다.")

        return data
