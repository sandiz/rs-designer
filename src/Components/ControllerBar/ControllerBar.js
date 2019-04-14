import React, { Component } from 'react'
import Modal from 'react-bootstrap/Modal'
import { toast } from 'react-toastify';

import { ImportMedia, ImportMediaStates, MediaPlayer } from '../../lib/libWaveSurfer'
import { setStateAsync, toaster } from '../../lib/utils'
import '../../css/ControllerBar.css'
import * as nothumb from '../../assets/nothumb.jpg'
import { DispatcherService, KeyboardEvents, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';

const electron = window.require("electron");
const ipcRenderer = electron.ipcRenderer;

const sec2time = (timeInSeconds) => {
  //eslint-disable-next-line
  var pad = function (num, size) { return ('000' + num).slice(size * -1); },
    time = parseFloat(timeInSeconds).toFixed(3),
    minutes = Math.floor(time / 60) % 60,
    seconds = Math.floor(time - minutes * 60),
    milliseconds = time.slice(-3);

  return pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

class ControllerBar extends Component {
  initialState = {
    showModal: false,
    importStepsCompleted: [],
    song: 'Song Title',
    artist: 'Artist',
    mediaPlaying: false,
    progress: 0,
    projectDir: '',
    tempo: '--',
    songKey: '--',
  }

  constructor(props) {
    super(props);
    this.state = this.initialState;
    this.coverArtRef = React.createRef();
    this.waveformRef = React.createRef();

    this.timerRef = {
      current: React.createRef(),
      total: React.createRef(),
    }
    this.pbRef = React.createRef();
    ipcRenderer.on('open-file', (e, d) => {
      const p = window.path.parse(d);
      console.log("open-file", p, d);
      switch (p.ext) {
        case ".rsdproject":
        case ".rsdbundle":
          this.loadProject(e, d);
          break;
        case ".mp3":
        case ".wav":
          this.importMedia(null, [d], true);
          break;
        default:
          break;
      }
    });
  }

  componentDidMount() {
    DispatcherService.on(KeyboardEvents.ImportMedia, e => this.importMedia(null));
    DispatcherService.on(KeyboardEvents.OpenProject, this.loadProject);
    DispatcherService.on(KeyboardEvents.SaveProject, this.saveProject);

    DispatcherService.on(DispatchEvents.ProjectUpdate, this.updateProjectState);
  }

  componentWillUnmount() {
    DispatcherService.off(DispatchEvents.ProjectUpdate, this.updateProjectState);
  }

  updateProjectState = (e) => {
    const projectDir = ProjectService.getProjectFilename();
    this.setState({
      projectDir,
    });
  }


  loadProject = async (e, externalProject = null) => {
    const pInfo = await ProjectService.loadProject(externalProject);
    if (pInfo && pInfo.media) {
      this.importMedia(null, [pInfo.media]);
    }
    else {
      toaster('error', 'far fa-check-circle', 'Project failed to load!', {
        toastId: 'load-project-toaster',
      });
    }
  }

  saveProject = async (e) => {
    const val = await ProjectService.saveProject();
    if (val) {
      toaster('success', 'far fa-check-circle', 'Project saved successfully!', {
        toastId: 'save-project-toaster',
      });
    }
  }

  importMedia = async (e, projectFiles = [], isTemporary = false) => {
    if (e) {
      e.target.blur();
      e.preventDefault();
    }
    let files = [];
    if (projectFiles.length === 0) {
      files = electron.remote.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: 'MP3', extensions: ['mp3'] },
          { name: 'WAV', extensions: ['wav'] },
        ],
      });

      if (files === null || typeof files === 'undefined' || files.length <= 0) {
        return;
      }

      if (ProjectService.isLoaded()) {
        ProjectService.unload();
      }

      let file = files[0];
      file = await ProjectService.createTemporaryProject(file);
      files = [file];
    }
    else {
      files = projectFiles;
      if (isTemporary) {
        let file = files[0];
        file = await ProjectService.createTemporaryProject(file);
        files = [file];
      }
    }
    this.reset();
    await setStateAsync(this, {
      showModal: true,
    })
    const importer = ImportMedia;
    importer.start(files,
      (state) => {
        const cis = this.state.importStepsCompleted;
        cis.push(state);
        this.setState({ importStepsCompleted: cis });
      },
      (media) => {
        toast.dismiss();
        this.setState({
          song: media.tags.common.title,
          artist: media.tags.common.artist,
          showModal: false,
        });
        this.updateProjectState(null);

        if (Array.isArray(media.tags.common.picture) && media.tags.common.picture.length > 0) {
          const buf = media.tags.common.picture[0].data;
          this.coverArtRef.current.src = 'data:image/jpeg;base64,' + buf.toString('base64')
        }
        else {
          this.coverArtRef.current.src = nothumb.default;
        }

        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
          const total = mediaPlayer.getDuration();
          this.timerRef.total.current.innerHTML = sec2time(total);
          mediaPlayer.timer((time) => {
            const per = (Math.round(time) / Math.round(total)).toFixed(2);
            this.updateProgressBar(per, time);
          });
          mediaPlayer.finish(() => {
            this.setState({ mediaPlaying: false });
          });
          mediaPlayer.onplay(() => {
            this.setState({ mediaPlaying: true });
          })
          mediaPlayer.onpause(() => {
            this.setState({ mediaPlaying: false });
          })
          mediaPlayer.onseek((per) => {
            this.updateProgressBar(per, mediaPlayer.getCurrent());
          })

          DispatcherService.on(KeyboardEvents.PlayPause, this.play);
          DispatcherService.on(KeyboardEvents.Stop, this.stop);
          DispatcherService.on(KeyboardEvents.Rewind, this.rewind);
          DispatcherService.on(KeyboardEvents.FastForward, this.ffwd);
        }
      });
  }

  play = () => this.mediaCmd("playpause");

  rewind = () => this.mediaCmd("rewind");

  ffwd = () => this.mediaCmd("ffwd");

  stop = () => this.mediaCmd("stop");
  //eslint-disable-next-line
  mediaCmd(cmd, value = 0) {
    const mediaPlayer = MediaPlayer.instance;
    if (mediaPlayer) {
      switch (cmd) {
        case "playpause":
          mediaPlayer.playPause();
          break;
        case "stop":
          mediaPlayer.stop();
          this.timerRef.current.current.innerHTML = "00:00.000";
          break;
        case "rewind":
          mediaPlayer.rewind();
          break;
        case "ffwd":
          mediaPlayer.ffwd();
          break;
        case "seekAndCenter":
          mediaPlayer.seekAndCenter(value);
          break;
        default:
          break;
      }
    }
  }

  reset() {
    this.setState({ ...this.initialState })
    this.coverArtRef.current.src = nothumb.default;
    DispatcherService.off(KeyboardEvents.PlayPause, this.play);
    DispatcherService.off(KeyboardEvents.Stop, this.stop);
    DispatcherService.off(KeyboardEvents.Rewind, this.rewind);
    DispatcherService.off(KeyboardEvents.FastForward, this.ffwd);
  }

  //eslint-disable-next-line
  pbSeek = (e) => {
    const bounds = e.target.getBoundingClientRect();
    const x = e.pageX - bounds.left;
    const clickedValue = x * 1 / e.target.offsetWidth;

    this.mediaCmd("seekAndCenter", clickedValue);

    const mediaPlayer = MediaPlayer.instance;
    if (mediaPlayer) {
      this.updateProgressBar(clickedValue, mediaPlayer.getCurrent());
    }
  }

  updateProgressBar(per, time) {
    this.timerRef.current.current.innerHTML = sec2time(time);
    this.pbRef.current.style.width = (per * 100) + "%";
  }

  render = () => {
    return (
      <div>
        <div className="controller_bar bg-light">
          <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <button
              type="button"
              onClick={this.loadProject}
              onMouseDown={e => e.preventDefault()}
              className="btn btn-secondary">
              <i className="fas fa-folder-open icon-center" /> &nbsp;
            <span className="btn-text">Open Project</span>
            </button>
            &nbsp;&nbsp;
          <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={this.saveProject}
              className="btn btn-secondary">
              <i className="fas fa-save icon-center" /> &nbsp;
            <span className="btn-text">Save Project</span>
            </button>
            &nbsp;&nbsp;
          <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={e => e.preventDefault()}
              onClick={this.importMedia}>
              <i className="fas fa-music icon-center" /> &nbsp;
            <span className="btn-text">Import Media</span>
            </button>
            &nbsp;&nbsp;&nbsp;
          <div className="vertical" />

            &nbsp;&nbsp;&nbsp;
          <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.mediaCmd("playpause")}>
              {
                this.state.mediaPlaying ? (
                  <i className="fas fa-pause" />
                )
                  : (
                    <i className="fas fa-play" />
                  )
              }
            </button>
            &nbsp;&nbsp;
          <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.mediaCmd("stop")}>
              <i className="fas fa-stop" />
            </button>
            &nbsp;&nbsp;
          <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.mediaCmd("rewind")}>
              <i className="fas fa-backward" />
            </button>
            &nbsp;&nbsp;
           <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.mediaCmd("ffwd")}>
              <i className="fas fa-forward" />
            </button>
            &nbsp;&nbsp;
            &nbsp;
          <div className="vertical" />
            &nbsp;&nbsp;
          <img alt="cover art" className="cover_img" src={nothumb.default} ref={this.coverArtRef} />
            <table className="info-table">
              <tbody>
                <tr>
                  <td>
                    <div className="song_div">
                      <span className="song_span"> {this.state.song}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="artist_div">
                      <span className="artist_span"> {this.state.artist} </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            &nbsp;&nbsp;
            &nbsp;
           <div className="vertical" />
            &nbsp;&nbsp;
            <div className="info-table2">
              <table className="table2">
                <tbody>
                  <tr>
                    <td>Project</td>
                    <td>
                      <div className="table-extra-info" title={this.state.projectDir}>
                        <a
                          href="#"
                          onClick={(e) => {
                            electron.remote.shell.showItemInFolder(this.state.projectDir)
                          }}
                        >{this.state.projectDir} </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Tempo</td>
                    <td>
                      <div className="table-extra-info">
                        {this.state.tempo}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Song Key</td>
                    <td>
                      <div className="table-extra-info">
                        {this.state.songKey}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="timer_div">
              <div>
                <span className="current_time_span" ref={this.timerRef.current}>00:00.000</span>
                <span className="total_time_span"><sub ref={this.timerRef.total}> 00:00.000</sub></span>
              </div>
              <div>
                <div
                  onClick={this.pbSeek}
                  className="progress">
                  <div
                    ref={this.pbRef}
                    className="progress-bar bg-info"
                    role="progressbar"
                    style={{
                      width: 0 + '%',
                      pointerEvents: "none",
                    }}
                    aria-valuenow="25"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    tabIndex="0"
                  />
                </div>
              </div>
            </div>
          </nav>
        </div>
        <ImportMediaModal show={this.state.showModal} completed={this.state.importStepsCompleted} />
      </div>
    );
  }
}

function ImportMediaModal(props) {
  const spinnerActiveClass = "spinner-grow text-info spinner";
  const spinnerCompleteClass = "spinner-grow-noanim text-success spinner"
  const imComplete = props.completed.includes(ImportMediaStates.importing);
  const rtComplete = props.completed.includes(ImportMediaStates.readingTags);
  const wsComplete = props.completed.includes(ImportMediaStates.wavesurfing);
  return (
    <Modal
      {...props}
      size="med"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      onHide={() => { }}
    >
      <Modal.Header>
        <Modal.Title id="contained-modal-title-vcenter">
          Please Wait...
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Importing Media
           <div className={imComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <br />
        Reading Tags
           <div className={rtComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <br />
        Wave Surfing
           <div className={wsComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <br />
      </Modal.Body>
    </Modal>
  );
}

export default ControllerBar;
