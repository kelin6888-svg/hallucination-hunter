"""60 秒宣传片渲染：真实截图 + 字幕 + 轻微推镜，直接管道给 ffmpeg。"""
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, DUR = 1280, 720, 24, 60.0
ROOT = Path(__file__).resolve().parents[2]
SHOT_DIR = ROOT / "shots" / "materials"
OUT = ROOT / "pitch" / "promo" / "hallucination-hunter-60s.mp4"
AUDIO = ROOT / "pitch" / "promo" / "pad.wav"

BOLD = "C:/Windows/Fonts/msyhbd.ttc"
REG = "C:/Windows/Fonts/msyh.ttc"

F_MAIN = ImageFont.truetype(BOLD, 44)
F_SUB = ImageFont.truetype(REG, 24)
F_LABEL = ImageFont.truetype(BOLD, 17)
F_HERO = ImageFont.truetype(BOLD, 62)
F_HERO_SUB = ImageFont.truetype(REG, 26)

INK = (244, 245, 250)
MUTED = (168, 173, 196)
RED = (255, 113, 113)
GREEN = (52, 211, 153)
VIOLET = (167, 139, 250)

_cache: dict[str, Image.Image] = {}


def load(name: str) -> Image.Image:
    if name not in _cache:
        _cache[name] = Image.open(SHOT_DIR / name).convert("RGB")
    return _cache[name]


def frame_of(img: Image.Image, zoom: float, fx: float, fy: float) -> Image.Image:
    sw, sh = img.size
    base = max(W / sw, H / sh)
    scale = base * zoom
    nw, nh = int(sw * scale) + 1, int(sh * scale) + 1
    resized = img.resize((nw, nh), Image.LANCZOS)
    left = int((nw - W) * fx)
    top = int((nh - H) * fy)
    return resized.crop((left, top, left + W, top + H))


def vignette() -> Image.Image:
    """返回暗角蒙版：中心 255（不压暗），四周约 170（压暗）。"""
    if "vig" in _cache:
        return _cache["vig"]
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-W * 0.3, -H * 0.42, W * 1.3, H * 1.42), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(150))
    mask = mask.point(lambda v: int(168 + v * 87 / 255))
    _cache["vig"] = mask
    return mask


SHOTS = [
    # 0:00 字卡
    dict(t0=0.0, t1=5.0, kind="card", kicker="MONAD 测试网 · 黑客松",
         lines=[("AI 给你答案", F_HERO, INK), ("后果由你承担", F_HERO, VIOLET)]),
    # 0:05 首页
    dict(t0=5.0, t1=12.0, kind="img", src="phone-home.png", zoom=(1.00, 1.07), focus=(0.5, 0.42),
         label="失控的周六", main="五个生活任务", sub="一部手机、一个从不犹豫的助手"),
    # 0:12 抢票
    dict(t0=12.0, t1=18.0, kind="img", src="loss.png", zoom=(1.02, 1.10), focus=(0.42, 0.5),
         label="第 1 幕 · 抢票危机", main='客服："点这个链接，5 分钟内有效"', sub='助手："可能是官方备用通道"', sub_color=RED),
    # 0:18 点击
    dict(t0=18.0, t1=22.0, kind="img", src="loss.png", zoom=(1.14, 1.26), focus=(0.44, 0.62),
         label="他没有再多看一步", main="他点了", sub="180 元转给了一个没有认证的账号", sub_color=RED, flash=18.05),
    # 0:22 资源条
    dict(t0=22.0, t1=27.0, kind="img", src="loss.png", zoom=(1.01, 1.07), focus=(0.5, 0.03), dim=0.12,
         label="界面会立刻告诉你代价", main="¥500 → ¥320", sub="票没了，任务停在 0 / 5", sub_color=RED, shake=True),
    # 0:27 转折
    dict(t0=27.0, t1=30.0, kind="card", kicker="",
         lines=[("但核实只要 6 分钟。", F_HERO, GREEN)]),
    # 0:30 核实
    dict(t0=30.0, t1=35.0, kind="img", src="verify.png", zoom=(1.06, 1.14), focus=(0.42, 0.72),
         label="查订单 · 查账号", main="同一个链接，不属于官方渠道", sub="官方订单早已关闭，只认站内收银台", sub_color=GREEN),
    # 0:35 算错钱
    dict(t0=35.0, t1=40.0, kind="img", src="budget.png", zoom=(1.08, 1.16), focus=(0.40, 0.55),
         label="第 2 幕 · 预算保卫战", main='"一共 96，最后 56，预算内"', sub="结算页：66 元，超了 6 元", sub_color=RED),
    # 0:40 推断错
    dict(t0=40.0, t1=45.0, kind="img", src="parcel.png", zoom=(1.04, 1.12), focus=(0.42, 0.5),
         label="第 3 幕 · 消失的快递", main='"包裹应该已经到小区门口了"', sub="实际还躺在配送站，白跑 14 分钟", sub_color=RED),
    # 0:45 结算
    dict(t0=45.0, t1=50.0, kind="img", src="final.png", zoom=(1.16, 1.02), focus=(0.32, 0.34),
         label="一天结束", main="500 分 · 四种结局", sub="每一次判断都被记下来"),
    # 0:50 链上
    dict(t0=50.0, t1=54.0, kind="img", src="final.png", zoom=(1.9, 2.0), focus=(0.72, 0.30),
         label="Monad 测试网", main="全程两次签名", sub="开局一次，交成绩一次", sub_color=GREEN),
    # 0:54 落款
    dict(t0=54.0, t1=60.0, kind="end"),
]


