<p align="center">
<img width="12.5%" src="https://github.com/sandiz/rs-designer/raw/master/src/assets/icons/icon-1024x1024.png">
</p>

# Meend
music transcription app & rocksmith cdlc generator (pre alpha WIP)

Combines best features of [Capo](http://supermegaultragroovy.com/products/capo/mac/) and [Editor on Fire](https://github.com/raynebc/editor-on-fire)

# roadmap
- TODO
    - cqt
        - click to seek
        - note hover
        - tranpose 
    - detune/playback rate
    - analysis
        - chord, downbeat uses python
            - investigate py-to-wasm, pyinstaller, cython, python freeze
        - convert to essentia (cqt, beats, bpm, ~~key~~)
        - convert essentia c++ to wasm
            - break into web workers so we can process them as soon as its done

        - adhoc analysis, disable analysis if section is disabled
        - https://code.soundsoftware.ac.uk/projects/constant-q-cpp
        - https://www.upf.edu/web/mtg/melodia
        - http://www.isophonics.net/nnls-chroma
        - https://github.com/DavideBusacca/AudioDSP/blob/master/HPSS/HPSS.py
        - https://librosa.github.io/librosa/generated/librosa.decompose.hpss.html
        - https://aubio.org/ (https://news.ycombinator.com/item?id=19681804)
        - https://www.analyticsvidhya.com/blog/2018/01/10-audio-processing-projects-applications/ (whitepapers)
    - misc
        - soundtouch worklet
    - chord tip bar info


- NEXT  
    https://grunfy.com/scaler.html
    - guitar tab interface (https://github.com/calesce/tab-editor/ https://github.com/CoderLine/alphaTab) (http://www.guitk.com/editor/)
        - https://opensheetmusicdisplay.github.io/
        - https://wim.vree.org/js/ (vexflow/musicxml)
    - export to psarc/cdlc
    - guitar tuner
    - song playback
        - https://github.com/jussi-kalliokoski/audiolib.js
        - https://tonejs.github.io/
        - pydub
    - ML based stem isolation
    - ML based vocal separation
    - ML based melody detection


- FUTURE
    - external input guitar (https://wasabi.i3s.unice.fr/AmpSimFA/)
    - external input piano (https://gogul09.github.io/software/deep-drum)
    - time signature warp (https://arrow.dit.ie/cgi/viewcontent.cgi?article=1080&context=argcon)
    - MIDI GUITAR 2/guitar midi input (https://www.jamorigin.com/products/)


- MVP
    - Basic Scene with simple mp3 spectrogram/freq + guitar/bass/rhythm path
    - Save to psarc

- landing page
    - example (https://www.sqlgate.com/product/main-features)



# dev instructions
- clone forked wavesurfer
    - git clone https://github.com/sandiz/wavesurfer.js 
    - cd wavesurfer
    - switch to (broken-ww) branch (latest master, barWidth broken)
    - yarn install
    - yarn run build
    - yarn link
- clone rs-designer
    - git clone https://github.com/sandiz/rs-designer
    - yarn link wavesurfer.js
    - yarn install
- yarn start

- libraries to check for pr/updates
    - madmom
    - essentia
    - librosa
    - wavesurfer