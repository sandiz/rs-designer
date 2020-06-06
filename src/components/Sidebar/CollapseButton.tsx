import React from 'react';
import { Button, Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

export interface CollapseProps {
    parent: React.Component;
    expanded: boolean;
}

class CollapseButton extends React.Component<CollapseProps, {}> {
    public toggleCollapse() {
        this.props.parent.setState({ expanded: !this.props.expanded });
    }

    render = () => {
        return (
            <Button
                onClick={() => this.toggleCollapse()}
                className="score-item-icon"
                minimal
                icon={(
                    <Icon
                        className=""
                        iconSize={18}
                        icon={this.props.expanded ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_UP}
                    />
                )}
            />
        )
    }
}

export default CollapseButton;
