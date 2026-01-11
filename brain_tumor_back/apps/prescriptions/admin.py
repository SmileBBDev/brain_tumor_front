from django.contrib import admin
from .models import Prescription, PrescriptionItem


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 1


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['prescription_id', 'patient', 'doctor', 'status', 'item_count', 'created_at', 'issued_at']
    list_filter = ['status', 'doctor']
    search_fields = ['prescription_id', 'patient__name', 'doctor__name']
    inlines = [PrescriptionItemInline]
    readonly_fields = ['prescription_id', 'created_at', 'updated_at']

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = '항목 수'


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'medication_name', 'dosage', 'frequency', 'route', 'duration_days']
    list_filter = ['frequency', 'route']
    search_fields = ['medication_name', 'prescription__prescription_id']
