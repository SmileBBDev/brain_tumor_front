from rest_framework import serializers
from .models import AIInference


class InferenceRequestSerializer(serializers.Serializer):
    """추론 요청 직렬화"""
    ocs_id = serializers.IntegerField(help_text='OCS ID')
    mode = serializers.ChoiceField(
        choices=['manual', 'auto'],
        default='manual',
        help_text='추론 모드'
    )


class InferenceCallbackSerializer(serializers.Serializer):
    """FastAPI 콜백 직렬화"""
    job_id = serializers.CharField()
    status = serializers.ChoiceField(choices=['completed', 'failed'])
    result_data = serializers.JSONField(required=False, default=dict)
    error_message = serializers.CharField(required=False, allow_null=True)


class AIInferenceSerializer(serializers.ModelSerializer):
    """AI 추론 결과 직렬화"""
    patient_name = serializers.SerializerMethodField()
    patient_number = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    processing_time = serializers.SerializerMethodField()
    review_status = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    review_comment = serializers.SerializerMethodField()
    reviewed_at = serializers.SerializerMethodField()

    class Meta:
        model = AIInference
        fields = [
            'id', 'job_id', 'model_type', 'status', 'mode',
            'patient', 'patient_name', 'patient_number',
            'requested_by', 'requested_by_name',
            'mri_ocs', 'rna_ocs', 'protein_ocs',
            'result_data', 'error_message',
            'created_at', 'completed_at', 'processing_time',
            'review_status', 'reviewed_by_name', 'review_comment', 'reviewed_at'
        ]
        read_only_fields = ['job_id', 'created_at', 'completed_at']

    def get_patient_name(self, obj):
        return obj.patient.name if obj.patient else None

    def get_patient_number(self, obj):
        return obj.patient.patient_number if obj.patient else None

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.name or obj.requested_by.username
        return None

    def get_processing_time(self, obj):
        """처리 시간 계산 (초 단위)"""
        if obj.completed_at and obj.created_at:
            delta = obj.completed_at - obj.created_at
            return int(delta.total_seconds())
        return None

    def get_review_status(self, obj):
        """검토 상태 반환 (result_data에서 가져옴)"""
        if obj.status == AIInference.Status.COMPLETED and obj.result_data:
            return obj.result_data.get('review_status', 'pending')
        return None

    def get_reviewed_by_name(self, obj):
        """검토자 이름 반환"""
        if obj.result_data:
            return obj.result_data.get('reviewed_by_name')
        return None

    def get_review_comment(self, obj):
        """검토 의견 반환"""
        if obj.result_data:
            return obj.result_data.get('review_comment')
        return None

    def get_reviewed_at(self, obj):
        """검토 일시 반환"""
        if obj.result_data:
            return obj.result_data.get('reviewed_at')
        return None
