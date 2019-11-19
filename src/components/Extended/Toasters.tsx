import {
    Intent,
    IToastProps,
    Toaster,
    IToaster,
    Position,
    ProgressBar,
    Icon,
    IActionProps,
} from "@blueprintjs/core";
import { IconNames, IconName } from "@blueprintjs/icons";
import classNames from 'classnames';
import React from 'react'
import './Toasters.scss';

const toaster: IToaster = Toaster.create({
    autoFocus: false,
    canEscapeKeyClear: true,
    position: Position.TOP,
});


export const successToaster = (msg: string, intent: Intent = Intent.SUCCESS, icon: IconName = IconNames.TICK, action: IActionProps = {}, timeout = 2000, onDismiss: (didTimeoutExpire: boolean) => void = () => { }, className = ""): string => {
    const toast: IToastProps = {
        className: classNames("success-toaster", className),
        icon,
        intent,
        message: msg,
        timeout,
        action,
        onDismiss,
    };
    return toaster.show(toast);
}

export const errorToaster = (msg: string, intent: Intent = Intent.DANGER, icon: IconName = IconNames.ERROR): string => {
    return successToaster(msg, intent, icon);
}

export const progressToaster = (msg: string, amount: number, total: number, key?: string | undefined, progressBarIntent: Intent = Intent.SUCCESS, icon: IconName = IconNames.DOCUMENT_OPEN): string => {
    const toast: IToastProps = {
        className: "indeterminate-toaster",
        message: (
            <React.Fragment>
                <div className="msg-container">
                    <div className="msg-message">
                        <Icon className="msg-icon" icon={icon} />
                        {msg}
                    </div>
                </div>
                <ProgressBar
                    intent={amount < total ? Intent.PRIMARY : progressBarIntent}
                    value={amount / total}
                />
            </React.Fragment>
        ),
        timeout: amount < total ? 0 : 2000,
    };
    return toaster.show(toast, key);
}

export const dismissToaster = (key: string): void => {
    toaster.dismiss(key);
}
export default {};
