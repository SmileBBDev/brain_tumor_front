from django.contrib import admin
from .models import ImagingStudy, ImagingReport


@admin.register(ImagingStudy)
class ImagingStudyAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'modality', 'status', 'ordered_by', 'ordered_at', 'is_deleted']
    list_filter = ['modality', 'status', 'is_deleted', 'ordered_at']
    search_fields = ['patient__name', 'patient__patient_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'ordered_at'


@admin.register(ImagingReport)
class ImagingReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'imaging_study', 'radiologist', 'status', 'tumor_detected', 'signed_at']
    list_filter = ['status', 'tumor_detected', 'created_at']
    search_fields = ['imaging_study__patient__name', 'radiologist__name']
    readonly_fields = ['created_at', 'updated_at']
