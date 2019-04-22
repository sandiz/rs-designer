import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { Tabs, Tab, Form } from 'react-bootstrap'
import PropTypes from 'prop-types';
import {
    disableKbdShortcuts, enableKbdShortcuts,
} from '../../lib/utils';
import DraggableLayout from './draggableLayout'
import ForageService, { SettingsForageKeys } from '../../services/forage';


const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};
class SettingsModal extends React.Component {
    constructor(props) {
        super(props);
        const items = [
            {
                text: 'Controls',
                id: 'control',
                icon: "fas fa-sliders-h",
                checked: true,
            },
            {
                text: 'Waveform',
                id: 'waveform',
                icon: "fas fa-wave-square",
                checked: true,
            },
            {
                text: 'Chromagram',
                id: 'chromagram',
                icon: "far fa-chart-bar",
                checked: true,
            },
            {
                text: 'Tabs',
                id: 'tabs',
                icon: "fas fa-guitar",
                checked: true,
            },
            {
                text: 'CDLC Creator',
                id: 'cdlc',
                icon: "fas fa-download",
                checked: true,
            },
            {
                text: 'Credits',
                id: 'credits',
                icon: "fas fa-drum",
                checked: false,
            },
        ];
        this.state = {
            currentTab: 'layout',
            layouts: items,
            advanced: {
                key_profile: 'bgate',
                cqt_colormap: 'bone',
            },

        }
    }

    componentDidMount = async () => {
        const ser = await ForageService.get(SettingsForageKeys.APP_SETTINGS);
        this.setState({
            layouts: ser.layouts,
            advanced: ser.advanced,
        })
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

    onSave = async (e) => {
        this.props.onClose();
        const {
            //eslint-disable-next-line
            currentTab,
            ...rest
        } = this.state;
        await ForageService.set(SettingsForageKeys.APP_SETTINGS, rest);
    }

    onChange = (e, type) => {
        const arr = { ...this.state.advanced }
        arr[type] = e.target.value;
        this.setState({
            advanced: arr,
        })
    }

    layoutDragEnd = (result) => {
        if (!result.destination) {
            return;
        }

        const layouts = reorder(
            this.state.layouts,
            result.source.index,
            result.destination.index,
        );

        this.setState({
            layouts,
        });
    }

    layoutCheck = (id) => {
        const layouts = Array.from(this.state.layouts);
        for (let i = 0; i < layouts.length; i += 1) {
            const item = layouts[i];
            if (item.id === id) {
                layouts[i].checked = !item.checked;
                this.setState({
                    layouts,
                });
                return;
            }
        }
    }

    render() {
        const {
            //eslint-disable-next-line
            onClose, ...rest
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
                                    <Tab eventKey="layout" title="Layout">
                                        <div className="gen-settings-tab">
                                            <div className="ta-center">
                                                <span className="text-muted">Drag/drop to rearrange layout, check/uncheck to toggle visibility</span>
                                            </div>
                                            <DraggableLayout items={this.state.layouts} onDragEnd={this.layoutDragEnd} onCheck={this.layoutCheck} />
                                        </div>
                                    </Tab>
                                    <Tab eventKey="advanced" title="Advanced">
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
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.key_profile}
                                                        onChange={e => this.onChange(e, "key_profile")}
                                                    >
                                                        <option>2</option>
                                                        <option value="bgate">bgate</option>
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
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.cqt_colormap}
                                                        onChange={e => this.onChange(e, "cqt_colormap")}
                                                    >
                                                        <option>2</option>
                                                        <option value="bone">bone</option>
                                                        <option>3</option>
                                                        <option>4</option>
                                                        <option>5</option>
                                                    </Form.Control>
                                                </div>
                                            </div>
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
