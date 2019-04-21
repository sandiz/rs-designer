import React from 'react'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import PropTypes from 'prop-types';
import * as nothumb from '../../assets/nothumb.jpg'
import {
    setStateAsync, disableKbdShortcuts, enableKbdShortcuts, readFile,
} from '../../lib/utils';

const electron = window.require("electron");

class MetadataEditorModal extends React.Component {
    constructor(props) {
        super(props);
        this.coverArtRef = React.createRef();
        this.state = {
            artist: props.metadata ? props.metadata.artist : "",
            song: props.metadata ? props.metadata.song : "",
            album: props.metadata ? props.metadata.album : "",
            year: props.metadata ? props.metadata.year : "",
            image: props.metadata ? Buffer.from(props.metadata.image, 'base64') : "",
        }
    }

    componentDidMount = () => {
        this.updateImage();
    }

    updateImage = () => {
        if (this.coverArtRef.current) {
            if (this.state.image === "") {
                this.coverArtRef.current.src = nothumb.default;
            }
            else {
                this.coverArtRef.current.src = 'data:image/jpeg;base64,' + this.state.image.toString('base64')
            }
        }
    }

    uploadImage = async (e) => {
        const files = electron.remote.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: 'JPG', extensions: ['jpg'] },
                { name: 'PNG', extensions: ['png'] },
            ],
        });
        if (files === null || typeof files === 'undefined' || files.length <= 0) {
            return;
        }
        const file = files[0];
        const data = await readFile(file);
        this.setState({
            image: data,
        });
        this.updateImage();
    }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        await setStateAsync(this, {
            artist: nextProps.metadata ? nextProps.metadata.artist : "",
            song: nextProps.metadata ? nextProps.metadata.song : "",
            album: nextProps.metadata ? nextProps.metadata.album : "",
            year: nextProps.metadata ? nextProps.metadata.year : "",
            image: nextProps.metadata ? Buffer.from(nextProps.metadata.image, 'base64') : "",
        });
        this.updateImage();
        if (nextProps.show) {
            disableKbdShortcuts();
        }
        else {
            enableKbdShortcuts();
        }
        return true;
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
        const {
            song, artist, album, year,
        } = this.state;
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
                <Modal.Header>
                    <Modal.Title
                        id="contained-modal-title-vcenter"
                        style={{
                            display: 'flex',
                            width: 100 + '%',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <h3>
                            Metadata Editor
                        </h3>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex flex-row">
                        <div style={{ width: 50 + '%' }}>
                            <div className="d-flex flex-col">
                                <Form.Group>
                                    <Form.Control type="title" placeholder="Song Title" value={song} onChange={e => this.onChange(e, "song")} />
                                </Form.Group>
                                <Form.Group>
                                    <Form.Control type="artist" placeholder="Artist" value={artist} onChange={e => this.onChange(e, "artist")} />
                                </Form.Group>
                                <Form.Group>
                                    <Form.Control type="album" placeholder="Album" value={album} onChange={e => this.onChange(e, "album")} />
                                </Form.Group>
                                <Form.Group>
                                    <Form.Control type="year" placeholder="Year" value={year} onChange={e => this.onChange(e, "year")} />
                                </Form.Group>
                            </div>
                        </div>
                        <div
                            className="flex-col d-flex justify-content-center"
                            style={{
                                width: 50 + '%',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                            <div>
                                <img alt="cover art" className="cover_img_lg" src={nothumb.default} ref={this.coverArtRef} />
                            </div>
                            <div
                                style={{
                                    fontSize: 28 + 'px',
                                    display: 'flex',
                                    width: 100 + '%',
                                    justifyContent: 'center',
                                }}>
                                <div style={{ margin: 2 + 'px' }}>
                                    <i className="fab fa-lastfm-square" />
                                </div>
                                <div style={{ marginLeft: 15 + 'px' }}>
                                    <a href="#" onClick={this.uploadImage}><i className="fas fa-upload" /></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr style={{ borderTop: "1px solid #444" }} />
                    <div
                        id=""
                        style={{
                            display: 'flex',
                            width: 100 + '%',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 24 + 'px',
                        }}>
                        <button onClick={e => this.props.onSave(e, this.state)} type="button" className="btn btn-primary btn-lg">
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
MetadataEditorModal.propTypes = {
    onClose: PropTypes.func,
    onSave: PropTypes.func,
    show: PropTypes.bool,
    metadata: PropTypes.object,
};

MetadataEditorModal.defaultProps = {
    onClose: () => { },
    onSave: () => { },
    show: false,
    metadata: null,
};

export default MetadataEditorModal;
