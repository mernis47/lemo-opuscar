# Schattenchronik – yerel bilgisayarda devam (ücretsiz)

Kanal: Almanca "Schattenchronik". Uzun video 16:9, 8–10 dk, çizgi roman tarzı; Short 9:16 ~1 dk, sonu "Folge Schattenchronik".
Kurallar: geçiş sesi yok, altyazı sese senkron, ambient_gain 0.0, sayılar `say` içinde yazıyla, sıkıştırılmış çıktı.
Her video YouTube'a yüklenince uzun video ve Short dosyaları sohbete de gönderilir (kullanıcı izlemek istiyor).

## Kurulum (bir kez)
- Python 3, Node.js, ffmpeg kurulu olmalı.
- `pip install edge-tts requests pillow numpy`
- `npm install playwright` ve `npx playwright install chromium` (video render için)

## Ses (ücretsiz, anahtarsız, doğal)
    python3 tools/free_voice.py bach_de --voice de-DE-ConradNeural --rate -6%
    python3 tools/build_audio.py bach_de
    node tools/render_reel.js bach_de --fps 25
    ffmpeg -i output/bach_de/bach_de.mp4 -c:v libx264 -preset slow -crf 31 -c:a aac -b:a 112k -movflags +faststart output/bach_de/marianne-bachmeier-de.mp4

## Görsel (ücretsiz, Artlist kredisi gelene kadar)
script.json satırlarına İngilizce `"prompt"` ekle, sonra:
    python3 tools/free_images.py <ep>
Stil: brand/stil_prompt.txt

## Sırada
- bach_de: yeni sesle yeniden render, kapak görselleri, youtube.txt (bölümlerle), Short (bach_short_de).
