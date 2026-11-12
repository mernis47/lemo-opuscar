# KUYUNUN SESİ — 2D animasyonlu korku serisi (4 bölüm)

Kodla çizilmiş 2D animasyon, Türkçe seslendirme (Artlist), 16:9 / 1080p, her bölüm 3 dakika.
Anlatıcı izleyiciye **“sen”** diye seslenir: sanki biri sana kendi hayatını anlatıyor.
Her cümlenin kendi sahnesi vardır; ekranda görünen, o an söylenen cümledir.

| # | Bölüm | Özet |
|---|-------|------|
| 1 | **Cevap Verme** | Rojhat ninesinin cenazesi için Mardin'deki terk edilmiş köye döner. Gece kuyudan ninesinin sesi gelir. Ninesi “seslenirlerse cevap verme” demişti. Cevap verir ve kuyuya çekilir. |
| 2 | **Ayna** | Kuyudan Rojhat'ın yüzünü taşıyan bir şey çıkar ve onun hayatını yaşamaya başlar. Rojhat aynaların içinde hapsolur, sonunda o şeyi aynaya çekip kurtulur. Ama yansıması hâlâ gülümser. |
| 3 | **Ölülerin Düğünü** | Kırk yıl önceki bir tarihe ait düğün davetiyesi gelir. Köyde yüzsüz kayıpların halayı, kuyunun başında genç Hezal (nine). Anlatıcının kim olduğu ortaya çıkar: kırk yıl önce cevap veren damat, yani Rojhat'ın dedesi. |
| 4 | **Senin Adın** | Ninenin sandıkta bıraktığı mektup: doğduğunda kulağına fısıldanan ikinci, gizli ad. Kuyu bilmediği adı tutamaz. Kayıplar döner, düğün tamamlanır. Final izleyiciye: “Bu gece saat üçte biri seni adınla çağırırsa... cevap verme.” |

## Yapı

```
engine/draw.js           ortak 2D çizim kütüphanesi (siluetler, kuyu, taş evler, film efekti)
engine/kit.js            2-4. bölüm parçaları (ayna, yüz, halay, gelin, davetiye, sandık)
engine/player.js         zaman çizelgesine göre kare çizer (oynatıcı ve render ortak)
episodes/epN/script.json bölüm metni: her satır = bir cümle + bir sahne (+ses efekti)
episodes/epN/scenes.js   bölümün sahneleri
episodes/epN/voice/      Artlist seslendirmeleri (NN.mp3)
episodes/epN/SENARYO.md  okunabilir senaryo
tools/build_audio.py     ses + ambiyans + efekt + altyazı + zaman çizelgesi (3:00'e sığdırır)
tools/render.js          MP4 render (Playwright + ffmpeg), varsayılan 1920x1080
tools/fetch_voices.py    Artlist seslerini indirir
tools/join.sh            4 bölümü tek videoda birleştirir
output/epN/epN.mp4       bitmiş bölümler (Türkçe altyazılı)
```

## Çalıştırma

```bash
python3 tools/build_audio.py ep1          # ses, zamanlama, altyazı
node tools/render.js ep1                  # output/ep1/ep1.mp4 (1080p, altyazılı)
node tools/render.js ep1 --subs none      # altyazısız
tools/join.sh                             # output/kuyunun-sesi-tum-bolumler.mp4
```

Seslendirme: anlatıcı **Shadow**, nine **Charmed** (Artlist, Türkçe).
Bir cümleyi değiştirmek için `script.json`'u düzenleyip o satırın sesini yeniden üretin
(ya da `voice/NN.mp3` dosyasını kendi kaydınızla değiştirin), sonra build + render.
