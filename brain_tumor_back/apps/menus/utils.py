def build_menu_tree(menus):
    menu_map = {}
    tree = []

    # 모든 메뉴 노드 생성
    for menu in menus:
        labels = {lbl.role: lbl.text for lbl in menu.labels.all()}
        menu_map[menu.menu_id] = {
            "id": menu.menu_id,
            "path": menu.path,
            "icon": menu.icon,
            "groupLabel": menu.group_label,
            "breadcrumbOnly": menu.breadcrumb_only,
            "labels": labels,
            "children": [],
        }
        
    # 메뉴 : 부모-자식 관계 연결
    for menu in menus:
        node = menu_map[menu.menu_id]

        if menu.parent_id:
            parent = menu_map.get(menu.parent_id)
            if parent:
                parent["children"].append(node)
        else:
            tree.append(menu_map[menu.menu_id])

    return tree