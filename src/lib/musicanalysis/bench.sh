#!/bin/sh


FILESIZE=$(stat -f%z "dist/analysis")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "dist/analysis size = $FILESIZE mb."

./dist/analysis ~/Downloads/test-music/Ami\ Brishti\ Dekhechi\ Anjan\ Dutta.mp3

FILESIZE=$(stat -f%z "cqt.npy")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "cqt.npy (binary) size = $FILESIZE mb."

python analysis.py ~/Downloads/test-music/Tumi\ Ashbe\ Bole\ Tai\ Anjan\ Dutta.mp3

FILESIZE=$(stat -f%z "cqt.npy")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "cqt.npy (python) size = $FILESIZE mb."