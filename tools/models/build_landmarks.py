"""Фигурки достопримечательностей «Тумана» — параметрическая сборка в Blender 5.

Запуск в открытом Blender с дополнением MCP:  python tools/models/bl.py tools/models/build_landmarks.py
Или без интерфейса:  blender -b -P tools/models/build_landmarks.py

Единый стиль коллекционных фигурок: тёмный постамент с янтарной кромкой (цвета приложения),
сверху — «земля» места (вода, гранит, склон), объект — в реальных цветах по фотографиям.
Модели собираются в отдельной сцене TumanBuild, рабочая сцена пользователя не трогается.
Экспорт: public/models/landmarks/<id>.glb, превью: tools/models/previews/<id>.png.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.environ.get("TUMAN_ROOT", r"D:\projects\apps\vibeoton-tuman")
OUT = os.path.join(ROOT, "public", "models", "landmarks")
PREVIEW = os.path.join(ROOT, "tools", "models", "previews")
ONLY = os.environ.get("TUMAN_ONLY", "")  # через запятую: s56,funicular

# ---------- сцена и материалы ----------

def build_scene():
    if bpy.app.background:  # фоновый Blender: рабочая сцена своя, очищаем её целиком
        sc = bpy.context.scene
        for ob in list(sc.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        return sc
    sc = bpy.data.scenes.get("TumanBuild") or bpy.data.scenes.new("TumanBuild")
    for ob in list(sc.collection.all_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)
    if bpy.context.window:
        bpy.context.window.scene = sc
    return sc


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, color, rough=0.6, metal=0.0, emit=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*srgb(color), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Emission Color"].default_value = (*srgb(emit or "#000000"), 1)
    b.inputs["Emission Strength"].default_value = strength if emit else 0.0
    b.inputs["Alpha"].default_value = alpha
    return m


# Палитра фигурок: постамент в цветах интерфейса приложения.
P = {
    "plinth": ("#151E27", 0.45), "rim": ("#F5B83D", 0.35), "water": ("#1F5C7A", 0.18),
    "granite": ("#7A3A33", 0.55), "stone": ("#7C8287", 0.85), "concrete": ("#C9CDD0", 0.7),
    "white": ("#F1F2EF", 0.5), "glass": ("#1B2731", 0.15), "steel": ("#8E979D", 0.4),
}


def m(key, **kw):
    color, rough = P[key]
    return mat("t_" + key, color, rough, **kw)


# ---------- геометрия ----------

def obj(name, bm, material, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lathe(name, prof, material, seg=40, axis="Z", loc=(0, 0, 0), squash=(1, 1)):
    """Тело вращения по профилю [(высота, радиус)]. Торцы плоские, рёбра торцов жёсткие."""
    bm = bmesh.new()
    rings = []
    for h, r in prof:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            u, v = math.cos(a) * max(r, 1e-4) * squash[0], math.sin(a) * max(r, 1e-4) * squash[1]
            co = (u, v, h) if axis == "Z" else (h, u, v) if axis == "X" else (u, h, v)
            ring.append(bm.verts.new(Vector(co) + Vector(loc)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    for ring, flip in ((rings[0], True), (rings[-1], False)):
        if prof[0 if flip else -1][1] > 1e-3:
            bm.faces.new(list(reversed(ring)) if flip else ring)
            for e in bm.edges:
                if e.verts[0] in ring and e.verts[1] in ring:
                    e.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, material, smooth=True)


def box(name, size, loc, material, bevel=0.0, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if rot:
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=rot, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    ob = obj(name, bm, material)
    if bevel:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 3, "ANGLE"
        mod.harden_normals = True
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def rod(name, a, b, r, material, seg=10):
    """Цилиндр между точками a и b (тросы, ноги пилонов, перископы)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = lathe(name, [(0, r), (d.length, r)], material, seg=seg)
    ob.matrix_world = Matrix.Translation(a) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    return ob


def rock(name, loc, size, material, seed):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for i, v in enumerate(bm.verts):
        k = 0.82 + 0.18 * math.sin(seed * 12.9898 + i * 78.233)
        v.co = Vector((v.co.x * size[0] * k, v.co.y * size[1] * k, v.co.z * size[2] * k)) + Vector(loc)
    return obj(name, bm, material)


def plinth(top_key="granite", r=1.0, top=None):
    """Постамент фигурки: тёмная шайба, янтарная кромка, сверху «земля» места. Верх на z=0."""
    lathe("plinth", [(-0.22, r * 0.98), (-0.2, r), (-0.03, r), (-0.02, r * 0.985)], m("plinth"), seg=64)
    lathe("rim", [(-0.035, r * 1.004), (-0.02, r * 1.004)], m("rim", emit="#F5B83D", strength=0.6), seg=64)
    lathe("ground", [(-0.02, r * 0.97), (0.0, r * 0.97)], top or m(top_key), seg=64)


