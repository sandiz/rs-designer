#!/bin/sh
#echo "Pyinstaller:"
#pyinstaller --onefile --windowed analysis.spec

mkdir -p build
mkdir -p dist
echo "Cython:"
python3 -m cython --embed --verbose analysis.py -o build/analysis.c

echo "Compiling: "
gcc -Os -Ofast -I/usr/local/Cellar/python/3.7.5/Frameworks/Python.framework/Versions/3.7/include/python3.7m -L /usr/local/Frameworks/Python.framework/Versions/3.7/lib  -o dist/analysis-cy build/analysis.c  -lpthread -lm -lutil -lpython3.7 -ldl -framework CoreFoundation
FILESIZE=$(stat -f%z "dist/analysis-cy")
FILESIZE=$((FILESIZE / (1024 ) ))
echo "dist/analysis-cy size = $FILESIZE kb."

if [ $# -eq 0 ]
then
    /usr/bin/time -l ./dist/analysis-cy ~/Downloads/test-music/Reference\ Scales_On\ C.mp3 /tmp/ -1 1024 && open /tmp/cqt.raw.png
fi
