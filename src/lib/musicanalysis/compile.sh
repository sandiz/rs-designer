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

if [[ $# -gt 0 ]];
then 
    if [ $1 == "--bench" ]
    then
        echo "[music-analysis] testing for single file input:"
        ./dist/music-analysis --type key --algo key_essentia --file test/scales.mp3 2>/dev/null | jq '.[0] + " " + .[1]'
        if [ $? -eq 0 ]
        then
            echo "[music-analysis] testing all algos:"
            ./dist/music-analysis --type bench --results test/results.json 2>/dev/null
            if [ $? -eq 0 ]
            then    
                echo "[music-analysis] tests complete"
                exit 0
            else 
                echo "[music-analysis] bench test failed"
                exit 1
            fi
        else
            echo "[music-analysis] single file test failed"
            exit 1
        fi
    fi
fi