# ---------- фигурки ----------

def build_s56():
    """С-56 на гранитном постаменте у Корабельной набережной: верх корпуса светло-серый,
    низ зелёный, рубка с ограждением, перископы, палубное орудие перед рубкой."""
    plinth("granite", top=mat("t_paving", "#8C8F8E", 0.8))
    L, R = 1.72, 0.105
    def prof(x):
        t = x / (L / 2)
        if t > 0.55:  # нос — плавное скругление
            return R * math.sqrt(max(0.0, 1 - ((t - 0.55) / 0.45) ** 2.2))
        if t < -0.45:  # корма — длинное сужение к винтам
            return R * max(0.06, (1 - ((-t - 0.45) / 0.55) ** 1.6))
        return R
    xs = [(-L / 2) + L * i / 80 for i in range(81)]
    z0 = 0.28
    grey, green = mat("t_hull_grey", "#B9C0C3", 0.55), mat("t_hull_green", "#2E9468", 0.5)
    hull = lathe("hull", [(x, prof(x)) for x in xs], grey, seg=40, axis="X", loc=(0, 0, z0), squash=(1, 1.06))
    hull.data.materials.append(green)
    for p in hull.data.polygons:  # ниже ватерлинии — зелёный
        if p.center.z < z0 + R * 0.12:
            p.material_index = 1
    # постамент лодки: гранитная плита и ложементы
    box("pedestal", (1.25, 0.34, 0.12), (0.02, 0, 0.06), m("granite"), bevel=0.01)
    for x in (-0.38, 0.0, 0.38):
        box(f"cradle{x}", (0.06, 0.2, 0.14), (x, 0, 0.16), m("granite"), bevel=0.006)
    # надстройка палубы
    box("deck", (L * 0.74, R * 0.62, R * 0.24), (0.04, 0, z0 + R * 0.98), mat("t_deck", "#8F989C", 0.6), bevel=0.008)
    # рубка с ограждением
    box("tower", (0.36, 0.1, 0.13), (0.17, 0, z0 + R + 0.08), grey, bevel=0.035)
    box("tower_front", (0.1, 0.09, 0.09), (0.37, 0, z0 + R + 0.05), grey, bevel=0.035)
    box("bridge", (0.14, 0.104, 0.025), (0.23, 0, z0 + R + 0.155), mat("t_deck", "#8F989C"), bevel=0.01)
    for i, (x, h) in enumerate(((0.12, 0.13), (0.07, 0.1))):
        rod(f"periscope{i}", (x, 0, z0 + R + 0.14), (x, 0, z0 + R + 0.14 + h), 0.006, m("steel"))
    # палубное орудие перед рубкой
    lathe("gun_base", [(0, 0.028), (0.03, 0.024)], m("steel"), loc=(0.48, 0, z0 + R + 0.03))
    rod("gun", (0.48, 0, z0 + R + 0.065), (0.62, 0, z0 + R + 0.085), 0.008, m("steel"))
    # корма: рули и винты
    box("rudder", (0.1, 0.012, 0.16), (-L / 2 + 0.06, 0, z0), green, bevel=0.004)
    box("planes", (0.08, 0.3, 0.012), (-L / 2 + 0.09, 0, z0 - 0.02), green, bevel=0.004)
    box("bow_planes", (0.06, 0.26, 0.01), (L / 2 - 0.2, 0, z0 + 0.02), grey, bevel=0.003)
    bronze = mat("t_bronze", "#B07A3E", 0.35, 0.8)
    for y in (-0.06, 0.06):
        for k in range(3):
            a = k * 2 * math.pi / 3
            box(f"blade{y}{k}", (0.008, 0.012, 0.05), (-L / 2 + 0.035, y, z0 - 0.02),
                bronze, rot=Matrix.Rotation(a, 3, "X") @ Matrix.Translation((0, 0, 0.025)).to_3x3())
    # флагшток на корме с красным флагом
    rod("flagpole", (-0.15, 0, z0 + R + 0.03), (-0.15, 0, z0 + R + 0.24), 0.004, m("steel"))
    box("flag", (0.09, 0.004, 0.055), (-0.105, 0, z0 + R + 0.21), mat("t_flag", "#C2352E", 0.6))


