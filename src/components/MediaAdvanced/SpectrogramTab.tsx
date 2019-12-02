import React from 'react';

export class SpectrogramTab extends React.Component<{}, {}> {
    componentDidMount = async () => {
        console.log("Asd")
        const wasm = await import('../../lib/musicanalysis/cqt/meend-core');
        console.log(wasm);
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
