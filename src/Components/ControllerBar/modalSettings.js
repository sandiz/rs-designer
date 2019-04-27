import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { Tabs, Tab, Form } from 'react-bootstrap'
import PropTypes from 'prop-types';
import {
    disableKbdShortcuts, enableKbdShortcuts, enableBodyDrag, disableBodyDrag,
} from '../../lib/utils';
import DraggableLayout from './draggableLayout'
import { SettingsService, SettingsModel } from '../../services/settings';

const electron = window.require("electron");

const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};
class SettingsModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentTab: 'layout',
            ...SettingsModel,
        }
    }

    componentDidMount = async () => {
        // const ser = await ForageService.get(SettingsForageKeys.APP_SETTINGS);
        const ser = await SettingsService.getAll();
        if (!ser) return;
        this.setState({
            layouts: ser.layouts,
            advanced: ser.advanced,
        })
    }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        if (nextProps.show) {
            disableKbdShortcuts();
            disableBodyDrag();
        }
        else {
            enableKbdShortcuts();
            enableBodyDrag();
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
        await SettingsService.setAll(rest);
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
                                                <span className="text-muted">Drag/drop to rearrange layout, check/uncheck to add/remove modules</span>
                                            </div>
                                            <DraggableLayout items={this.state.layouts} onDragEnd={this.layoutDragEnd} onCheck={this.layoutCheck} />
                                        </div>
                                    </Tab>
                                    <Tab eventKey="advanced" title="Advanced">
                                        <div className="gen-settings-tab">
                                            <div className="d-flex flex-row">
                                                <div style={{ width: 71 + '%' }}>
                                                    <span>Key Detection Profile</span>
                                                    <div>
                                                        <small className="text-muted d-inline-block">
                                                            the type of polyphic profile to use for key detection, profile types are defined&nbsp;
                                                            <a
                                                                onClick={() => electron.shell.openExternal("https://essentia.upf.edu/documentation/reference/std_Key.html")}
                                                                href="#">
                                                                here
                                                            </a>
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.key_profile}
                                                        onChange={e => this.onChange(e, "key_profile")}
                                                    >
                                                        <option value="diatonic">diatonic</option>
                                                        <option value="bgate">bgate</option>
                                                        <option value="krumhansi">krumhansl</option>
                                                        <option value="temperley">temperley</option>
                                                        <option value="shaath">shaath</option>
                                                        <option value="edma">edma</option>
                                                        <option value="edmm">edmm</option>
                                                        <option value="braw">braw</option>
                                                        <option value="edma">edma</option>
                                                    </Form.Control>
                                                </div>
                                            </div>
                                            <br />
                                            <div className="d-flex flex-row">
                                                <div>
                                                    <span>Chromagram Colormap</span>
                                                    <div>
                                                        <small className="text-muted d-inline-block">
                                                            colormap used by the chromagram. These are based on <a
                                                                href="#"
                                                                onClick={() => electron.shell.openExternal("https://matplotlib.org/2.0.2/examples/color/colormaps_reference.html")}>matplotlib colormaps.</a>
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.cqt_colormap}
                                                        onChange={e => this.onChange(e, "cqt_colormap")}
                                                    >
                                                        <option value="bone_r">bone</option>
                                                        <option value="Spectral">Spectral</option>
                                                        <option value="RdYlGn">Yellow-Green</option>
                                                        <option value="RdGy">Gray</option>
                                                        <option value="PuOr">Purple</option>
                                                        <option value="RdBu">Blue</option>
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
