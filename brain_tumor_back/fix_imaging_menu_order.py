#!/usr/bin/env python
"""Fix imaging menu order"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.menus.models import Menu

print("현재 영상 메뉴 순서:")
imaging_menus = Menu.objects.filter(parent__menu_id='IMAGING').order_by('order')
for menu in imaging_menus:
    print(f"  {menu.order}: {menu.menu_id}")

print("\n메뉴 순서 변경 중...")

# 영상 목록 (IMAGING_STUDY_LIST) - 1번
imaging_list = Menu.objects.get(menu_id='IMAGING_STUDY_LIST')
imaging_list.order = 1
imaging_list.save()
print(f"  IMAGING_STUDY_LIST: order={imaging_list.order}")

# 영상 조회 (IMAGE_VIEWER) - 2번
image_viewer = Menu.objects.get(menu_id='IMAGE_VIEWER')
image_viewer.order = 2
image_viewer.save()
print(f"  IMAGE_VIEWER: order={image_viewer.order}")

# 판독 (IMAGING_REPORT) - 3번
imaging_report = Menu.objects.get(menu_id='IMAGING_REPORT')
imaging_report.order = 3
imaging_report.save()
print(f"  IMAGING_REPORT: order={imaging_report.order}")

# RIS 워크리스트 (RIS_WORKLIST) - 4번
ris_worklist = Menu.objects.get(menu_id='RIS_WORKLIST')
ris_worklist.order = 4
ris_worklist.save()
print(f"  RIS_WORKLIST: order={ris_worklist.order}")

print("\n변경된 영상 메뉴 순서:")
from apps.menus.models import MenuLabel
imaging_menus = Menu.objects.filter(parent__menu_id='IMAGING').order_by('order')
for menu in imaging_menus:
    labels = MenuLabel.objects.filter(menu=menu, role='DEFAULT')
    label_text = labels.first().text if labels.exists() else menu.menu_id
    print(f"  {menu.order}: {menu.menu_id} - {label_text}")

print("\n메뉴 순서 변경 완료!")