def scrim() -> Image.Image:
    """底部渐变蒙层：保证字幕永远压得住画面。"""
    if "scrim" in _cache:
        return _cache["scrim"]
    def alpha_at(y: int) -> int:
        if y < 430:
            return 0
        if y < 515:
            return int((y - 430) / 85 * 246)
        return 246

    ramp = Image.new("L", (1, H))
    ramp.putdata([alpha_at(y) for y in range(H)])
    mask = ramp.resize((W, H))
    layer = Image.new("RGB", (W, H), (4, 5, 12))
    _cache["scrim"] = (mask, layer)
    return _cache["scrim"]


def draw_caption(canvas: Image.Image, shot: dict) -> None:
    mask, layer = scrim()
    canvas.paste(layer, (0, 0), mask)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    x = 80
    d.text((x, 548), shot["label"], font=F_LABEL, fill=(196, 186, 240))
    d.text((x, 578), shot["main"], font=F_MAIN, fill=INK)
    if shot.get("sub"):
        d.text((x, 640), shot["sub"], font=F_SUB, fill=shot.get("sub_color", MUTED))
    canvas.alpha_composite(overlay)


def render_shot(shot: dict, t: float) -> Image.Image:
    if shot["kind"] == "card":
        canvas = Image.new("RGBA", (W, H), (5, 6, 13, 255))
        d = ImageDraw.Draw(canvas)
        for gx in range(0, W, 64):
            d.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 6))
        for gy in range(0, H, 64):
            d.line([(0, gy), (W, gy)], fill=(255, 255, 255, 6))
        if shot.get("kicker"):
            d.text((80, 60), shot["kicker"], font=F_LABEL, fill=(120, 105, 180))
        total = len(shot["lines"])
        start_y = H / 2 - (total * 80) / 2 - 10
        for i, (text, font, color) in enumerate(shot["lines"]):
            d.text((80, start_y + i * 84), text, font=font, fill=color)
        d.line([(80, H / 2 + total * 42 + 6), (240, H / 2 + total * 42 + 6)],
               fill=(124, 92, 255, 200), width=2)
        return canvas.convert("RGB")

    if shot["kind"] == "end":
        canvas = Image.new("RGBA", (W, H), (5, 6, 13, 255))
        d = ImageDraw.Draw(canvas)
        d.rectangle((80, 300, 84, 420), fill=(124, 92, 255, 255))
        d.text((108, 296), "幻觉猎人", font=ImageFont.truetype(BOLD, 58), fill=INK)
        d.text((110, 380), "Hallucination Hunter", font=ImageFont.truetype(REG, 22), fill=(150, 140, 200))
        d.text((110, 424), "Don't Trust. Verify.", font=ImageFont.truetype(REG, 26), fill=VIOLET)
        d.text((80, 600), "Monad 测试网 · 10143 · 成绩由服务端签名后上链", font=F_LABEL, fill=(110, 115, 140))
        return canvas.convert("RGB")

    span = max(0.001, shot["t1"] - shot["t0"])
    p = min(1.0, max(0.0, (t - shot["t0"]) / span))
    ease = 1 - (1 - p) ** 2
    z0, z1 = shot["zoom"]
    zoom = z0 + (z1 - z0) * ease
    img = frame_of(load(shot["src"]), zoom, shot["focus"][0], shot["focus"][1])

    if shot.get("dim"):
        img = Image.blend(img, Image.new("RGB", (W, H), (4, 5, 12)), shot["dim"])

    if shot.get("flash") is not None and 0 <= t - shot["flash"] < 0.25:
        img = Image.blend(img, Image.new("RGB", (W, H), (255, 255, 255)), 0.18)

    img = Image.composite(img, Image.new("RGB", (W, H), (4, 5, 11)), vignette())
    canvas = img.convert("RGBA")
    draw_caption(canvas, shot)
    return canvas.convert("RGB")


