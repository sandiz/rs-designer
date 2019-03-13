import React, { Component } from 'react'
import ControllerBar from './Components/ControllerBar'
import './css/theme/darkly.bootstrap.min.css'
import './css/App.css'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  render = () => {
    return (
      <ControllerBar />
    );
  }
}

export default App;
