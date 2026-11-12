#!/usr/bin/env python3
"""Ücretsiz, kotasız yerel görsel üretimi (SDXL-Turbo, CPU). Her satırın "prompt" alanından bir görsel.

Kullanım: python3 tools/sdxl_images.py <ep> [--force] [--only 3,7] [--steps 2]
Model:    /home/user/ext/sdxl_turbo (huggingface stabilityai/sdxl-turbo, fp16 dosyaları)
Çıktı:    episodes/<ep>/<img> 1920x1080 (1024x576 üretilip büyütülür). Var olanları atlar.
"""
import argparse, json, os, sys, time, torch
from diffusers import AutoPipelineForText2Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("moody hand-drawn comic book illustration, graphic novel, bold clean ink outlines, "
         "painterly shading, cinematic lighting, muted desaturated palette, dark atmosphere")
NEG = "text, letters, watermark, logo, blurry, deformed, extra fingers, gore, blood"

ap = argparse.ArgumentParser()
ap.add_argument("ep"); ap.add_argument("--force", action="store_true"); ap.add_argument("--only")
ap.add_argument("--steps", type=int, default=6); ap.add_argument("--cfg", type=float, default=1.0)
ap.add_argument("--model", default="/home/user/ext/dsxl_light", help="dsxl_light (DreamShaper XL Lightning, besser) oder sdxl_turbo (schneller)")
ap.add_argument("--style", type=float, default=0.6, help="Stärke der Stil-Referenz (alte Artlist-Bilder), 0 = aus")
ap.add_argument("--ref", default="episodes/bach_de/img/B60.jpg")
ap.add_argument("--portrait", action="store_true", help="9:16 (Short)")
a = ap.parse_args()

ep = os.path.join(ROOT, "episodes", a.ep)
lines = json.load(open(os.path.join(ep, "script.json"), encoding="utf-8"))["lines"]
only = {int(x) for x in a.only.split(",")} if a.only else None
torch.set_num_threads(os.cpu_count() or 4)
kw = {}
if a.style > 0:
    from transformers import CLIPVisionModelWithProjection
    kw["image_encoder"] = CLIPVisionModelWithProjection.from_pretrained("/home/user/ext/ipadapter/models/image_encoder", torch_dtype=torch.bfloat16)
pipe = AutoPipelineForText2Image.from_pretrained(a.model, torch_dtype=torch.bfloat16, variant="fp16", **kw)
REF = None
if a.style > 0:
    from PIL import Image
    pipe.load_ip_adapter("/home/user/ext/ipadapter", subfolder="sdxl_models", weight_name="ip-adapter_sdxl_vit-h.safetensors", image_encoder_folder=None)
    pipe.set_ip_adapter_scale({"up": {"block_0": [0.0, a.style, 0.0]}})
    REF = Image.open(os.path.join(ROOT, a.ref)).convert("RGB").resize((1024, 576))
if "turbo" in a.model:
    a.steps, a.cfg = min(a.steps, 2), 0.0
else:
    from diffusers import DPMSolverMultistepScheduler
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True, algorithm_type="sde-dpmsolver++")
W, H, OW, OH = (576, 1024, 1080, 1920) if a.portrait else (1024, 576, 1920, 1080)
for i, l in enumerate(lines, 1):
    if (only and i not in only) or not l.get("prompt"):
        continue
    out = os.path.join(ep, l["img"])
    if os.path.exists(out) and not a.force:
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    t = time.time()
    g = torch.Generator().manual_seed(1000 + i)
    im = pipe(prompt=f"{l['prompt']}. {STYLE}", negative_prompt=NEG, num_inference_steps=a.steps,
              guidance_scale=a.cfg, width=W, height=H, generator=g,
              **({"ip_adapter_image": REF} if REF is not None else {})).images[0]
    im.resize((OW, OH)).save(out, quality=93)
    print(f"{i}/{len(lines)} {time.time()-t:.0f}s", flush=True)
print("DONE", flush=True)
