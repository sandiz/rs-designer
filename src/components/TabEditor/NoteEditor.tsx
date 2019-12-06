import React from 'react';

import './TabEditor.scss';

class NoteEditor extends React.Component<{}, {}> {
    constructor(props: {}) {
        super(props);
        console.log("Asd");
    }
    render = () => {
        return (
            <div className="neck">
                <div className="strings strings-first" />
                <div className="strings" />
                <div className="strings" />
                <div className="strings" />
                <div className="strings" />
            </div>
        );
    }
}

export default NoteEditor;
