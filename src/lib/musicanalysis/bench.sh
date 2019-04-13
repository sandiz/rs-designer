#!/bin/sh
echo "Pyinstaller:"
pyinstaller --onefile --windowed analysis.spec

echo "Cython:"
cython --embed -o build/analysis.c analysis.py

FILESIZE=$(stat -f%z "dist/analysis")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "dist/analysis size = $FILESIZE mb."

rm cqt.npy
gcc -Os -Ofast -I/usr/local/Cellar/python@2/2.7.16/Frameworks/Python.framework/Versions/2.7/include/python2.7 -I/usr/local/Cellar/python@2/2.7.16/Frameworks/Python.framework/Versions/2.7/include/python2.7 -L /usr/local/Frameworks/Python.framework/Versions/2.7/lib  -o dist/analysis-cy build/analysis.c  -lpthread -lm -lutil -lpython2.7 -ldl -framework CoreFoundation
FILESIZE=$(stat -f%z "dist/analysis-cy")
FILESIZE=$((FILESIZE / (1024 ) ))
echo "dist/analysis-cy size = $FILESIZE kb."
START=$(date +%s)
./dist/analysis-cy ~/Downloads/test-music/Ami\ Brishti\ Dekhechi\ Anjan\ Dutta.mp3
END=$(date +%s)
DIFF=$(echo "$END - $START" | bc)
echo $DIFF

FILESIZE=$(stat -f%z "cqt.npy")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "cqt.npy (cython) size = $FILESIZE mb."


rm cqt.npy
./dist/analysis ~/Downloads/test-music/Ami\ Brishti\ Dekhechi\ Anjan\ Dutta.mp3

FILESIZE=$(stat -f%z "cqt.npy")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "cqt.npy (pyinstall) size = $FILESIZE mb."

rm cqt.npy
python analysis.py ~/Downloads/test-music/Tumi\ Ashbe\ Bole\ Tai\ Anjan\ Dutta.mp3

FILESIZE=$(stat -f%z "cqt.npy")
FILESIZE=$((FILESIZE / (1024 * 1024) ))
echo "cqt.npy (python) size = $FILESIZE mb."