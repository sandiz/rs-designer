<p align="center">
<img width="12.5%" src="https://github.com/sandiz/rs-designer/raw/master/src/assets/icons/icon-1024x1024.png">
</p>

# Rocksmith Designer
rs-designer - rocksmith cdlc generator and music transcription tool (pre alpha WIP)

Combines best features of [Capo](http://supermegaultragroovy.com/products/capo/mac/) and [Editor on Fire](https://github.com/raynebc/editor-on-fire)

TODO

- cqt
    - colormap/cqtjs
    - canvas piano bar 
    - time bar
    - copy timeline plugin
    - wasm

-analysis
   - wavesurfer wave dump
   - resample in binary 
   - resample/save to image

- post madmom
    - chord bar
    - downbeat bar


NEXT

- guitar tab interface (https://github.com/calesce/tab-editor/ https://github.com/CoderLine/alphaTab) (http://www.guitk.com/editor/)
https://opensheetmusicdisplay.github.io/
https://wim.vree.org/js/ (vexflow/musicxml)
- export to psarc/cdlc
- song playback
  - https://github.com/jussi-kalliokoski/audiolib.js
  - https://tonejs.github.io/
  - pydub


FUTURE
- external input guitar (https://wasabi.i3s.unice.fr/AmpSimFA/)
- external input piano (https://gogul09.github.io/software/deep-drum)
- time signature warp (https://arrow.dit.ie/cgi/viewcontent.cgi?article=1080&context=argcon)


MVP
- Basic Scene with simple mp3 spectrogram/freq + guitar/bass/rhythm path
- Save to psarc


dev instructions
- clone forked wavesurfer
    - git clone https://github.com/sandiz/wavesurfer.js
    - cd wavesurfer
    - yarn install
    - yarn run build
    - yarn link
- clone rs-designer
    - git clone https://github.com/sandiz/rs-designer
    - yarn link wavesurfer.js
    - yarn install
- yarn start