import React, { Component } from 'react'
import ProgressBar from 'react-bootstrap/ProgressBar'
import '../css/ControllerBar.css'

class ControllerBar extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  render = () => {
    return (
      <div className="controller_bar">
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <button type="button" className="btn btn-secondary">
            Open Project
          </button>
          &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary">
            Save Project
          </button>
          &nbsp;&nbsp;
          <button type="button" className="btn btn-secondary">
            Import Media
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
          <div className="cover_div" />
          <table>
            <tr>
              <td>
                <div className="song_div">
                  <span className="song_span"> Song Title</span>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="artist_div">
                  <span className="artist_span"> Artist </span>
                </div>
              </td>
            </tr>
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
    );
  }
}

export default ControllerBar;
