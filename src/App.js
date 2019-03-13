import React, { Component } from 'react'
import './css/App.css'
import ControllerBar from './Components/ControllerBar'

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
