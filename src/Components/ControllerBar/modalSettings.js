import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { Tabs, Tab, Form } from 'react-bootstrap'
import PropTypes from 'prop-types';
import {
    disableKbdShortcuts, enableKbdShortcuts,
} from '../../lib/utils';
import DraggableLayout from './draggableLayout'

class SettingsModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentTab: 'general',
        }
        this.items = [
            {
                text: 'Controls',
                id: 'control',
                icon: <i className="fas fa-sliders-h" />,
                checked: true,
            },
            {
                text: 'Waveform',
                id: 'waveform',
                icon: <i className="fas fa-wave-square" />,
                checked: true,
            },
            {
                text: 'Chromagram',
                id: 'chromagram',
                icon: <i className="far fa-chart-bar" />,
                checked: true,
            },
            {
                text: 'Tabs',
                id: 'tabs',
                icon: <i className="fas fa-guitar" />,
                checked: true,
            },
            {
                text: 'CDLC Creator',
                id: 'cdlc',
                icon: <i className="fas fa-download" />,
                checked: true,
            },
            {
                text: 'Credits',
                id: 'credits',
                icon: <i className="fas fa-drum" />,
                checked: false,
            },
        ];
    }

    componentDidMount = () => {
    }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        if (nextProps.show) {
            disableKbdShortcuts();
        }
        else {
            enableKbdShortcuts();
        }
        return true;
    }

    onSave = (e) => {

    }

    onChange = (e, type) => {
        const news = {}
        news[type] = e.target.value;
        this.setState(news);
    }

    render() {
        const {
            //eslint-disable-next-line
            onSave, onClose, ...rest
        } = this.props;
        return (
            <Modal
                {...rest}
                size="med"
                aria-labelledby="contained-modal-title-vcenter"
                style={{
                    top: 15 + '%',
                }}
                onHide={() => { }}
            >
                <Modal.Body>
                    <div className="d-flex flex-row">
                        <div style={{ width: 100 + '%' }}>
                            <div className="d-flex flex-col" style={{ borderBottom: "1px solid #444", fontSize: 18 + 'px' }}>
                                <Tabs
                                    id="controlled-tab-example"
                                    activeKey={this.state.currentTab}
                                    onSelect={currentTab => this.setState({ currentTab })}
                                >
                                    <Tab eventKey="general" title="General">
                                        <div className="gen-settings-tab">
                                            <div className="d-flex flex-row">
                                                <div>
                                                    <span>Key Detection Profile</span>
                                                    <div>
                                                        <small className="text-muted">
                                                            Description of settings goes here
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <Form.Control as="select">
                                                        <option>bgate</option>
                                                        <option>2</option>
                                                        <option>3</option>
                                                        <option>4</option>
                                                        <option>5</option>
                                                    </Form.Control>
                                                </div>
                                            </div>
                                            <br />
                                            <div className="d-flex flex-row">
                                                <div>
                                                    <span>Chromagram Colormap</span>
                                                    <div>
                                                        <small className="text-muted">
                                                            Description of settings goes here
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <Form.Control as="select">
                                                        <option>bone</option>
                                                        <option>2</option>
                                                        <option>3</option>
                                                        <option>4</option>
                                                        <option>5</option>
                                                    </Form.Control>
                                                </div>
                                            </div>
                                        </div>
                                    </Tab>
                                    <Tab eventKey="layout" title="Layout">
                                        <div className="gen-settings-tab">
                                            <div className="ta-center">
                                                <span className="text-muted">Drag drop to rearrange layout</span>
                                            </div>
                                            <DraggableLayout items={this.items} />
                                        </div>
                                    </Tab>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                    <div
                        id=""
                        style={{
                            display: 'flex',
                            width: 100 + '%',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 24 + 'px',
                        }}>
                        <button onClick={this.onSave} type="button" className="btn btn-primary btn-lg">
                            Save
                        </button>
                        <button onClick={this.props.onClose} type="button" className="btn btn-secondary btn-lg" style={{ marginLeft: 15 + 'px' }}>
                            Cancel
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}
SettingsModal.propTypes = {
    onClose: PropTypes.func,
    show: PropTypes.bool,
};

SettingsModal.defaultProps = {
    onClose: () => { },
    show: false,
};

export default SettingsModal;