def render(t: float) -> Image.Image:
    current = next((s for s in SHOTS if s["t0"] <= t < s["t1"]), SHOTS[-1])
    frame = render_shot(current, t)
    idx = SHOTS.index(current)
    fade = 0.35
    if idx > 0 and t - current["t0"] < fade:
        prev = render_shot(SHOTS[idx - 1], t)
        frame = Image.blend(prev, frame, (t - current["t0"]) / fade)
    if t > DUR - 0.5:
        frame = Image.blend(frame, Image.new("RGB", (W, H), (5, 6, 13)), (t - (DUR - 0.5)) / 0.5)
    if current.get("shake") and (t - current["t0"]) < 0.35:
        dx = 2 if int((t - current["t0"]) * FPS) % 2 == 0 else -2
        frame = Image.new("RGB", (W, H), (5, 6, 13))
        shifted = render_shot(current, t)
        frame.paste(shifted, (dx, 0))
    return frame


def make_audio() -> None:
    import array
    import wave

    sr = 44100
    n = int(sr * DUR)
    ch = array.array("h", bytes(2 * n))
    for i in range(n):
        t = i / sr
        swell = 0.55 + 0.45 * math.sin(2 * math.pi * t / 14.0 - 1.2)
        pad = (
            0.30 * math.sin(2 * math.pi * 55.0 * t)
            + 0.22 * math.sin(2 * math.pi * 82.5 * t + 0.7)
            + 0.12 * math.sin(2 * math.pi * 110.0 * t + 1.9)
            + 0.05 * math.sin(2 * math.pi * 164.8 * t + 0.4)
        ) * swell
        thump = 0.0
        for mark in (18.1, 22.2, 45.2):
            dt = t - mark
            if 0 <= dt < 1.2:
                thump += 0.5 * math.exp(-dt * 5.5) * math.sin(2 * math.pi * 46 * dt)
        v = max(-1.0, min(1.0, (pad + thump) * 0.42))
        ch[i] = int(v * 32000)
    stereo = array.array("h", bytes(4 * n))
    for i in range(n):
        stereo[2 * i] = ch[i]
        stereo[2 * i + 1] = ch[i]
    AUDIO.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(AUDIO), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(stereo.tobytes())


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not AUDIO.exists():
        make_audio()
        print("audio ok")
    cmd = [
        "ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(AUDIO),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "144k",
        "-shortest", "-movflags", "+faststart", str(OUT),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    total = int(DUR * FPS)
    for i in range(total):
        proc.stdin.write(render(i / FPS).tobytes())
        if i % 120 == 0:
            print(f"frame {i}/{total}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("done", OUT, proc.returncode)


if __name__ == "__main__":
    main()
