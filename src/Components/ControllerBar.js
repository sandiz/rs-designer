import React, { Component } from 'react'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Modal from 'react-bootstrap/Modal'
import '../css/ControllerBar.css'
import { setStateAsync } from '../lib/utils';
import * as nothumb from '../assets/nothumb.jpg'

const importMediaStates = window.project.importMediaStates;

class ControllerBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      importStepsCompleted: [],
      song: 'Song Title',
      artist: 'Artist',
    };
    this.coverArtRef = React.createRef();
  }

  importMedia = () => {
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
    setStateAsync(this, {
      showModal: true,
    })
    window.project.importMedia(files,
      (state) => {
        const cis = this.state.importStepsCompleted;
        cis.push(state);
        this.setState({ importStepsCompleted: cis });
      },
      (media) => {
        console.log(media);
        this.setState({
          song: media.tags.common.title,
          artist: media.tags.common.artist,
          showModal: false,
        });

        if (Array.isArray(media.tags.common.picture) && media.tags.common.picture.length > 0) {
          const buf = media.tags.common.picture[0].data;
          this.coverArtRef.current.src = 'data:image/jpeg;base64,' + buf.toString('base64')
        }
      });
  }

  render = () => {
    return (
      <div>
        <div className="controller_bar">
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
          <button type="button" className="btn btn-secondary">
              <i className="fas fa-play" />
            </button>
            &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary">
              <i className="fas fa-stop" />
            </button>
            &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary">
              <i className="fas fa-backward" />
            </button>
            &nbsp;&nbsp;
           <button type="button" className="btn btn-secondary">
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
                <span className="current_time_span">00:00:000</span>
                <span className="total_time_span"><sub> 00:00:000</sub></span>
              </div>
              <div>
                <ProgressBar now={60} min={0} max={100} />
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
  const daComplete = props.completed.includes(importMediaStates.decodingAudio);
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
        Decoding Audio
           <div className={daComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <br />
      </Modal.Body>
    </Modal>
  );
}

export default ControllerBar;
