import React, { Suspense } from 'react'
import {
  Classes, FocusStyleManager, Dialog,
} from "@blueprintjs/core"
import { IconNames } from '@blueprintjs/icons';
import { GlobalHotKeys } from 'react-hotkeys';
import MediaController from './components/MediaController/MediaController';
import ErrorBoundary from './components/ErrorBoundary';

import 'normalize.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import './css/App.scss'
import 'typeface-magra'
import 'typeface-inconsolata'

import { getHotkeyDialog, getMetadataEditorDialog, getImportUrlDialog } from './dialogs';
import {
  HotkeyInfo, ProjectDetails, DialogContent, HotKeyComponent, HotKeyState,
} from './types'
import { fpsize } from './lib/utils';
import { DispatcherService, DispatchEvents, DispatchData } from './services/dispatcher';
import ProjectService, { ProjectUpdateType } from './services/project';
import MediaPlayerService from './services/mediaplayer';
import InfoPanel from './components/InfoPanel/InfoPanel';
import Waveform from './components/Waveform/Waveform';

const TabEditor = React.lazy(() => import("./components/TabEditor/TabEditor"));

const { nativeTheme } = window.require("electron").remote;

interface AppState extends HotKeyState {
  darkMode: boolean;
  dialogContent: DialogContent | null;
  project: ProjectDetails;
}

const AppDestructor = () => {
  MediaPlayerService.destructor();
  ProjectService.destructor();
}

class App extends HotKeyComponent<{}, AppState> {
  public keyMap = {
    SHOW_ALL_HOTKEYS: HotkeyInfo.SHOW_ALL_HOTKEYS.hotkey,
    EDIT_METADATA: HotkeyInfo.EDIT_METADATA.hotkey,
    IMPORT_URL: HotkeyInfo.IMPORT_URL.hotkey,
  };

  public handlers = {
    SHOW_ALL_HOTKEYS: () => this.kbdProxy(() => this.openDialog(getHotkeyDialog())),
    EDIT_METADATA: () => this.kbdProxy(() => this.openDialog(getMetadataEditorDialog())),
    IMPORT_URL: () => this.kbdProxy(() => this.openDialog(getImportUrlDialog())),
  }

  constructor(props: {}) {
    super(props);
    const b = {
      darkMode: nativeTheme.shouldUseDarkColors,
      dialogContent: null,
      project: { loaded: false, metadata: null },
    };
    this.state = { ...super.getInitialState(), ...b };
  }

  componentDidMount = () => {
    super._componentDidMount();
    DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
    DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
    DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
    DispatcherService.on(DispatchEvents.OpenDialog, this.openDialog);
    DispatcherService.on(DispatchEvents.CloseDialog, this.closeDialog);
    nativeTheme.on('updated', this.changeAppColor);
    FocusStyleManager.onlyShowFocusOnTabs();
    fpsize();
  }

  componentWillUnmount = (): void => {
    super._componentWillUnmount();
    DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
    DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
    DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
    nativeTheme.off('updated', this.changeAppColor);
    AppDestructor();
  }

  changeAppColor = (): void => {
    this.setState({ darkMode: nativeTheme.shouldUseDarkColors });
  }

  projectUpdated = async (data: DispatchData) => {
    if (this.state.project.loaded) {
      if (typeof data === 'string'
        && (data === ProjectUpdateType.ExternalFilesUpdate
          || data === ProjectUpdateType.MediaInfoUpdated)) {
        const metadata = await ProjectService.getProjectMetadata();
        const { project } = this.state;
        project.metadata = metadata;
        this.setState({ project });
      }
    }
  }

  projectOpened = async () => {
    const metadata = await ProjectService.getProjectMetadata();
    const project: ProjectDetails = {
      loaded: true,
      metadata,
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
    /* disable hotkeys */
    DispatcherService.dispatch(DispatchEvents.KbdShortcuts, false);
  }

  closeDialog = () => {
    if (this.state.dialogContent) {
      this.state.dialogContent.onClose();
      this.setState({ dialogContent: null });
    }
    /* enable hotkeys */
    DispatcherService.dispatch(DispatchEvents.KbdShortcuts, true);
  }

  render = (): React.ReactNode => {
    document.body.className = "app-body " + ((this.state.darkMode) ? Classes.DARK : "");
    return (
      <React.Fragment>
        <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
          <ErrorBoundary className="info-panel">
            <InfoPanel project={this.state.project} />
          </ErrorBoundary>
          <div id="content">
            <ErrorBoundary className="waveform-root">
              <Waveform />
            </ErrorBoundary>
            {
              this.state.project.loaded
                ? (
                  <ErrorBoundary className="waveform-root">
                    <Suspense fallback={<div>Loading...</div>}>
                      <TabEditor />
                    </Suspense>
                  </ErrorBoundary>
                )
                : null
            }
          </div>
          <ErrorBoundary className="media-bar-sticky">
            <MediaController />
          </ErrorBoundary>
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
        </GlobalHotKeys>
      </React.Fragment>
    );
  }
}

export default App;
