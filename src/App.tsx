import React, { Component } from 'react'
import {
  Classes, FocusStyleManager, Dialog,
} from "@blueprintjs/core"
import { IconNames } from '@blueprintjs/icons';
import { GlobalHotKeys } from 'react-hotkeys';
import MediaController from './components/MediaController/MediaController'

import 'normalize.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import './css/App.scss'
import 'typeface-magra'
import 'typeface-inconsolata'

import { getHotkeyDialog } from './dialogs';
import { HotkeyInfo, ProjectDetails, DialogContent } from './types'
import Waveform from './components/Waveform/Waveform';
import { fpsize } from './lib/utils';
import { DispatcherService, DispatchEvents, DispatchData } from './services/dispatcher';
import ProjectService from './services/project';
import MediaPlayerService from './services/mediaplayer';
import InfoPanel from './components/InfoPanel/InfoPanel';

const { nativeTheme } = window.require("electron").remote;

interface AppState {
  darkMode: boolean;
  dialogContent: DialogContent | null;
  project: ProjectDetails;
}

const AppDestructor = () => {
  MediaPlayerService.destructor();
  ProjectService.destructor();
}

class App extends Component<{}, AppState> {
  public keyMap = {
    SHOW_ALL_HOTKEYS: HotkeyInfo.SHOW_ALL_HOTKEYS.hotkey,
  };

  public handlers = {
    SHOW_ALL_HOTKEYS: () => this.setState({ dialogContent: getHotkeyDialog() }),
  }

  constructor(props: {}) {
    super(props);
    this.state = {
      darkMode: nativeTheme.shouldUseDarkColors,
      dialogContent: null,
      project: { loaded: false, metadata: null },
    };
  }

  componentDidMount = () => {
    DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
    DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectOpened);
    DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
    DispatcherService.on(DispatchEvents.OpenDialog, this.openDialog);
    DispatcherService.on(DispatchEvents.CloseDialog, this.closeDialog);
    nativeTheme.on('updated', this.changeAppColor);
    FocusStyleManager.onlyShowFocusOnTabs();
    fpsize();
  }

  componentWillUnmount = (): void => {
    DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
    DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
    nativeTheme.off('updated', this.changeAppColor);
    AppDestructor();
  }

  changeAppColor = (): void => {
    this.setState({ darkMode: nativeTheme.shouldUseDarkColors });
  }

  projectOpened = async () => {
    const project: ProjectDetails = {
      loaded: true,
      metadata: await ProjectService.getProjectMetadata(),
    }
    this.setState({ project });
  }

  projectClosed = () => {
    const project: ProjectDetails = {
      loaded: false,
      metadata: null,
    }
    this.setState({ project });
  }

  openDialog = (data: DispatchData) => {
    const d = data as DialogContent;
    this.setState({ dialogContent: d });
  }

  closeDialog = () => {
    if (this.state.dialogContent) {
      this.state.dialogContent.onClose();
      this.setState({ dialogContent: null });
    }
  }

  render = (): React.ReactNode => {
    document.body.className = "app-body " + ((this.state.darkMode) ? Classes.DARK : "");
    return (
      <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
        <React.Fragment>
          <InfoPanel project={this.state.project} />
          <div id="content">
            <Waveform />
          </div>
          <MediaController />
          <Dialog
            isOpen={this.state.dialogContent !== null}
            onClose={this.closeDialog}
            className={this.state.dialogContent ? this.state.dialogContent.class : ""}
            isCloseButtonShown
            lazy
            title={this.state.dialogContent ? this.state.dialogContent.text : ""}
            icon={this.state.dialogContent ? this.state.dialogContent.icon : IconNames.NOTIFICATIONS}
            canOutsideClickClose={this.state.dialogContent ? this.state.dialogContent.canOutsideClickClose : true}
            canEscapeKeyClose={this.state.dialogContent ? this.state.dialogContent.canEscapeKeyClose : true}
          >
            {
              this.state.dialogContent
                ? this.state.dialogContent.content
                : null
            }
          </Dialog>
        </React.Fragment>
      </GlobalHotKeys>
    );
  }
}

export default App;
