import React from 'react';
import {
    Classes, FocusStyleManager,
} from "@blueprintjs/core"
import AppContext from './context';

const { nativeTheme } = window.require("electron").remote;

interface SideAppProps {
    children: React.ReactElement;
}
interface SideAppState {
    darkMode: boolean;
}
class SideApp extends React.Component<SideAppProps, SideAppState> {
    context!: React.ContextType<typeof AppContext>;
    componentDidMount = () => {
        nativeTheme.on('updated', this.changeAppColor);
        FocusStyleManager.onlyShowFocusOnTabs();
        this.state = { darkMode: this.context.isDarkTheme() }
    }

    componentWillUnmount = () => {
        nativeTheme.off('updated', this.changeAppColor);
    }

    changeAppColor = (): void => {
        this.setState({ darkMode: this.context.isDarkTheme() });
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
SideApp.contextType = AppContext;


export default SideApp;
