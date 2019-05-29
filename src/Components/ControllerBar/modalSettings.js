import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { Tabs, Tab, Form } from 'react-bootstrap'
import PropTypes from 'prop-types';
import {
    disableKbdShortcuts, enableKbdShortcuts, enableBodyDrag, disableBodyDrag, toaster,
} from '../../lib/utils';
import DraggableLayout from './draggableLayout'
import { SettingsService, SettingsModel } from '../../services/settings';
import ForageService from '../../services/forage';

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
        await this.loadSettings();
    }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        if (nextProps.show) {
            await this.loadSettings();
            disableKbdShortcuts();
            disableBodyDrag();
        }
        else {
            enableKbdShortcuts();
            enableBodyDrag();
        }
        return true;
    }

    loadSettings = async () => {
        const ser = await SettingsService.getAll();
        if (!ser) {
            this.setState({
                layouts: SettingsModel.layouts,
                advanced: SettingsModel.advanced,
            })
            return;
        }
        this.setState({
            layouts: ser.layouts,
            advanced: ser.advanced,
        });
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

    onSelectChange = (e, type, category = 'advanced') => {
        const arr = { ...this.state[category] }
        arr[type] = e.target.value;
        const news = {}
        news[category] = arr;

        this.setState(news);
    }

    onCheckboxChange = (e, type, category = 'advanced') => {
        const arr = { ...this.state[category] }
        arr[type] = e.target.checked;

        const news = {}
        news[category] = arr;
        this.setState(news);
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

    resetToDefault = async () => {
        await ForageService.clearAll();
        toaster('success', '', 'Settings are now reset to default!', {
            toastId: 'settings-toaster',
        });
        this.props.onClose();
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
                                                <span className="text-muted">Drag/drop to rearrange layout, check/uncheck to toggle modules</span>
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
                                                <div className="ml-auto mt-14">
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.key_profile}
                                                        onChange={e => this.onSelectChange(e, "key_profile")}
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
                                                <div style={{ width: 71 + '%' }}>
                                                    <span>Chromagram Colormap</span>
                                                    <div>
                                                        <small className="text-muted d-inline-block">
                                                            colormap used by the chromagram. These are based on <a
                                                                href="#"
                                                                onClick={() => electron.shell.openExternal("https://matplotlib.org/2.0.2/examples/color/colormaps_reference.html")}>matplotlib colormaps.</a>
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto mt-14">
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.cqt_colormap}
                                                        onChange={e => this.onSelectChange(e, "cqt_colormap")}
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
                                            <br />
                                            <div className="d-flex flex-row">
                                                <div style={{ width: 71 + '%' }}>
                                                    <span>Stats Meter</span>
                                                    <div>
                                                        <small className="text-muted d-inline-block">
                                                            shows fps/mem/ms stats, clicking on the meter toggles states
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto mt-14">
                                                    <input
                                                        style={{
                                                            marginRight: 10 + 'px',
                                                            marginTop: 5 + 'px',
                                                        }}
                                                        type="checkbox"
                                                        checked={this.state.advanced.show_fps}
                                                        onChange={e => this.onCheckboxChange(e, "show_fps")} />
                                                </div>
                                            </div>
                                            <br />
                                            <div className="d-flex flex-row">
                                                <div style={{ width: 71 + '%' }}>
                                                    <span>GPU Power Preference</span>
                                                    <div>
                                                        <small className="text-muted d-inline-block">
                                                            provides a hint to the renderer indicating what configuration of GPU is suitable for WebGL context. (changes take effect on open/import)
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="ml-auto mt-14">
                                                    <Form.Control
                                                        as="select"
                                                        value={this.state.advanced.power_preference}
                                                        onChange={e => this.onSelectChange(e, "power_preference")}
                                                    >
                                                        <option value="default">default</option>
                                                        <option value="high-performance">high-performance</option>
                                                        <option value="low-power">low-power</option>
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
                        <button onClick={this.resetToDefault} type="button" className="btn btn-secondary btn-lg" style={{ marginLeft: 15 + 'px' }}>
                            Reset to defaults
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
