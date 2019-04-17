#!/bin/sh
#echo "Pyinstaller:"
#pyinstaller --onefile --windowed analysis.spec

echo "Cython:"
cython --embed -o build/analysis.c analysis.py

gcc -Os -Ofast -I/usr/local/Cellar/python@2/2.7.16/Frameworks/Python.framework/Versions/2.7/include/python2.7 -I/usr/local/Cellar/python@2/2.7.16/Frameworks/Python.framework/Versions/2.7/include/python2.7 -L /usr/local/Frameworks/Python.framework/Versions/2.7/lib  -o dist/analysis-cy build/analysis.c  -lpthread -lm -lutil -lpython2.7 -ldl -framework CoreFoundation
FILESIZE=$(stat -f%z "dist/analysis-cy")
FILESIZE=$((FILESIZE / (1024 ) ))
echo "dist/analysis-cy size = $FILESIZE kb."

if [ $# -eq 0 ]
then
    /usr/bin/time -l ./dist/analysis-cy ~/Downloads/test-music/Ami\ Brishti\ Dekhechi\ Anjan\ Dutta.mp3 /tmp/ 10830 512
fi
