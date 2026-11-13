#!/usr/bin/env bash
# Сборка фигурок в фоновом Blender: ./tools/models/build.sh [s56,funicular,...]
BLENDER="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.0/blender.exe}"
TUMAN_ONLY="$1" "$BLENDER" -b --factory-startup -P "$(dirname "$0")/build_landmarks.py" 2>&1 | grep -E "built:|Error|Traceback|line [0-9]+" 
