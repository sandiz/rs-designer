import React from 'react';
import {
    Classes,
} from "@blueprintjs/core"

const { nativeTheme } = window.require("electron").remote;

interface SideAppProps {
    children: React.ReactElement;
}
interface SideAppState {
    darkMode: boolean;
}

class SideApp extends React.Component<SideAppProps, SideAppState> {
    constructor(props: SideAppProps) {
        super(props);
        this.state = { darkMode: nativeTheme.shouldUseDarkColors }
    }

    componentDidMount = () => {
        nativeTheme.on('updated', this.changeAppColor);
    }

    componentWillUnmount = () => {
        nativeTheme.off('updated', this.changeAppColor);
    }

    changeAppColor = (): void => {
        this.setState({ darkMode: nativeTheme.shouldUseDarkColors });
    }

    render = () => {
        document.body.className = "app-body " + ((this.state.darkMode) ? Classes.DARK : "");
        return (
            <div>
                {this.props.children}
            </div>
        )
    }
}

export default SideApp;
