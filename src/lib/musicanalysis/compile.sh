#!/bin/sh
#echo "Pyinstaller:"
#pyinstaller --onefile --windowed analysis.spec


mkdir -p build
mkdir -p dist
echo "pyinstaller:"
pyinstaller --onefile --noconfirm --clean --upx-dir=/usr/local/Cellar/upx/3.95_1/bin --noconsole --additional-hooks-dir /Users/sandi/Projects/rs-designer/src/lib/musicanalysis --osx-bundle-identifier com.sandiz.rsdesigner  music-analysis.spec

#echo "Cython:"
#python3 -m cython --embed --verbose music-analysis.py -o build/music-analysis.c

#echo "Compiling: "
#gcc -Os -Ofast -I/usr/local/Cellar/python/3.7.5/Frameworks/Python.framework/Versions/3.7/include/python3.7m -L /usr/local/Frameworks/Python.framework/Versions/3.7/lib  -o dist/music-analysis-cy build/music-analysis.c  -lpthread -lm -lutil -lpython3.7 -ldl -framework CoreFoundation
FILESIZE=$(stat -f%z "dist/music-analysis")
FILESIZE=$((FILESIZE / (1024 * 1024 ) ))
echo "dist/music-analysis size = $FILESIZE mb."

if [ $1 -eq "--bench" ]
then
    /usr/bin/time -l ./dist/music-analysis -f ~/Downloads/test-music/Boondein.rsdbundle/media.mp3 --type bench 2>/dev/null
fi
