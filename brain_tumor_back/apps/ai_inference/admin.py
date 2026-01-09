from django.contrib import admin
from .models import AIModel, AIInferenceRequest, AIInferenceResult, AIInferenceLog


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'version', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code', 'name']


@admin.register(AIInferenceRequest)
class AIInferenceRequestAdmin(admin.ModelAdmin):
    list_display = ['request_id', 'patient', 'model', 'status', 'priority', 'requested_by', 'requested_at']
    list_filter = ['status', 'priority', 'model']
    search_fields = ['request_id', 'patient__name']


@admin.register(AIInferenceResult)
class AIInferenceResultAdmin(admin.ModelAdmin):
    list_display = ['inference_request', 'confidence_score', 'review_status', 'reviewed_by', 'reviewed_at']
    list_filter = ['review_status']


@admin.register(AIInferenceLog)
class AIInferenceLogAdmin(admin.ModelAdmin):
    list_display = ['inference_request', 'action', 'message', 'created_at']
    list_filter = ['action']
