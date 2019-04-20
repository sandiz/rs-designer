import React, { Component } from 'react'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import ControllerBar from './components/ControllerBar/ControllerBar'
import WaveformBar from './components/Waveform/WaveformBar'
import ControlsBar from './components/Controls/ControlsBar'
import AnalysisBar from './components/Analysis/AnalysisBar';
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'
import { DispatcherService } from './services/dispatcher';

require('typeface-roboto-condensed')

const ipcRenderer = window.require("electron").ipcRenderer;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  componentDidMount() {
    ipcRenderer.on('keyboard-shortcut', (e, d) => {
      DispatcherService.dispatch(d, null);
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
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnVisibilityChange
          draggable
          pauseOnHover
          className="toast-container"
          toastClassName="dark-toast"
        />
      </div>
    );
  }
}

export default App;
