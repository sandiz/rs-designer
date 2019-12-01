import React from 'react';

export class SpectrogramTab extends React.Component<{}, {}> {
    componentDidMount() {
        console.log("Asd")
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
