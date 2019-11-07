import React, { Component } from 'react'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import FPSMeter from './components/fpsmeter'
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'
import { DispatcherService, DispatchEvents } from './services/dispatcher';
import ForageService, { SettingsForageKeys } from './services/forage';

require('typeface-roboto-condensed')

const ipcRenderer = window.require("electron").ipcRenderer;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      control: { idx: "a", checked: true },
      waveform: { idx: "b", checked: true },
      chromagram: { idx: "c", checked: true },
    };
    this.enableKbdShortcuts = true;
  }

  componentDidMount() {
    ipcRenderer.on('keyboard-shortcut', (e, d) => {
      if (this.enableKbdShortcuts) {
        DispatcherService.dispatch(d, null);
      }
    });
    window.addEventListener('keypress', (e) => {
      if (e.keyCode === 32 && this.enableKbdShortcuts) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    })
    DispatcherService.on(DispatchEvents.EnableShortcuts, () => { this.enableKbdShortcuts = true });
    DispatcherService.on(DispatchEvents.DisableShortcuts, () => { this.enableKbdShortcuts = false });
    DispatcherService.on(DispatchEvents.SettingsUpdate, this.settingsUpdate);
    this.settingsUpdate({ key: SettingsForageKeys.APP_SETTINGS }, null);
  }

  settingsUpdate = async (k) => {
    if (k.key === SettingsForageKeys.APP_SETTINGS) {
      const appsettings = await ForageService.get(SettingsForageKeys.APP_SETTINGS);
      if (!appsettings) return;
      const layouts = appsettings.layouts;
      for (let i = 0; i < layouts.length; i += 1) {
        const item = layouts[i];
        let alphaIdx = "";
        alphaIdx = String.fromCharCode(97 + i)
        switch (item.id) {
          case "control":
            {
              const li = { ...this.state.control }
              li.idx = alphaIdx
              li.checked = item.checked
              this.setState({ control: li })
            }
            break;
          case "waveform":
            {
              const li = { ...this.state.waveform }
              li.idx = alphaIdx
              li.checked = item.checked
              this.setState({ waveform: li })
            }
            break;
          case "chromagram":
            {
              const li = { ...this.state.chromagram }
              li.idx = alphaIdx
              li.checked = item.checked
              this.setState({ chromagram: li })
            }
            break;
          default:
            break;
        }
      }
    }
  }

  render = () => {
    return (
      <React.Fragment>
        <div id="none" />
        <FPSMeter />
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
      </React.Fragment>
    );
  }
}

export default App;
