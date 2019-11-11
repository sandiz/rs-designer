import React, { Component } from 'react'
import { ToastContainer } from 'react-toastify';
import {
  Classes, FocusStyleManager, Dialog,
} from "@blueprintjs/core"
import { GlobalHotKeys } from 'react-hotkeys';

//import FPSMeter from './components/fpsmeter'
import MediaBar from './components/MediaBar/MediaBar'

import 'normalize.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import 'react-toastify/dist/ReactToastify.min.css';
import './css/App.scss'
import 'typeface-magra'
import 'typeface-inconsolata'
import { getHotkeyDialogContent } from './dialogs';
import { HotkeyInfo } from './types'

const { nativeTheme } = window.require("electron").remote;

interface AppState {
  darkMode: boolean;
  dialogContent: React.ReactElement | null;
  dialogClass: string;
}

class App extends Component<{}, AppState> {
  public keyMap = { SHOW_ALL_HOTKEYS: HotkeyInfo.SHOW_ALL_HOTKEYS.hotkey };

  public handlers = {
    SHOW_ALL_HOTKEYS: () => this.setState({ dialogContent: getHotkeyDialogContent(), dialogClass: Classes.HOTKEY_DIALOG }),
  }

  constructor(props: {}) {
    super(props);
    this.state = { darkMode: nativeTheme.shouldUseDarkColors, dialogContent: null, dialogClass: '' };
  }

  componentDidMount = async () => {
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
      <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
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
          <Dialog
            isOpen={this.state.dialogContent !== null}
            onClose={(): void => this.setState({ dialogContent: null })}
            className={this.state.dialogClass}
          >
            {this.state.dialogContent}
          </Dialog>

        </React.Fragment>
      </GlobalHotKeys>
    );
  }
}

export default App;
