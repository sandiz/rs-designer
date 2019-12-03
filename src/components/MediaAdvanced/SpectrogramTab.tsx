import React from 'react';
import MediaPlayerService from '../../services/mediaplayer';

export class SpectrogramTab extends React.Component<{}, {}> {
    componentDidMount = async () => {
        const CQT_INIT = MediaPlayerService.getCQTProvider("cqt_init");
        if (!CQT_INIT) return console.error("cqt provider entry point not found", "cqt_init");
        const db = 32;
        const supersample = 0;
        const cqtBins = 1000;
        //                MIDI note  16 ==   20.60 hz
        // Piano key  1 = MIDI note  21 ==   27.50 hz
        // Piano key 88 = MIDI note 108 == 4186.01 hz
        //                MIDI note 127 == 12543.8 hz
        const fMin = 25.95;
        const fMax = 4504.0;
        const cqtSize = CQT_INIT(44100, cqtBins, db, fMin, fMax, supersample);
        console.log('cqtSize:', cqtSize);
        if (!cqtSize) throw Error('Error initializing constant Q transform.');
        return true;
    }

    /*   loadWasm = async () => {
          try {
              const wasm = await import("cqt-core");
              console.log(wasm);
          } catch (err) {
              console.error(`Unexpected error in loadWasm. [Message: ${err.message}]`);
          }
      }; */

    render = () => {
        return (
            <div />
        )
    }
}

export default SpectrogramTab;
