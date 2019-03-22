import React, { Component } from 'react'
import ControllerBar from './Components/ControllerBar'
import WaveformBar from './Components/WaveformBar'
import ControlsBar from './Components/ControlsBar'
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'
import MusicInformationBar from './Components/MusicInformationBar';

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
