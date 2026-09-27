#!/usr/bin/env bash
# Rebuilds public/audio/ from the original CC0 sources (see README credits).
# Needs curl, unzip and a full ffmpeg (libmp3lame). Usage: tools/audio/build-audio.sh [workdir]
set -euo pipefail
WORK="${1:-$(mktemp -d)}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/public/audio"
mkdir -p "$WORK" "$OUT"
cd "$WORK"

kenney() { # pack slug → unzipped folder
  local url
  url=$(curl -sS "https://kenney.nl/assets/$1" | grep -oE "https://kenney.nl/media/pages/assets/$1/[^']+\.zip" | head -1)
  [ -d "$1" ] || { curl -sS -o "$1.zip" "$url" && unzip -qo "$1.zip" -d "$1"; }
}
kenney rpg-audio
kenney impact-sounds
kenney interface-sounds
kenney music-jingles

oga() { [ -f "$2" ] || curl -sS -o "$2" "https://opengameart.org/sites/default/files/$1"; }
oga northumberland_0.mp3 northumberland.mp3
oga park_ambience_wind.wav wind.wav
oga park_ambience_birds.wav birds.wav

sfx() { # source → name: mono MP3, loudness-matched
  ffmpeg -v error -y -i "$1" -af "loudnorm=I=-${3:-18}:TP=-2" -ac 1 -ar 44100 -b:a 64k "$OUT/$2.mp3"
}
R=rpg-audio/Audio I=impact-sounds/Audio U=interface-sounds/Audio J=music-jingles/Audio
sfx "$R/creak1.ogg" turn-1
sfx "$R/creak2.ogg" turn-2
sfx "$R/creak3.ogg" turn-3
sfx "$I/impactWood_light_001.ogg" settle
sfx "$R/bookFlip1.ogg" flip-1
sfx "$R/bookFlip2.ogg" flip-2
sfx "$I/impactWood_medium_000.ogg" land
sfx "$R/metalLatch.ogg" pinned
sfx "$R/handleSmallLeather.ogg" set-off
for n in 0 1 2 3 4; do sfx "$I/footstep_grass_00$n.ogg" "step-$n" 22; done
sfx "$R/bookClose.ogg" fold
sfx "$U/tick_002.ogg" tick 24
sfx "$U/click_002.ogg" toggle 22
sfx "$J/Pizzicato jingles/jingles_PIZZI16.ogg" route-open 20
sfx "$J/Pizzicato jingles/jingles_PIZZI07.ogg" arrive 19
sfx "$J/Steel jingles/jingles_STEEL07.ogg" finale 18

# Music: the whole piece, stereo, gently compressed in size.
ffmpeg -v error -y -i northumberland.mp3 -af "loudnorm=I=-20:TP=-2" -ac 2 -ar 44100 -b:a 64k "$OUT/music.mp3"

# Ambience: a seamless loop cut from each field recording (tail cross-faded into head).
loop() { # source start length fade name
  ffmpeg -v error -y -ss "$(($2 + $4))" -t "$3" -i "$1" -ac 1 -ar 44100 body.wav
  ffmpeg -v error -y -ss "$2" -t "$4" -i "$1" -ac 1 -ar 44100 head.wav
  ffmpeg -v error -y -i body.wav -i head.wav -filter_complex \
    "[0][1]acrossfade=d=$4:c1=tri:c2=tri,loudnorm=I=-26:TP=-6" -b:a 48k "$OUT/$5.mp3"
}
loop wind.wav 40 36 4 wind
loop birds.wav 60 48 4 birds

du -ch "$OUT"/*.mp3 | tail -1
