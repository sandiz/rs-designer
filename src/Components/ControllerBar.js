import React, { Component } from 'react'
import Modal from 'react-bootstrap/Modal'
import '../css/ControllerBar.css'
import * as nothumb from '../assets/nothumb.jpg'

const Mousetrap = require('mousetrap');
const setStateAsync = require("../lib/utils").setStateAsync;

const importMediaStates = window.Project.ImportMedia.states;

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
  }

  importMedia = async (e) => {
    e.target.blur();
    e.preventDefault();

    const files = window.remote.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: 'MP3', extensions: ['mp3'] },
        { name: 'WAV', extensions: ['wav'] },
      ],
    });
    if (files === null || typeof files === 'undefined' || files.length <= 0) {
      return;
    }
    this.reset();
    await setStateAsync(this, {
      showModal: true,
    })
    const importer = window.Project.ImportMedia.instance;
    if (importer) {
      importer.start(files,
        (state) => {
          const cis = this.state.importStepsCompleted;
          cis.push(state);
          this.setState({ importStepsCompleted: cis });
        },
        (media) => {
          this.setState({
            song: media.tags.common.title,
            artist: media.tags.common.artist,
            showModal: false,
          });

          if (Array.isArray(media.tags.common.picture) && media.tags.common.picture.length > 0) {
            const buf = media.tags.common.picture[0].data;
            this.coverArtRef.current.src = 'data:image/jpeg;base64,' + buf.toString('base64')
          }
          else {
            this.coverArtRef.current.src = nothumb.default;
          }

          const mediaPlayer = window.Project.MediaPlayer.instance;
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

            //eslint-disable-next-line
            Mousetrap.bind(['command+p', 'ctrl+p'], (e, s) => this.mediaCmd("playpause"));
            Mousetrap.bind(['left'], (e1, s1) => this.mediaCmd("rewind"));
            Mousetrap.bind(['right'], (e2, s2) => this.mediaCmd("ffwd"));
          }
        });
    }
  }

  //eslint-disable-next-line
  mediaCmd(cmd, value = 0) {
    const mediaPlayer = window.Project.MediaPlayer.instance;
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
  }

  //eslint-disable-next-line
  pbSeek = (e) => {
    const bounds = e.target.getBoundingClientRect();
    const x = e.pageX - bounds.left;
    const clickedValue = x * 1 / e.target.offsetWidth;

    this.mediaCmd("seekAndCenter", clickedValue);

    const mediaPlayer = window.Project.MediaPlayer.instance;
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
            <button type="button" className="btn btn-secondary">
              <i className="fas fa-folder-open icon-center" /> &nbsp;
            <span className="btn-text">Open Project</span>
            </button>
            &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary">
              <i className="fas fa-save icon-center" /> &nbsp;
            <span className="btn-text">Save Project</span>
            </button>
            &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary" onClick={this.importMedia}>
              <i className="fas fa-music icon-center" /> &nbsp;
            <span className="btn-text">Import Media</span>
            </button>
            &nbsp;&nbsp;&nbsp;
          <div className="vertical" />

            &nbsp;&nbsp;&nbsp;
          <button type="button" className="btn btn-secondary" onClick={() => this.mediaCmd("playpause")}>
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
          <button type="button" className="btn btn-secondary" onClick={() => this.mediaCmd("stop")}>
              <i className="fas fa-stop" />
            </button>
            &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary" onClick={() => this.mediaCmd("rewind")}>
              <i className="fas fa-backward" />
            </button>
            &nbsp;&nbsp;
           <button type="button" className="btn btn-secondary" onClick={() => this.mediaCmd("ffwd")}>
              <i className="fas fa-forward" />
            </button>
            &nbsp;&nbsp;
            &nbsp;
          <div className="vertical" />
            &nbsp;&nbsp;
          <img alt="cover art" className="cover_img" src={nothumb.default} ref={this.coverArtRef} />
            <table>
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
  const spinnerActiveClass = "spinner-grow text-primary spinner";
  const spinnerCompleteClass = "spinner-grow-noanim text-success spinner"
  const imComplete = props.completed.includes(importMediaStates.importing);
  const rtComplete = props.completed.includes(importMediaStates.readingTags);
  const wsComplete = props.completed.includes(importMediaStates.wavesurfing);
  return (
    <Modal
      {...props}
      size="med"
      aria-labelledby="contained-modal-title-vcenter"
      centered
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
