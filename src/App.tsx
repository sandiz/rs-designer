import React, { Component } from 'react'
import {
  Classes, FocusStyleManager, Dialog, Card,
} from "@blueprintjs/core"
import { GlobalHotKeys } from 'react-hotkeys';
import classNames from 'classnames';
import MediaController from './components/MediaController/MediaController'

import 'normalize.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import './css/App.scss'
import 'typeface-magra'
import 'typeface-inconsolata'
import { getHotkeyDialogContent } from './dialogs';
import { HotkeyInfo } from './types'
import WaveformController from './components/WaveformController/WaveformController';
import { fpsize } from './lib/utils';

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
    fpsize();
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
          <div>
            <Card elevation={0} id="memory" className={classNames("memory-meter", "number")}>0 / 0 mb</Card>
            <Card elevation={0} id="fps" className={classNames("fps-meter", "number")}>0 fps</Card>
          </div>
          <div id="content">
            <WaveformController />
          </div>
          <MediaController />
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