def build_funicular():
    """Владивостокский фуникулёр (1962): крутой склон между Суханова и Пушкинской,
    путь с разъездом посередине, два вагона — красный и синий, наверху павильон с колоннами.
    Склон поднимается от зрителя, чтобы путь и вагоны читались с основного ракурса."""
    plinth(top=mat("t_grass", "#3B6B4E", 0.85))
    ang = math.radians(28)
    x0, plat, top_x = -0.78, 0.32, 0.78          # низ склона, ширина верхней площадки, задний край
    x1 = top_x - plat                             # верх склона
    hgt = (x1 - x0) * math.tan(ang)
    w = 0.86
    grass, earth = mat("t_grass", "#3B6B4E", 0.85), mat("t_earth", "#4B3D31", 0.9)
    # склон с ровной площадкой наверху: профиль в XZ, вытянутый по Y
    bm = bmesh.new()
    prof = [(x0, 0), (x1, hgt), (top_x, hgt), (top_x, 0)]
    a = [bm.verts.new((x, -w / 2, z)) for x, z in prof]
    b = [bm.verts.new((x, w / 2, z)) for x, z in prof]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(len(prof)):
        j = (i + 1) % len(prof)
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    hill = obj("hill", bm, earth)
    hill.data.materials.append(grass)
    for p in hill.data.polygons:
        if p.normal.z > 0.3:
            p.material_index = 1
    rot = Matrix.Rotation(-ang, 3, "Y")
    up = Vector((math.cos(ang), 0, math.sin(ang)))
    nrm = Vector((-math.sin(ang), 0, math.cos(ang)))
    length = (x1 - x0) / math.cos(ang)
    def on_slope(s, y, lift=0.0):  # s — расстояние вдоль склона от низа
        return Vector((x0, y, 0)) + up * s + nrm * lift
    # светлая отсыпка под путём и бетонная лестница сбоку
    ballast = mat("t_ballast", "#6F6A63", 0.95)
    box("ballast", (length, 0.34, 0.012), on_slope(length / 2, 0, 0.004), ballast, rot=rot)
    box("ballast_loop", (length * 0.44, 0.5, 0.012), on_slope(length / 2, 0, 0.005), ballast, rot=rot)
    for i in range(16):
        box(f"step{i}", (0.05, 0.13, 0.014), on_slope(0.08 + i * (length - 0.16) / 15, 0.36, 0.007), m("concrete"), rot=rot)
    # путь: шпалы и две колеи, расходящиеся на разъезде
    rail, sleeper = mat("t_rail", "#C9CED2", 0.35, 0.8), mat("t_sleeper", "#3A3029", 0.9)
    def track_y(s, side):
        k = max(0.0, 1 - abs(s - length / 2) / (length * 0.24))
        return side * 0.11 * (1 - (1 - k) ** 2)
    for i in range(24):
        s = 0.04 + i * (length - 0.08) / 23
        span = 0.2 + 2 * abs(track_y(s, 1))
        box(f"sleeper{i}", (0.026, span, 0.012), on_slope(s, 0, 0.014), sleeper, rot=rot)
    segs = 28
    for side in (-1, 1):
        for g in (-0.045, 0.045):
            prev = None
            for i in range(segs + 1):
                s = length * i / segs
                p = on_slope(s, track_y(s, side) + g, 0.026)
                if prev is not None:
                    rod(f"rail{side}{g}{i}", prev, p, 0.0065, rail, seg=6)
                prev = p
    # вагоны: кузов вдоль склона, лента окон, светлая крыша и полоса
    def car(name, s, side, body):
        c = on_slope(s, track_y(s, side), 0.13)
        box(name + "_body", (0.38, 0.19, 0.18), c, body, bevel=0.022, rot=rot)
        box(name + "_glass", (0.32, 0.194, 0.065), c + rot @ Vector((0, 0, 0.028)), m("glass"), rot=rot)
        box(name + "_front", (0.384, 0.12, 0.065), c + rot @ Vector((0, 0, 0.028)), m("glass"), rot=rot)
        box(name + "_roof", (0.4, 0.2, 0.026), c + rot @ Vector((0, 0, 0.1)), m("white"), bevel=0.01, rot=rot)
        box(name + "_band", (0.384, 0.194, 0.016), c + rot @ Vector((0, 0, -0.04)), m("white"), rot=rot)
        for dx in (-0.12, 0.12):
            box(f"{name}_wheel{dx}", (0.05, 0.2, 0.03), c + rot @ Vector((dx, 0, -0.1)), m("steel"), rot=rot)
    car("car_red", length * 0.34, -1, mat("t_car_red", "#C8332B", 0.45))
    car("car_blue", length * 0.66, 1, mat("t_car_blue", "#2E68B0", 0.45))
    # трос между вагонами
    rod("cable", on_slope(length * 0.34 + 0.2, track_y(length * 0.34, -1), 0.04), on_slope(length * 0.66 - 0.2, track_y(length * 0.66, 1), 0.04), 0.003, m("steel"), seg=4)
    # верхняя станция: павильон с колоннадой, обращённой к пути
    cream, roof = mat("t_cream", "#E8E1CF", 0.7), mat("t_roof", "#5E6D78", 0.6)
    top = Vector((x1 + plat * 0.55, 0, hgt))
    box("station_top", (0.2, 0.42, 0.17), top + Vector((0.02, 0, 0.085)), cream, bevel=0.01)
    for y in (-0.15, -0.05, 0.05, 0.15):
        rod(f"col{y}", top + Vector((-0.11, y, 0)), top + Vector((-0.11, y, 0.17)), 0.011, m("white"))
    box("portico", (0.08, 0.42, 0.025), top + Vector((-0.11, 0, 0.182)), cream, bevel=0.006)
    box("roof_top", (0.3, 0.46, 0.03), top + Vector((-0.03, 0, 0.207)), roof, bevel=0.01)
    # нижняя станция у подножия
    bot = Vector((x0 - 0.02, 0, 0))
    box("station_bottom", (0.12, 0.3, 0.12), bot + Vector((0, 0, 0.06)), cream, bevel=0.01)
    box("roof_bottom", (0.16, 0.34, 0.025), bot + Vector((0, 0, 0.132)), roof, bevel=0.008)
    # деревья по сторонам склона
    for i, (s, y) in enumerate(((0.25, -0.34), (0.55, 0.36), (0.85, -0.35), (1.05, 0.36))):
        p = on_slope(s, y)
        rod(f"trunk{i}", p, p + Vector((0, 0, 0.07)), 0.01, mat("t_trunk", "#4A3527", 0.9))
        rock(f"crown{i}", p + Vector((0, 0, 0.13)), (0.075, 0.075, 0.085), mat("t_leaf", "#2F5E3F", 0.8), i + 3)
    # разворот: склон уходит от зрителя (камера смотрит с юга)
    turn = Matrix.Rotation(math.radians(90), 4, "Z")
    for ob in bpy.context.scene.objects:
        if ob.name not in ("plinth", "rim", "ground"):
            ob.matrix_world = turn @ ob.matrix_world


