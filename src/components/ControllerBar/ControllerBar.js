import React, { Component } from 'react'
import Popover from 'react-bootstrap/Popover'
import Dropdown from 'react-bootstrap/Dropdown'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import { toast } from 'react-toastify';

import CustomToggle from './CustomToggle'
import { ImportMedia, MediaPlayer } from '../../lib/libWaveSurfer'
import {
  setStateAsync, toaster, disableKeydown, showOpenDialog,
} from '../../lib/utils'
import '../../css/ControllerBar.css'
import * as nothumb from '../../assets/nothumb.jpg'
import { DispatcherService, KeyboardEvents, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import {
  getTransposedKey, getRelativeKey, getParalleKey, getChordsInKey,
  getUniqueChords, getTransposedChords,
} from '../../lib/music-utils'
import ImportMediaModal from './modalImportMedia'
import MetadataEditorModal from './modalEditMetadata'
import SettingsModal from './modalSettings';

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
const popover = (title, body) => (
  <Popover
    id="popover-basic"
    title={title}
    style={{
      maxWidth: 500 + 'px',
      width: 400 + 'px',
    }}
  >
    {body}
  </Popover>
);

class ControllerBar extends Component {
  initialState = {
    showModal: false,
    showmetadataModal: false,
    showSettingsModal: false,
    importStepsCompleted: [],
    song: 'Song Title',
    artist: 'Artist',
    album: 'Album',
    mediaPlaying: false,
    progress: 0,
    projectDir: '',
    tempo: 0,
    tonic: {
      key: '--',
      type: '--', //major or minor
      confidence: 0,
    },
    pitchChange: {
      diff: 0,
      newKey: '',
    },
    tempoChange: {
      diff: 0,
      newTempo: 0,
    },
    disableOpenSave: false,
    chords: [],
    metadata: null,
  }

  constructor(props) {
    super(props);
    this.state = { ...this.initialState }
    this.coverArtRef = React.createRef();
    this.waveformRef = React.createRef();
    this.tempoSplit = 140;

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
    ipcRenderer.on('open-last-project', (e, d) => {
      const last = ProjectService.getLastOpenedProject();
      if (last != null) {
        console.log("loading last project: " + last);
        this.loadProject(e, last);
      }
    });
  }

  componentDidMount() {
    DispatcherService.on(KeyboardEvents.ImportMedia, e => this.importMedia(null, [], true));
    DispatcherService.on(KeyboardEvents.OpenProject, this.loadProject);
    DispatcherService.on(KeyboardEvents.SaveProject, this.saveProject);

    DispatcherService.on(DispatchEvents.ProjectUpdate, this.updateProjectState);
    DispatcherService.on(DispatchEvents.PitchChange, this.onPitchChange);
    DispatcherService.on(DispatchEvents.TempoChange, this.onTempoChange);
    DispatcherService.on(DispatchEvents.MediaAnalysisStart, this.analysisStart)
    DispatcherService.on(DispatchEvents.MediaAnalysisEnd, this.analysisEnd)

    disableKeydown(".kabob_div", "Enter");
  }

  componentWillUnmount() {
    DispatcherService.off(DispatchEvents.ProjectUpdate, this.updateProjectState);
    DispatcherService.off(DispatchEvents.PitchChange, this.onPitchChange);
    DispatcherService.off(DispatchEvents.TempoChange, this.onTempoChange);
  }

  analysisStart = () => {
    this.setState({ disableOpenSave: true })
  }

  analysisEnd = () => {
    this.setState({ disableOpenSave: false })
  }

  onPitchChange = async (value) => {
    const [key, _ignored] = await ProjectService.readSongKey();
    const newKey = getTransposedKey(key, value);
    if (newKey) {
      this.setState({
        pitchChange: {
          diff: value,
          newKey,
        },
      })
    }
  }

  onTempoChange = async (value) => {
    let tempo = await ProjectService.readTempo();
    tempo = tempo.toFixed()
    let newTempo = (tempo * (value / 100)).toFixed();
    if (value === 100) {
      value = 0;
      newTempo = 0;
    }
    this.setState({
      tempoChange: {
        diff: value,
        newTempo,
      },
    })
  }

  updateProjectState = async (e) => {
    const projectDir = ProjectService.getProjectDir();
    const info = ProjectService.getProjectInfo();
    const tempo = info.tempo !== '' ? await ProjectService.readTempo() : 0;
    const songKey = info.key !== '' ? await ProjectService.readSongKey() : ['--', '--'];
    let chords = [];
    try {
      chords = info.chords !== '' ? await ProjectService.readChords() : [];
    }
    catch (ex) {
      if (!Array.isArray(chords)) chords = []
    }
    chords = getUniqueChords(chords);
    const metadata = info.metadata !== '' ? await ProjectService.readMetadata() : null;
    this.setState({
      projectDir,
      tempo,
      chords,
      tonic: {
        key: songKey[0],
        type: songKey[1],
        confidence: songKey[2],
      },
      metadata,
    });
  }

  loadProject = async (e, externalProject = null) => {
    const pInfo = await ProjectService.loadProject(externalProject);
    if (pInfo && pInfo.media) {
      this.importMedia(null, [pInfo.media]);
    }
    else {
      toaster('error', '', 'Project failed to load!', {
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
    this.mediaCmd("stop");

    /* if no external files was provided, prompt ab open media dialog */
    let files = [];
    if (projectFiles.length === 0) {
      files = await showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: 'MP3', extensions: ['mp3'] },
          { name: 'WAV', extensions: ['wav'] },
        ],
      });

      if (files === null || typeof files === 'undefined' || files.length <= 0) {
        return;
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

    /* start import */
    const importer = ImportMedia;
    importer.start(
      files,
      (state) => {
        const cis = this.state.importStepsCompleted;
        cis.push(state);
        this.setState({ importStepsCompleted: cis });
      },
      async (media) => {
        toast.dismiss();
        this.setMetadataToState(media);
        this.updateProjectState(null);

        if (isTemporary) {
          const mm = await ProjectService.saveMetadata(media);
          this.setState({ metadata: mm });
        }

        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
          const total = mediaPlayer.getDuration();
          this.timerRef.total.current.textContent = sec2time(total);
          //mediaPlayer.timer((time) => {

          let handlePP = null;
          const updatePP = () => {
            const time = mediaPlayer.getCurrent();
            const per = (Math.round(time) / Math.round(total)).toFixed(2);
            this.updateProgressBar(per, time);
            handlePP = requestAnimationFrame(updatePP);
          };

          mediaPlayer.finish(() => {
            this.setState({ mediaPlaying: false });
            if (handlePP != null) {
              cancelAnimationFrame(handlePP)
            }
          });
          mediaPlayer.onplay(() => {
            this.setState({ mediaPlaying: true });
            updatePP();
          })
          mediaPlayer.onpause(() => {
            this.setState({ mediaPlaying: false });
            if (handlePP != null) {
              cancelAnimationFrame(handlePP)
            }
          })
          mediaPlayer.onseek((per) => {
            this.updateProgressBar(per, mediaPlayer.getCurrent());
          })

          DispatcherService.on(KeyboardEvents.PlayPause, this.play);
          DispatcherService.on(KeyboardEvents.Stop, this.stop);
          DispatcherService.on(KeyboardEvents.Rewind, this.rewind);
          DispatcherService.on(KeyboardEvents.FastForward, this.ffwd);
          DispatcherService.on(KeyboardEvents.SeekStart, this.seekStart);
          DispatcherService.on(KeyboardEvents.SeekEnd, this.seekEnd);
        }
      },
    );
  }

  setMetadataToState = (media) => {
    this.setState({
      song: media.tags.common.title,
      artist: media.tags.common.artist,
      album: media.tags.common.album,
      showModal: false,
    });

    if (Array.isArray(media.tags.common.picture) && media.tags.common.picture.length > 0) {
      const buf = media.tags.common.picture[0].data;
      this.coverArtRef.current.src = 'data:image/jpeg;base64,' + buf.toString('base64')
    }
    else {
      this.coverArtRef.current.src = nothumb.default;
    }
    this.updateProjectState();
  }

  play = () => this.mediaCmd("playpause");

  rewind = () => this.mediaCmd("rewind");

  ffwd = () => this.mediaCmd("ffwd");

  stop = () => this.mediaCmd("stop");

  seekStart = () => this.mediaCmd("seek-start");

  seekEnd = () => this.mediaCmd("seek-end");
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
          this.timerRef.current.current.textContent = "00:00.000";
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
        case "seek-start":
          mediaPlayer.seekAndCenter(0);
          break;
        case "seek-end":
          if (mediaPlayer.isPlaying()) {
            mediaPlayer.stop();
          }
          mediaPlayer.seekAndCenter(1);
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
    DispatcherService.off(KeyboardEvents.SeekStart, this.seekStart);
    DispatcherService.off(KeyboardEvents.SeekEnd, this.seekEnd);
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
    this.timerRef.current.current.textContent = sec2time(time);
    this.pbRef.current.style.width = (per * 100) + "%";
  }

  moreInfoSelect = (eventKey, event) => {
    switch (eventKey) {
      case "dt-quit":
        electron.remote.app.quit();
        break;
      case "dt-settings":
        this.setState({ showSettingsModal: true });
        break;
      default:
        break;
    }
  }

  onSettingsClose = () => {
    this.setState({ showSettingsModal: false });
  }

  onMetadataEditorClose = () => {
    this.setState({ showmetadataModal: false });
  }

  onMetadataEditorSave = async (e, media) => {
    if (ProjectService.isLoaded()) {
      const obj = {};
      ProjectService.assignMetadata(obj, media);
      await ProjectService.saveMetadata(obj);
      this.setMetadataToState(obj);
    }
    this.onMetadataEditorClose();
  }

  render = () => {
    const tempo = this.state.tempo
    const halfTempo = this.state.tempo >= this.tempoSplit ? this.state.tempo / 2 : -1
    let tempoSpan = null
    if (halfTempo === -1) {
      tempoSpan = (
        <span title={this.state.tempo}>{this.state.tempo.toFixed()} bpm</span>
      )
    }
    else {
      tempoSpan = (
        <span title={`[ ${halfTempo}, ${tempo}]`}>[ {halfTempo.toFixed()},{tempo.toFixed()} ] bpm</span>
      )
    }

    let tempoDiffSpan = null
    if (this.state.tempoChange.diff > 0) {
      if (halfTempo === -1) {
        tempoDiffSpan = (
          <span> * ({this.state.tempoChange.diff}%) = {this.state.tempoChange.newTempo} bpm</span>
        )
      }
      else {
        const nt = this.state.tempoChange.newTempo;
        const ht = (halfTempo * this.state.tempoChange.diff / 100);
        tempoDiffSpan = (
          <span> * ({this.state.tempoChange.diff}%) = [ {ht.toFixed()}, {nt} ] bpm</span>
        )
      }
    }

    const currPitch = this.state.pitchChange.diff === 0 ? this.state.tonic.key : this.state.pitchChange.newKey;
    const relativeKey = getRelativeKey(currPitch, this.state.tonic.type);

    const parallelKey = getParalleKey(currPitch, this.state.tonic.type);
    const parallelChordsInKey = getChordsInKey(parallelKey[0], parallelKey[1]);

    const currentKey = this.state.tonic.key === '--' ? this.state.tonic.key : `${this.state.tonic.key} ${this.state.tonic.type}`
    const chordsInKey = getChordsInKey(currPitch, this.state.tonic.type);

    return (
      <React.Fragment>
        <div className="controller_bar bg-light">
          <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="controller_div d-flex flex-row">
              <div className="project_div d-flex flex-row justify-content-between">
                <div>
                  <button
                    disabled={this.state.disableOpenSave}
                    type="button"
                    onClick={this.loadProject}
                    onMouseDown={e => e.preventDefault()}
                    className="btn btn-secondary">
                    <i className="fas fa-folder-open icon-center" /> &nbsp;
                  <span className="btn-text">Open Project</span>
                  </button>
                </div>
                <div>
                  <button
                    disabled={this.state.disableOpenSave}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={this.saveProject}
                    className="btn btn-secondary">
                    <i className="fas fa-save icon-center" /> &nbsp;
                    <span className="btn-text">Save Project</span>
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onMouseDown={e => e.preventDefault()}
                    onClick={e => this.importMedia(e, [], true)}>
                    <i className="fas fa-music icon-center" /> &nbsp;
                    <span className="btn-text">Import Media</span>
                  </button>
                </div>
              </div>
              <div className="vertical" />
              <div className="controls_div d-flex flex-row justify-content-between">
                <div>
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
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => this.mediaCmd("stop")}>
                    <i className="fas fa-stop" />
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => this.mediaCmd("rewind")}>
                    <i className="fas fa-backward" />
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => this.mediaCmd("ffwd")}>
                    <i className="fas fa-forward" />
                  </button>
                </div>
              </div>
              <div className="vertical" />
              <div className="cover_art_div">
                <a href="#" onClick={e => this.setState({ showmetadataModal: true })}>
                  <img alt="cover art" className="cover_img" src={nothumb.default} ref={this.coverArtRef} />
                </a>
              </div>
              <div className="info-table justify-content-center" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="song_div">
                  <span className="song_span"> {this.state.song}</span>
                </div>
                <div className="artist_div">
                  <span className="artist_span"> {this.state.artist} </span>
                </div>
                <div className="artist_div">
                  <span className="artist_span"> {this.state.album} </span>
                </div>
              </div>
              <div className="vertical" />
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
                          >{window.path.basename(this.state.projectDir)} </a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>Tempo</td>
                      <td>
                        <div className="table-extra-info">
                          {
                            this.state.tempo > 0
                              ? tempoSpan
                              : '--'
                          }
                          {
                            tempoDiffSpan
                          }
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>Song Key</td>
                      <td>
                        <div className="table-extra-info">
                          <OverlayTrigger
                            trigger="click"
                            placement="bottom"
                            overlay={
                              popover('Song Key',
                                (
                                  <React.Fragment>
                                    <div className="popover-div">
                                      <span>Confidence</span>
                                      <span className="float-right">
                                        {(this.state.tonic.confidence * 100).toFixed(2)} %
                                  </span>
                                    </div>
                                    <div className="popover-div">
                                      <a
                                        className="cur-pointer"
                                        onClick={e => electron.shell.openExternal('https://essentia.upf.edu/documentation/reference/std_Key.html')}
                                        title="Detection Profile">
                                        <span>Profile</span>
                                        <span className="float-right">bgate</span>
                                      </a>
                                    </div>
                                    <div className="popover-div">
                                      <span>Key</span>
                                      <span className="float-right">{this.state.pitchChange.diff !== 0 ? this.state.pitchChange.newKey : currentKey}</span>
                                    </div>
                                    <div className="popover-div">
                                      <span>Key Chords</span>
                                      <span className="float-right">[ {
                                        chordsInKey.map((v, i) => {
                                          if (getTransposedChords(this.state.chords, this.state.pitchChange.diff).includes(v)) {
                                            return <span title="In Use" className="chord-detect" key={v}>{v}, </span>
                                          }
                                          return <span key={v}>{v}, </span>
                                        })
                                      } ]</span>
                                    </div>
                                    <div className="popover-div">
                                      <span>Relative Key</span>
                                      <span className="float-right">{relativeKey.join(' ')}</span>
                                    </div>
                                    <div className="popover-div">
                                      <span>Parallel Key</span>
                                      <span className="float-right">{parallelKey.join(' ')}</span>
                                    </div>
                                    <div className="popover-div">
                                      <span>Parrallel Chords</span>
                                      <span className="float-right">[ {
                                        parallelChordsInKey.map((v, i) => {
                                          if (getTransposedChords(this.state.chords, this.state.pitchChange.diff).includes(v)) {
                                            return <span title="In Use" className="chord-detect" key={v}>{v}, </span>
                                          }
                                          return <span key={v}>{v}, </span>
                                        })
                                      } ]</span>
                                    </div>
                                  </React.Fragment>
                                ))
                            }>
                            <a href="#">
                              {currentKey}
                              {
                                this.state.pitchChange.diff !== 0
                                  ? (
                                    <span>
                                      &nbsp;({
                                        this.state.pitchChange.diff > 0 ? `+` : ``
                                      }
                                      {this.state.pitchChange.diff})
                                = {this.state.pitchChange.newKey} {this.state.tonic.type}
                                    </span>
                                  )
                                  : null
                              }
                            </a>
                          </OverlayTrigger>
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
                    > </div>
                  </div>
                </div>
              </div>
              <div className="kabob_div cur-pointer">
                <Dropdown
                  drop="left"
                  onSelect={this.moreInfoSelect}>
                  <Dropdown.Toggle variant="success" as={CustomToggle} id="dt">
                    <i className="fas fa-ellipsis-v" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="dt-settings">Settings</Dropdown.Item>
                    <Dropdown.Item eventKey="dt-help">Help</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item eventKey="dt-quit">Quit</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          </nav>
        </div>
        <ImportMediaModal show={this.state.showModal} completed={this.state.importStepsCompleted} />
        <MetadataEditorModal
          metadata={this.state.metadata}
          show={this.state.showmetadataModal}
          onSave={this.onMetadataEditorSave}
          onClose={this.onMetadataEditorClose} />
        <SettingsModal
          show={this.state.showSettingsModal}
          onClose={this.onSettingsClose} />
      </React.Fragment>
    );
  }
}

export default ControllerBar;
