import React, { Component } from 'react';
import {
    BrowserRouter as Router,
    Route,
} from 'react-router-dom';
import App from './App';
import SideApp from './SideApp';
import MediaAdvanced from './components/MediaAdvanced/MediaAdvanced';

type ViewHolder = {
    [key: string]: React.ReactElement;
}

class ViewManager extends Component {
    static Views(): ViewHolder {
        return {
            App: <App />,
            MediaAdvanced: <SideApp><MediaAdvanced isOpen isPopout /></SideApp>,
        }
    }

    //eslint-disable-next-line
    static View(props: any) {
        const name = window.location.search.substr(1);
        const view = ViewManager.Views()[name];
        if (view == null) throw new Error("View '" + name + "' is undefined");
        return view;
    }

    render() {
        return (
            <Router>
                <div>
                    <Route path="/" exact component={ViewManager.View} />
                </div>
            </Router>
        );
    }
}

export default ViewManager;
