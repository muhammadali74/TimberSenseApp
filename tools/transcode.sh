#!/usr/bin/env bash
# Transcode a capture video (e.g. 4K HEVC, which Chrome can't reliably play) into web-friendly
# H.264 renditions + a poster frame.
#
#   tools/transcode.sh <input.mp4> <out_dir> [name]
#
# Writes <out_dir>/<name>_1080.mp4, <name>_720.mp4 and <name>_poster.jpg (name defaults to "front").
# Uses NVIDIA NVENC when available, otherwise libx264. +faststart lets the browser seek before download ends.
set -euo pipefail

in="${1:?usage: transcode.sh <input.mp4> <out_dir> [name]}"
out="${2:?usage: transcode.sh <input.mp4> <out_dir> [name]}"
name="${3:-front}"
mkdir -p "$out"

if ffmpeg -hide_banner -loglevel error -f lavfi -i nullsrc=s=256x256:d=0.1 -c:v h264_nvenc -f null - 2>/dev/null; then
  enc=(-c:v h264_nvenc -preset p5 -rc vbr -profile:v high -pix_fmt yuv420p)
  q1080=(-cq 25 -b:v 6M -maxrate 9M -bufsize 12M)
  q720=(-cq 27 -b:v 3M -maxrate 4.5M -bufsize 6M)
  echo "encoder: h264_nvenc"
else
  enc=(-c:v libx264 -preset medium -profile:v high -pix_fmt yuv420p)
  q1080=(-crf 23 -maxrate 9M -bufsize 12M)
  q720=(-crf 25 -maxrate 4.5M -bufsize 6M)
  echo "encoder: libx264"
fi

# Keyframe every 1 s (15 fps source) so scrubbing the replay timeline seeks quickly.
pre=(-hide_banner -loglevel warning -stats -y)
post=(-an -movflags +faststart -g 15 -keyint_min 15)

ffmpeg "${pre[@]}" -i "$in" -vf "scale=-2:1080" "${enc[@]}" "${q1080[@]}" "${post[@]}" "$out/${name}_1080.mp4"
ffmpeg "${pre[@]}" -i "$in" -vf "scale=-2:720" "${enc[@]}" "${q720[@]}" "${post[@]}" "$out/${name}_720.mp4"
ffmpeg -hide_banner -loglevel error -y -ss 2 -i "$in" -frames:v 1 -vf "scale=-2:720" -q:v 3 "$out/${name}_poster.jpg"

ls -la "$out"/"${name}"_*
