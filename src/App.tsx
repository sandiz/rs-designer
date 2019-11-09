import React, { Component } from 'react'
import { ToastContainer } from 'react-toastify';
import { Classes, FocusStyleManager } from "@blueprintjs/core"

//import FPSMeter from './components/fpsmeter'
import MediaBar from './components/MediaBar/MediaBar'

import 'normalize.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import 'react-toastify/dist/ReactToastify.min.css';
import './css/App.scss'
import 'typeface-magra'
import 'typeface-inconsolata'

const { nativeTheme } = window.require("electron").remote;

interface AppState {
  darkMode: boolean;
}

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = { darkMode: nativeTheme.shouldUseDarkColors };
    console.log("dark theme", nativeTheme.shouldUseDarkColors);
  }

  componentDidMount = (): void => {
    nativeTheme.on('updated', this.changeAppColor);
    FocusStyleManager.onlyShowFocusOnTabs();
  }

  componentWillUnmount = (): void => {
    nativeTheme.off('updated', this.changeAppColor);
  }

  changeAppColor = (): void => {
    this.setState({ darkMode: nativeTheme.shouldUseDarkColors });
  }

  render = (): React.ReactNode => {
    document.body.className = "app-body " + ((this.state.darkMode) ? Classes.DARK : "");
    return (
      <React.Fragment>
        <div id="content" />
        <MediaBar />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
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
