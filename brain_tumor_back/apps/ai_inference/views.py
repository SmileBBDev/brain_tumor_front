from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from .models import AIModel, AIInferenceRequest, AIInferenceResult, AIInferenceLog
from .serializers import (
    AIModelSerializer, AIModelListSerializer,
    AIInferenceRequestListSerializer, AIInferenceRequestDetailSerializer,
    AIInferenceRequestCreateSerializer,
    AIInferenceResultSerializer,
    DataValidationSerializer, ReviewRequestSerializer
)
from apps.patients.models import Patient
from apps.ocs.models import OCS


class AIModelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    AI 모델 ViewSet

    - GET /api/ai/models/ : 활성화된 모델 목록
    - GET /api/ai/models/{code}/ : 모델 상세
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'

    def get_queryset(self):
        return AIModel.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return AIModelListSerializer
        return AIModelSerializer


class AIInferenceRequestViewSet(viewsets.ModelViewSet):
    """
    AI 추론 요청 ViewSet

    - GET /api/ai/requests/ : 요청 목록
    - POST /api/ai/requests/ : 요청 생성
    - GET /api/ai/requests/{id}/ : 요청 상세
    - POST /api/ai/requests/{id}/cancel/ : 요청 취소
    - GET /api/ai/requests/{id}/status/ : 상태 조회
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AIInferenceRequest.objects.select_related(
            'patient', 'model', 'requested_by'
        ).prefetch_related('logs')

        # 필터링
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        model_code = self.request.query_params.get('model_code')
        if model_code:
            queryset = queryset.filter(model__code=model_code)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 내 요청만 보기
        my_only = self.request.query_params.get('my_only')
        if my_only == 'true':
            queryset = queryset.filter(requested_by=self.request.user)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return AIInferenceRequestListSerializer
        if self.action == 'create':
            return AIInferenceRequestCreateSerializer
        return AIInferenceRequestDetailSerializer

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """요청 상태 조회"""
        instance = self.get_object()
        return Response({
            'request_id': instance.request_id,
            'status': instance.status,
            'status_display': instance.get_status_display(),
            'started_at': instance.started_at,
            'completed_at': instance.completed_at,
            'error_message': instance.error_message,
            'has_result': hasattr(instance, 'result') and instance.result is not None
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """요청 취소"""
        instance = self.get_object()

        if instance.status in ['COMPLETED', 'FAILED', 'CANCELLED']:
            return Response(
                {'error': '이미 완료되거나 취소된 요청입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = AIInferenceRequest.Status.CANCELLED
        instance.save()

        AIInferenceLog.objects.create(
            inference_request=instance,
            action=AIInferenceLog.Action.CANCELLED,
            message=f'{request.user.name}님이 요청을 취소했습니다.'
        )

        return Response({'message': '요청이 취소되었습니다.'})

    @action(detail=False, methods=['post'])
    def validate(self, request):
        """
        데이터 검증

        환자와 모델 조합에 대해 필요한 데이터 충족 여부 확인
        """
        serializer = DataValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        patient_id = serializer.validated_data['patient_id']
        model_code = serializer.validated_data['model_code']

        patient = Patient.objects.get(id=patient_id)
        model = AIModel.objects.get(code=model_code)

        available_keys = []
        missing_keys = []
        ocs_info = {}

        # 각 소스별 데이터 확인
        for source in model.ocs_sources:
            ocs = OCS.objects.filter(
                patient=patient,
                job_role=source,
                ocs_status='CONFIRMED'
            ).order_by('-confirmed_at').first()

            source_info = {
                'has_ocs': ocs is not None,
                'ocs_id': ocs.id if ocs else None,
                'ocs_status': ocs.ocs_status if ocs else None,
            }

            if ocs:
                required_keys = model.required_keys.get(source, [])
                for key in required_keys:
                    value = self._get_nested_value(ocs.worker_result, key)
                    full_key = f"{source}.{key}"
                    if value is not None:
                        available_keys.append(full_key)
                    else:
                        missing_keys.append(full_key)

            ocs_info[source] = source_info

        is_valid = len(missing_keys) == 0 and len(available_keys) > 0

        return Response({
            'valid': is_valid,
            'patient_id': patient_id,
            'model_code': model_code,
            'available_keys': available_keys,
            'missing_keys': missing_keys,
            'ocs_info': ocs_info
        })

    def _get_nested_value(self, data, key):
        """중첩 딕셔너리에서 값 추출"""
        if not data:
            return None
        keys = key.split('.')
        value = data
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return None
        return value


class AIInferenceResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    AI 추론 결과 ViewSet

    - GET /api/ai/results/ : 결과 목록
    - GET /api/ai/results/{id}/ : 결과 상세
    - POST /api/ai/results/{id}/review/ : 결과 검토
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AIInferenceResultSerializer

    def get_queryset(self):
        queryset = AIInferenceResult.objects.select_related(
            'inference_request', 'inference_request__patient',
            'inference_request__model', 'reviewed_by'
        )

        # 필터링
        review_status = self.request.query_params.get('review_status')
        if review_status:
            queryset = queryset.filter(review_status=review_status)

        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(inference_request__patient_id=patient_id)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """결과 검토 (승인/거부)"""
        instance = self.get_object()

        serializer = ReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review_status = serializer.validated_data['review_status']
        review_comment = serializer.validated_data.get('review_comment', '')

        instance.review_status = review_status
        instance.review_comment = review_comment
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()

        # 로그 생성
        AIInferenceLog.objects.create(
            inference_request=instance.inference_request,
            action=AIInferenceLog.Action.REVIEWED,
            message=f'{request.user.name}님이 결과를 {"승인" if review_status == "approved" else "거부"}했습니다.',
            details={
                'review_status': review_status,
                'review_comment': review_comment
            }
        )

        return Response({
            'message': '검토가 완료되었습니다.',
            'review_status': instance.review_status,
            'review_status_display': instance.get_review_status_display()
        })


class PatientAIViewSet(viewsets.ViewSet):
    """
    환자별 AI 관련 조회

    - GET /api/ai/patients/{patient_id}/requests/ : 환자별 추론 요청 이력
    - GET /api/ai/patients/{patient_id}/available-models/ : 사용 가능한 모델 목록
    """
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'], url_path='requests')
    def requests(self, request, pk=None):
        """환자별 추론 요청 이력"""
        requests = AIInferenceRequest.objects.filter(
            patient_id=pk
        ).select_related('model', 'requested_by').order_by('-created_at')

        serializer = AIInferenceRequestListSerializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='available-models')
    def available_models(self, request, pk=None):
        """환자가 사용 가능한 모델 목록"""
        try:
            patient = Patient.objects.get(id=pk)
        except Patient.DoesNotExist:
            return Response(
                {'error': '존재하지 않는 환자입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        models = AIModel.objects.filter(is_active=True)
        result = []

        for model in models:
            # 각 모델에 대해 데이터 충족 여부 확인
            available_keys = []
            missing_keys = []

            for source in model.ocs_sources:
                ocs = OCS.objects.filter(
                    patient=patient,
                    job_role=source,
                    ocs_status='CONFIRMED'
                ).order_by('-confirmed_at').first()

                if ocs:
                    required_keys = model.required_keys.get(source, [])
                    for key in required_keys:
                        value = self._get_nested_value(ocs.worker_result, key)
                        full_key = f"{source}.{key}"
                        if value is not None:
                            available_keys.append(full_key)
                        else:
                            missing_keys.append(full_key)
                else:
                    # OCS가 없으면 모든 키가 missing
                    required_keys = model.required_keys.get(source, [])
                    for key in required_keys:
                        missing_keys.append(f"{source}.{key}")

            result.append({
                'code': model.code,
                'name': model.name,
                'description': model.description,
                'is_available': len(missing_keys) == 0 and len(available_keys) > 0,
                'available_keys': available_keys,
                'missing_keys': missing_keys
            })

        return Response(result)

    @action(detail=True, methods=['get'], url_path='ocs-for-model')
    def ocs_for_model(self, request, pk=None):
        """
        특정 모델에 적합한 환자 OCS 목록

        쿼리 파라미터:
        - model_code: AI 모델 코드 (필수)

        반환: 해당 모델에 필요한 데이터를 가진 OCS 목록
        """
        model_code = request.query_params.get('model_code')
        if not model_code:
            return Response(
                {'error': 'model_code 파라미터가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = Patient.objects.get(id=pk)
        except Patient.DoesNotExist:
            return Response(
                {'error': '존재하지 않는 환자입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            model = AIModel.objects.get(code=model_code, is_active=True)
        except AIModel.DoesNotExist:
            return Response(
                {'error': '존재하지 않거나 비활성화된 모델입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        result = []

        # 모델이 필요로 하는 각 소스(RIS, LIS 등)에서 OCS 조회
        for source in model.ocs_sources:
            required_keys = model.required_keys.get(source, [])

            # 해당 job_role의 CONFIRMED OCS 모두 조회
            ocs_list = OCS.objects.filter(
                patient=patient,
                job_role=source,
                ocs_status='CONFIRMED'
            ).order_by('-confirmed_at')

            for ocs in ocs_list:
                # 해당 OCS가 필요한 키를 가지고 있는지 확인
                available_keys = []
                missing_keys = []

                for key in required_keys:
                    value = self._get_nested_value(ocs.worker_result, key)
                    full_key = f"{source}.{key}"
                    if value is not None:
                        available_keys.append(full_key)
                    else:
                        missing_keys.append(full_key)

                # 필요한 키가 모두 있는 OCS만 포함
                is_compatible = len(missing_keys) == 0 and len(available_keys) > 0

                result.append({
                    'id': ocs.id,
                    'ocs_id': ocs.ocs_id,
                    'job_role': ocs.job_role,
                    'job_type': ocs.job_type,
                    'ocs_status': ocs.ocs_status,
                    'confirmed_at': ocs.confirmed_at,
                    'created_at': ocs.created_at,
                    'is_compatible': is_compatible,
                    'available_keys': available_keys,
                    'missing_keys': missing_keys,
                })

        return Response({
            'model_code': model_code,
            'model_name': model.name,
            'required_sources': model.ocs_sources,
            'ocs_list': result
        })

    def _get_nested_value(self, data, key):
        """중첩 딕셔너리에서 값 추출"""
        if not data:
            return None
        keys = key.split('.')
        value = data
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return None
        return value
