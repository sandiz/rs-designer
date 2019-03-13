import React, { Component } from 'react'
import './css/App.css'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  render = () => {
    const a = "hello"
    return (
      <div>
        {a}
      </div>);
  }
}

export default App;
