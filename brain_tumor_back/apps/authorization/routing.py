from django.urls import re_path
from .consumers import PermissionConsumer

websocket_urlpatterns = [
    re_path(r"ws/permissions/$", PermissionConsumer.as_asgi()),
]