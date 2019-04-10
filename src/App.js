import React, { Component } from 'react'
import ControllerBar from './Components/ControllerBar/ControllerBar'
import WaveformBar from './Components/Waveform/WaveformBar'
import ControlsBar from './Components/Controls/ControlsBar'
import MusicInformationBar from './Components/Analysis/MusicInformationBar';
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  render = () => {
    return (
      <div>
        <ControllerBar />
        <div id="app-flex">
          <WaveformBar />
          <ControlsBar />
          <MusicInformationBar />
        </div>
      </div>
    );
  }
}

export default App;
