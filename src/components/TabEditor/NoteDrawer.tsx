import React from 'react'
import classNames from 'classnames';
import {
    Button, Icon, Card, Classes, Tabs, Tab, Callout, NumericInput, Divider, Intent,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ButtonExtended } from '../Extended/FadeoutSlider';
import { NoteTime } from '../../types/musictheory';
import TabEditor from './TabEditor';

interface NoteDrawerProps {
    isOpen: boolean;
    toggleEditor: () => void;
    tabEditor: TabEditor;
}

type TAB_TYPE = "note" | "chord"
interface NoteDrawerState {
    currentTab: TAB_TYPE;
    selectedNotes: NoteTime[];
}

class NoteDrawer extends React.Component<NoteDrawerProps, NoteDrawerState> {
    constructor(props: NoteDrawerProps) {
        super(props);
        this.state = { currentTab: "note", selectedNotes: [] }
    }

    componentDidMount = () => {
        if (this.props.tabEditor.noteEditorRef.current) {
            this.props.tabEditor.noteEditorRef.current.emitter.off("selected-notes", this.notesChanged);
            this.props.tabEditor.noteEditorRef.current.emitter.on("selected-notes", this.notesChanged);
        }
    }

    componentWillUnmount = () => {
        if (this.props.tabEditor.noteEditorRef.current) {
            this.props.tabEditor.noteEditorRef.current.emitter.off("selected-notes", this.notesChanged);
        }
    }

    notesChanged = (selectedNotes: NoteTime[]) => {
        this.setState({ selectedNotes })
    }

    editValid = () => this.state.selectedNotes.length === 1

    focus = () => {
        const node = document.getElementById("note-settings-string-ni");
        if (node) {
            console.log("focus")
            setTimeout(() => node.focus(), 500);
        }
    }

    render = () => {
        return (
            <div
                tabIndex={-1}
                className={classNames("notes-drawer-button",
                    {
                        "slide-in": this.props.isOpen === true,
                        "slide-out": this.props.isOpen === false,
                    })}
            >
                <div tabIndex={-1}>
                    <Button
                        icon={
                            <Icon icon={this.props.isOpen ? IconNames.CHEVRON_RIGHT : IconNames.CHEVRON_LEFT} iconSize={16} />
                        }
                        small
                        onClick={this.props.toggleEditor}
                        active={this.props.isOpen}
                    />
                </div>
                <Card
                    className={classNames("notes-drawer-editor", Classes.ELEVATION_2)}>
                    <Tabs
                        className="number nde-tabs"
                        id="TabsExample"
                        onChange={t => this.setState({ currentTab: t.toString() as TAB_TYPE })}
                        selectedTabId={this.state.currentTab}
                        large
                    >
                        <Tab
                            className="nde-tab"
                            id="note"
                            title="NOTE"
                            panel={
                                (
                                    <NotePanel
                                        editValid={this.editValid}
                                        note={this.editValid() ? this.state.selectedNotes[0] : null}
                                        numNotes={this.state.selectedNotes.length}
                                    />
                                )
                            } />
                        <Tab className="nde-tab" id="chord" title="CHORD" panel={<div />} panelClassName="ember-panel" />
                    </Tabs>
                </Card>
            </div>
        )
    }
}

interface NotePanelProps {
    editValid: () => boolean;
    note: NoteTime | null;
    numNotes: number;
}
export const NotePanel: React.FunctionComponent<NotePanelProps> = (props: NotePanelProps) => {
    return (
        <div className="note-panel">
            <div className="note-and-options">
                <Callout
                    className={classNames(Classes.INTENT_PRIMARY, "note-callout")}
                >
                    {
                        props.editValid()
                            ? (<span>C</span>)
                            : (<span />)
                    }
                </Callout>
                <div className="note-settings">
                    <div className="note-settings-row">
                        <div className={Classes.TEXT_MUTED}>STRING</div>
                        <div className="note-settings-input-container">
                            <NumericInput
                                id="note-settings-string-ni"
                                tabIndex={0}
                                buttonPosition="none"
                                className={classNames("number", "region-time-picker")}
                                value={props.note ? props.note.string + 1 : -1}
                                min={-1}
                                max={100}
                                allowNumericCharactersOnly
                                clampValueOnBlur
                            />
                        </div>
                    </div>
                    <div className="note-settings-row">
                        <div className={Classes.TEXT_MUTED}>FRET</div>
                        <div className="note-settings-input-container">
                            <NumericInput
                                tabIndex={0}
                                buttonPosition="none"
                                className={classNames("number", "region-time-picker")}
                                value={props.note ? props.note.fret : -1}
                                min={-1}
                                max={100}
                                allowNumericCharactersOnly
                                clampValueOnBlur
                            />
                        </div>
                    </div>
                    <div className="note-settings-row">
                        <div className={Classes.TEXT_MUTED}>FINGER</div>
                        <div className="note-settings-input-container">
                            <NumericInput
                                tabIndex={0}
                                buttonPosition="none"
                                className={classNames("number", "region-time-picker")}
                                value={-1}
                                min={-1}
                                max={100}
                                allowNumericCharactersOnly
                                clampValueOnBlur
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <br />
                {
                    !props.editValid()
                        ? (<div className={Classes.TEXT_DISABLED}>{props.numNotes > 1 ? "MULTIPLE NOTES" : "NO NOTE"} SELECTED</div>)
                        : (<div className={Classes.TEXT_DISABLED}>more options</div>)
                }
                <br />
                <br />
                <br />
            </div>
            <Divider />
            <div
                className="note-buttons"
            >
                <ButtonExtended
                    intent={Intent.NONE}
                    icon={IconNames.SAVED}
                    text="Save"
                    disabled={!props.editValid()}
                />
                <ButtonExtended
                    className="note-button-delete"
                    intent={Intent.NONE}
                    icon={
                        <Icon icon={IconNames.DELETE} intent={Intent.DANGER} className={Classes.INTENT_DANGER} />
                    }
                    text="Delete"
                    disabled={!props.editValid()}
                />
            </div>
        </div>

    )
}

export default NoteDrawer;
