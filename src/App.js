import React, { Component } from 'react'
import ControllerBar from './components/ControllerBar/ControllerBar'
import WaveformBar from './components/Waveform/WaveformBar'
import ControlsBar from './components/Controls/ControlsBar'
import AnalysisBar from './components/Analysis/AnalysisBar';
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'
import { Dispatcher } from './lib/libDispatcher';

const ipcRenderer = window.require("electron").ipcRenderer;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  componentDidMount() {
    ipcRenderer.on('keyboard-shortcut', (e, d) => {
      Dispatcher.dispatch(d, null);
    });
  }

  render = () => {
    return (
      <div>
        <ControllerBar />
        <div id="app-flex">
          <WaveformBar />
          <ControlsBar />
          <AnalysisBar />
        </div>
      </div>
    );
  }
}

export default App;
