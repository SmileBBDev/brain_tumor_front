from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """감사 로그 조회용 Serializer"""
    user_login_id = serializers.CharField(source='user.login_id', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_role = serializers.CharField(source='user.role', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_login_id',
            'user_name',
            'user_role',
            'action',
            'action_display',
            'ip_address',
            'user_agent',
            'created_at',
        ]
        read_only_fields = fields
