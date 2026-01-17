from django.db import models
from django.conf import settings


class SystemConfig(models.Model):
    """
    시스템 설정 모델
    - 모니터링 알림 대처 방안 등 관리자가 편집 가능한 설정 저장
    """
    key = models.CharField(max_length=100, unique=True, verbose_name='설정 키')
    value = models.TextField(verbose_name='설정 값 (JSON)')
    description = models.CharField(max_length=200, blank=True, verbose_name='설명')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_configs',
        verbose_name='수정자'
    )

    class Meta:
        db_table = 'system_config'
        verbose_name = '시스템 설정'
        verbose_name_plural = '시스템 설정'

    def __str__(self):
        return f"{self.key}"

    @classmethod
    def get_value(cls, key, default=None):
        """설정 값 조회"""
        import json
        try:
            config = cls.objects.get(key=key)
            return json.loads(config.value)
        except cls.DoesNotExist:
            return default
        except json.JSONDecodeError:
            return config.value

    @classmethod
    def set_value(cls, key, value, description='', user=None):
        """설정 값 저장"""
        import json
        if not isinstance(value, str):
            value = json.dumps(value, ensure_ascii=False)

        config, created = cls.objects.update_or_create(
            key=key,
            defaults={
                'value': value,
                'description': description,
                'updated_by': user,
            }
        )
        return config
