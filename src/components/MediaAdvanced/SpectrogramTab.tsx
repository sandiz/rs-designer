import React from 'react';
//import await { add } from "./add.wasm";
import add from './add.wasm';

export class SpectrogramTab extends React.Component<{}, {}> {
    componentDidMount = async () => {
        console.log("Asd")
        console.log(add);
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