def build_lighthouse():
    """Маяк Токаревского: белая башня на круглом основании в конце каменной косы, фонарь сверху."""
    plinth(top=m("water"))
    stone = m("stone")
    for i in range(16):  # коса уходит к краю постамента
        t = i / 15
        rock(f"spit{i}", (-0.15 - t * 0.72, (math.sin(i * 1.7) * 0.04), 0.01), (0.09, 0.07, 0.035), stone, i)
    lathe("base", [(0, 0.3), (0.06, 0.3), (0.08, 0.27)], m("concrete"), seg=48)
    white = m("white")
    lathe("tower", [(0.08, 0.15), (0.75, 0.115), (0.76, 0.13), (0.79, 0.13)], white, seg=40)
    tower_r = lambda z: 0.15 - (z - 0.08) / 0.67 * 0.035
    for k in range(3):  # окна по оси башни, утоплены в стену
        z = 0.3 + k * 0.15
        box(f"win{k}", (0.02, 0.035, 0.06), (tower_r(z) - 0.006, 0, z), m("glass"))
    box("door", (0.02, 0.06, 0.1), (tower_r(0.13) - 0.006, 0, 0.13), mat("t_door", "#5A3B2E", 0.6))
    lathe("gallery", [(0.79, 0.17), (0.81, 0.17)], mat("t_gallery", "#2C3237", 0.5), seg=40)
    for k in range(20):  # перила галереи
        a = 2 * math.pi * k / 20
        rod(f"rail{k}", (0.165 * math.cos(a), 0.165 * math.sin(a), 0.81), (0.165 * math.cos(a), 0.165 * math.sin(a), 0.86), 0.003, m("steel"), seg=4)
    lathe("rail_top", [(0.858, 0.168), (0.864, 0.168)], m("steel"), seg=40)
    lathe("lantern", [(0.81, 0.085), (0.93, 0.085)], mat("t_lamp", "#FFD38A", 0.2, emit="#FFC66B", strength=4.0), seg=24)
    lathe("cap", [(0.93, 0.105), (0.95, 0.105), (1.02, 0.03), (1.04, 0.0)], mat("t_cap", "#B6382E", 0.5), seg=32)
    lathe("vane", [(1.04, 0.012), (1.08, 0.012)], m("steel"), seg=8)


