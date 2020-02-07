import React from 'react'
import Modal from 'react-bootstrap/Modal'
import { ImportMediaStates } from '../../lib/libWaveSurfer'

function ImportMediaModal(props) {
    const spinnerActiveClass = "spinner-grow text-info spinner";
    const spinnerCompleteClass = "spinner-grow-noanim text-success spinner"
    const imComplete = props.completed.includes(ImportMediaStates.importing);
    const rtComplete = props.completed.includes(ImportMediaStates.readingTags);
    const wsComplete = props.completed.includes(ImportMediaStates.wavesurfing);
    return (
        <Modal
            //eslint-disable-next-line
            {...props}
            size="med"
            aria-labelledby="contained-modal-title-vcenter"
            centered
            onHide={() => { }}
        >
            <Modal.Header>
                <Modal.Title id="contained-modal-title-vcenter">
                    Please Wait...
        </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Importing Media
           <div className={imComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
                    <span className="sr-only">Loading...</span>
                </div>
                <br />
                Reading Tags
           <div className={rtComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
                    <span className="sr-only">Loading...</span>
                </div>
                <br />
                Wave Surfing
           <div className={wsComplete ? spinnerCompleteClass : spinnerActiveClass} role="status">
                    <span className="sr-only">Loading...</span>
                </div>
                <br />
            </Modal.Body>
        </Modal>
    );
}
export default ImportMediaModal;
