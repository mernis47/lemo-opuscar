import sys, json, os, time, subprocess, torch, soundfile as sf
sys.path.insert(0, '/home/user/ext/VoiceStudio')
from omnivoice.models.omnivoice import OmniVoice
torch.set_num_threads(4)
ep = sys.argv[1]
only = {int(x) for x in sys.argv[2].split(',')} if len(sys.argv) > 2 else None
EP = f'/home/user/mardin-3d-studio/episodes/{ep}'
REF = '/tmp/omni_storyteller.wav'
REF_TEXT = "Eine Mutter zieht im Gerichtssaal eine Pistole. Und richtet sie auf den Mann, der ihre Tochter auf dem Gewissen hat. Acht Schüsse fallen. Sieben davon treffen."
m = OmniVoice.from_pretrained('/home/user/ext/omnivoice_model', device_map='cpu', dtype=torch.float32)
lines = json.load(open(f'{EP}/script.json'))['lines']
os.makedirs(f'{EP}/voice', exist_ok=True)
for i, l in enumerate(lines, 1):
    if only and i not in only: continue
    txt = (l.get('say') or l['text']).replace('–', ',')
    t = time.time()
    a = m.generate(text=txt, language='German', ref_audio=REF, ref_text=REF_TEXT, speed=0.95, num_step=20)
    w = a[0] if isinstance(a, (list, tuple)) else a
    w = w.squeeze().cpu().numpy() if hasattr(w, 'cpu') else w
    sf.write('/tmp/ov.wav', w, 24000)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i','/tmp/ov.wav','-af','highpass=f=70,loudnorm=I=-16:TP=-1.5','-ar','44100','-b:a','160k',f'{EP}/voice/{i:02d}.mp3'], check=True)
    print(f'{i}/{len(lines)} {time.time()-t:.0f}s', flush=True)
print('DONE', flush=True)
