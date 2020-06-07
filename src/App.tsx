import React, { Suspense } from 'react'
import {
  Classes, FocusStyleManager, Dialog,
} from "@blueprintjs/core"
import { IpcRendererEvent } from 'electron'
import { IconNames } from '@blueprintjs/icons';
import { GlobalHotKeys } from 'react-hotkeys';
import { CommitDescription } from 'isomorphic-git';
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
  DialogContent,
} from './types/base'
import {
  HotkeyInfo, HotKeyComponent, HotKeyState,
} from './types/hotkey';
import {
  ProjectDetails,
} from './types/project';
import { DispatcherService, DispatchEvents, DispatchData } from './services/dispatcher';
import ProjectService, { ProjectUpdateType } from './services/project';
import MediaPlayerService from './services/mediaplayer';
import InfoPanel from './components/InfoPanel/InfoPanel';
import Waveform from './components/Waveform/Waveform';
import GitService from './services/git';
import {
  InitTouchBar, CloseTouchBar,
} from './lib/touchbar';
import Sidebar from './components/Sidebar/Sidebar';
import AppContext from './context';

const TabEditor = React.lazy(() => import("./components/TabEditor/TabEditor"));

const electron = window.require("electron");
const nativeTheme = electron.remote.nativeTheme;
const ipcRenderer = electron.ipcRenderer;


interface AppState extends HotKeyState {
  darkMode: boolean;
  dialogContent: DialogContent | null;
  project: ProjectDetails;
  projectCommits: CommitDescription[];
}

const AppDestructor = () => {
  MediaPlayerService.destructor();
  ProjectService.destructor();
  CloseTouchBar();
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
      projectCommits: [],
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
    nativeTheme.on('updated', this.updateTheme);
    ipcRenderer.on('change-app-theme', this.chooseAppTheme);
    FocusStyleManager.onlyShowFocusOnTabs();
    MediaPlayerService.setAppCallbacks({
      isDarkTheme: () => this.state.darkMode,
    });
    InitTouchBar();
  }

  componentWillUnmount = (): void => {
    super._componentWillUnmount();
    DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
    DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
    DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
    nativeTheme.off('updated', this.updateTheme);
    ipcRenderer.off('change-app-theme', this.chooseAppTheme);
    MediaPlayerService.clearAppCallbacks();
    AppDestructor();
  }

  updateTheme = (): void => {
    this.setState({ darkMode: nativeTheme.shouldUseDarkColors });
  }

  chooseAppTheme = (event: IpcRendererEvent, theme: "dark" | "light"): void => {
    this.setState({ darkMode: theme === "dark" }, () => {
      DispatcherService.dispatch(DispatchEvents.AppThemeChanged, theme);
    });
  }

  projectUpdated = async (data: DispatchData) => {
    if (this.state.project.loaded) {
      const commits = await GitService.listCommits(ProjectService.getProjectDir());
      this.setState({ projectCommits: commits });
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
    const commits = await GitService.listCommits(ProjectService.getProjectDir());
    const project: ProjectDetails = {
      loaded: true,
      metadata,
    }
    this.setState({ project, projectCommits: commits });
  }

  projectClosed = () => {
    const project: ProjectDetails = {
      loaded: false,
      metadata: null,
    }
    this.setState({ project, projectCommits: [] });
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
      <AppContext.Provider value={{
        isDarkTheme: () => this.state.darkMode,
      }}>
        <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
          <div id="content">
            <ErrorBoundary className="sidebar-sticky">
              <div className="sidebar-sticky">
                <Sidebar project={this.state.project} />
              </div>
            </ErrorBoundary>
            <div className="main-sticky">
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
      </AppContext.Provider>
    );
  }

  render2 = (): React.ReactNode => {
    document.body.className = "app-body " + ((this.state.darkMode) ? Classes.DARK : "");
    return (
      <AppContext.Provider value={{
        isDarkTheme: () => this.state.darkMode,
      }}>
        <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
          <ErrorBoundary className="info-panel">
            <InfoPanel project={this.state.project} lastCommits={this.state.projectCommits} />
          </ErrorBoundary>
          <div id="content">
            <ErrorBoundary className="waveform-root">
              <Waveform />
            </ErrorBoundary>
            {
              //eslint-disable-next-line
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
      </AppContext.Provider>
    );
  }
}

export default App;
