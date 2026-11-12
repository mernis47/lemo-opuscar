set -e
until grep -q DONE /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/omni_ep.log; do grep -q Traceback /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/omni_ep.log && { echo LONGVOICE_FAIL; exit 1; }; sleep 20; done
echo LONGVOICE_DONE
cd /tmp && python3 /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/omni_ep.py bach_short_de > /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/omni_short.log 2>&1
echo SHORTVOICE_DONE
cd /home/user/mardin-3d-studio
python3 tools/build_audio.py bach_de > /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/build_long.log 2>&1
python3 tools/build_audio.py bach_short_de > /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/build_short.log 2>&1
node tools/render_reel.js bach_de --fps 25 > /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/render_long.log 2>&1
node tools/render_reel.js bach_short_de --fps 25 > /tmp/claude-0/-home-user-mardin-3d-studio/81ac86a6-265c-54aa-ba45-c520e5be568d/scratchpad/render_short.log 2>&1
echo RENDER_DONE
ffmpeg -y -loglevel error -i output/bach_de/bach_de.mp4 -c:v libx264 -preset slow -crf 31 -c:a aac -b:a 112k -movflags +faststart output/bach_de/marianne-bachmeier-de.mp4
ffmpeg -y -loglevel error -i output/bach_short_de/bach_short_de.mp4 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 112k -movflags +faststart output/bach_short_de/marianne-bachmeier-short-de.mp4
ls -la output/bach_de/marianne-bachmeier-de.mp4 output/bach_short_de/marianne-bachmeier-short-de.mp4
echo ALL_DONE
