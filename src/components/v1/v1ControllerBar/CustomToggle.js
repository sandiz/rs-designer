import React, { Component } from 'react'
import PropTypes from 'prop-types';

class CustomToggle extends Component {
    constructor(props, context) {
        super(props, context);

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e) {
        e.preventDefault();

        this.props.onClick(e);
    }

    render() {
        return (
            <a href="" onClick={this.handleClick}>
                {this.props.children}
            </a>
        );
    }
}


CustomToggle.propTypes = {
    onClick: PropTypes.func,
    children: PropTypes.object,
};

CustomToggle.defaultProps = {
    onClick: () => { },
    children: {},
};

export default CustomToggle;
