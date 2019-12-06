import React, { FunctionComponent } from 'react'
import classNames from 'classnames';
import {
    Classes, Button, Intent, Popover,
    Position, Menu, MenuItem,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import NonIdealExtended from '../Extended/NonIdealExtended';
import { getImportUrlDialog } from '../../dialogs';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import * as AppLogo from '../../assets/icons/icon-1024x1024.png';
import '../Waveform/Waveform.scss';

const { app } = window.require('electron').remote;

function importMedia(external: string | null) {
    DispatcherService.dispatch(DispatchEvents.ImportMedia, external);
}

function getImportMenu() {
    return (
        <React.Fragment>
            <Menu large>
                <MenuItem
                    text="from Local File"
                    icon={IconNames.DOWNLOAD}
                    onClick={() => importMedia(null)}
                />
                <MenuItem
                    text="from URL"
                    icon={IconNames.CLOUD}
                    onClick={() => {
                        DispatcherService.dispatch(DispatchEvents.OpenDialog, getImportUrlDialog());
                    }} />
            </Menu>
        </React.Fragment>
    );
}

function openProject() {
    DispatcherService.dispatch(DispatchEvents.ProjectOpen);
}

export const IntroPanel: FunctionComponent<{}> = () => {
    const title = (
        <React.Fragment>
            <div className="number version">v{app.getVersion()}</div>
            <div className="font-weight-unset">
                Meend: Transcribe and Analyse Music
            </div>
        </React.Fragment>
    )
    const icon = (
        <div>
            <img src={AppLogo.default} alt="app logo" className="appLogo-waveform" />
        </div>
    )
    const description = (
        <div className="description-buttons">
            <Button large intent={Intent.PRIMARY} icon={IconNames.FOLDER_OPEN} onClick={openProject}>Open Project</Button>
            <Popover
                content={getImportMenu()}
                position={Position.BOTTOM}
            >
                <Button large icon={IconNames.IMPORT}>Import Media</Button>
            </Popover>
        </div>
    );
    return (
        <NonIdealExtended
            className={classNames(Classes.TEXT_DISABLED)}
            icon={icon}
            title={title}
            description={description} />
    );
}

export default {};
