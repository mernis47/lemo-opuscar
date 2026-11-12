#!/bin/bash
# Kullanım: tools/run_episode.sh <uzun_ep> <short_ep> [konuşma_hızı]
# Sırayla: ses (uzun+short) → görseller (uzun+short) → ses/zaman çizelgesi → render → sıkıştırma.
set -e
EP=$1; SH=$2; export SPEED=${3:-0.92}
ROOT=$(cd "$(dirname "$0")/.." && pwd); LOG=$ROOT/output/_logs; mkdir -p $LOG; cd $ROOT
python3 tools/omni_voice.py $EP > $LOG/$EP.voice.log 2>&1; echo VOICE_LONG
python3 tools/omni_voice.py $SH > $LOG/$SH.voice.log 2>&1; echo VOICE_SHORT
python3 tools/sdxl_images.py $EP --style 0.6 > $LOG/$EP.img.log 2>&1; echo IMG_LONG
python3 tools/sdxl_images.py $SH --style 0.6 --portrait > $LOG/$SH.img.log 2>&1; echo IMG_SHORT
for e in $EP $SH; do python3 tools/build_audio.py $e > $LOG/$e.build.log 2>&1; node tools/render_reel.js $e --fps 25 > $LOG/$e.render.log 2>&1; done
ffmpeg -y -loglevel error -i output/$EP/$EP.mp4 -c:v libx264 -preset slow -crf 31 -c:a aac -b:a 112k -movflags +faststart output/$EP/$EP-final.mp4
ffmpeg -y -loglevel error -i output/$SH/$SH.mp4 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 112k -movflags +faststart output/$SH/$SH-final.mp4
echo ALL_DONE
