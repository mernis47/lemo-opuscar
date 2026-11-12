#!/usr/bin/env bash
# 4 bölümü tek videoda birleştirir: output/kuyunun-sesi-tum-bolumler.mp4
set -e
cd "$(dirname "$0")/.."
list=$(mktemp)
for n in 1 2 3 4; do echo "file '$PWD/output/ep$n/ep$n.mp4'" >> "$list"; done
ffmpeg -y -f concat -safe 0 -i "$list" -c copy -movflags +faststart output/kuyunun-sesi-tum-bolumler.mp4
rm -f "$list"
