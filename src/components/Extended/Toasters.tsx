import {
    Intent,
    IToastProps,
    Toaster,
    IToaster,
    Position,
    ProgressBar,
    Icon,
} from "@blueprintjs/core";
import { IconNames, IconName } from "@blueprintjs/icons";
import React from 'react'
import './Toasters.scss';

const toaster: IToaster = Toaster.create({
    autoFocus: false,
    canEscapeKeyClear: true,
    position: Position.TOP,
});

export const successToaster = (msg: string, intent: Intent = Intent.SUCCESS, icon: IconName = IconNames.TICK): string => {
    const toast: IToastProps = {
        className: "success-toaster",
        icon,
        intent,
        message: msg,
        timeout: 2000,
    };
    return toaster.show(toast);
}

export const progressToaster = (msg: string, amount: number, total: number, key?: string | undefined, intent: Intent = Intent.SUCCESS): string => {
    const toast: IToastProps = {
        className: "indeterminate-toaster",
        message: (
            <React.Fragment>
                <div className="msg-container">
                    <div className="msg-message">
                        <Icon className="msg-icon" icon={IconNames.DOCUMENT_OPEN} />
                        {msg}
                    </div>
                </div>
                <ProgressBar
                    intent={amount < total ? Intent.PRIMARY : intent}
                    value={amount / total}

                />
            </React.Fragment>
        ),
        timeout: amount < total ? 0 : 2000,
    };
    return toaster.show(toast, key);
}
export default {};