def build_bridge():
    """Золотой мост через бухту Золотой Рог: V-образные пилоны (форма буквы V — впервые
    в мире), веерные ванты, полотно с золотыми огнями по краям."""
    plinth(top=m("water"))
    span, deck_z = 1.9, 0.34
    grey = mat("t_bridge", "#D6DADD", 0.6)
    # полотно с лёгким подъёмом к середине
    n = 24
    for i in range(n):
        x0, x1 = -span / 2 + span * i / n, -span / 2 + span * (i + 1) / n
        z = deck_z + 0.04 * math.cos(math.pi * ((x0 + x1) / 2) / span)
        box(f"deck{i}", (x1 - x0 + 0.002, 0.2, 0.035), ((x0 + x1) / 2, 0, z), grey)
        for y in (-0.1, 0.1):  # золотые огни
            box(f"light{i}{y}", (x1 - x0 + 0.002, 0.008, 0.008), ((x0 + x1) / 2, y, z + 0.022), mat("t_gold", "#F5B83D", 0.3, emit="#F5B83D", strength=2.5))
    for x in (-span / 2 + 0.06, span / 2 - 0.06):  # береговые опоры
        box(f"abut{x}", (0.12, 0.22, deck_z), (x, 0, deck_z / 2), m("concrete"), bevel=0.01)
    cable = mat("t_cable", "#F4F4F2", 0.3, 0.3)
    for px in (-0.36, 0.36):
        base = Vector((px, 0, 0.02))
        lathe(f"pier{px}", [(0, 0.07), (0.06, 0.06)], m("concrete"), loc=(px, 0, 0), seg=24)
        tops = []
        for y in (-0.16, 0.16):  # V: две ноги из одной точки расходятся вверх и в стороны
            top = Vector((px, y, 1.15))
            rod(f"leg{px}{y}", base, top, 0.026, grey, seg=16)
            tops.append(top)
        box(f"crossbeam{px}", (0.04, 0.2, 0.03), (px, 0, deck_z - 0.02), grey)
        for top in tops:  # веер вант к краю полотна по обе стороны пилона
            side = 0.1 if top.y > 0 else -0.1
            for k in range(7):
                for d in (-1, 1):
                    dx = d * (0.09 + k * 0.055)
                    x = px + dx
                    if abs(x) > span / 2 - 0.08:
                        continue
                    z = deck_z + 0.04 * math.cos(math.pi * x / span) + 0.02
                    rod(f"c{px}{top.y}{k}{d}", top - Vector((0, 0, 0.04 + k * 0.025)), (x, side, z), 0.0035, cable, seg=5)
        for top in tops:
            lathe(f"beacon{px}{top.y}", [(0, 0.03), (0.03, 0.03)], mat("t_beacon", "#E5483B", 0.3, emit="#FF4A3A", strength=3), loc=tuple(top), seg=10)


# ---------- экспорт и превью ----------

def export(name):
    os.makedirs(OUT, exist_ok=True)
    for ob in bpy.context.scene.objects:
        ob.select_set(ob.type == "MESH")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + ".glb"), export_format="GLB",
                              use_selection=True, export_apply=True, export_yup=True)


def preview(name):
    sc = bpy.context.scene
    meshes = [o for o in sc.objects if o.type == "MESH"]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c, size = (lo + hi) / 2, (hi - lo).length
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.location = c + Vector((1.25, -1.6, 0.95)).normalized() * size * 1.05
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50
    sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy, sun.data.angle = 3.2, math.radians(8)
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    sc.collection.objects.link(sun)
    world = bpy.data.worlds.get("TumanWorld") or bpy.data.worlds.new("TumanWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (*srgb("#0E1419"), 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 2.4
    sc.world = world
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = engine
            break
        except TypeError:
            continue
    sc.render.resolution_x = sc.render.resolution_y = 900
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    os.makedirs(PREVIEW, exist_ok=True)
    sc.render.filepath = os.path.join(PREVIEW, name + ".png")
    bpy.ops.render.render(write_still=True)


BUILDERS = {"s56": build_s56, "funicular": build_funicular, "lighthouse": build_lighthouse, "bridge": build_bridge}
done = []
for key, fn in BUILDERS.items():
    if ONLY and key not in ONLY.split(","):
        continue
    build_scene()
    fn()
    export(key)
    preview(key)
    done.append(key)
print("built:", ", ".join(done))
