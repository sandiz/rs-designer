import React from 'react';
import {
    MenuItem, Tag, Button, OverflowList, Boundary, Menu, Popover, Icon, PopoverInteractionKind, //Classes,
} from "@blueprintjs/core";
import { ItemPredicate, IItemRendererProps } from "@blueprintjs/select";
import { IconNames } from '@blueprintjs/icons';
import {
    Instrument, InstrumentOptions, InstrumentNotesInMem,
} from "../../types/project";
import ProjectService from "../../services/project";
import { hashCode, UUID } from '../../lib/utils';

export interface InstrumentListItem {
    isDivider: boolean;
    title: string;
    instrumentNotes: InstrumentNotesInMem;
    key: keyof typeof Instrument;
    hash: string;
}

export const filterIFile: ItemPredicate<InstrumentListItem> = (query, file) => {
    if (query.length === 0) return true;
    else {
        if (file) return file.instrumentNotes.tags.findIndex(item => item.includes(query.toLowerCase())) !== -1 || file.isDivider
    }
    return true;
}
export const getIndexFromDivider = (file: InstrumentListItem, files: InstrumentListItem[]) => {
    let lastDivider = 0;
    let instIndex = 0;
    for (let i = 0; i < files.length; i += 1) {
        const item = files[i];
        if (item.isDivider) lastDivider = i;
        else {
            if (item.hash === file.hash) {
                instIndex = i;
                break;
            }
        }
    }
    return [instIndex, lastDivider];
}
export const renderFile = (
    file: InstrumentListItem,
    { handleClick, modifiers }: IItemRendererProps,
    current: InstrumentListItem | null,
    files: InstrumentListItem[],
) => {
    if (!modifiers.matchesPredicate) {
        return null;
    }
    const indexDiv = getIndexFromDivider(file, files);
    const titleElement = (
        <div style={{ display: 'flex' }}>
            <div style={{ width: 140 + 'px' }}>
                Chart #<span className="number">{indexDiv[0] - indexDiv[1]}</span>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                width: 100 + '%',
            }}>
                <OverflowList
                    collapseFrom={Boundary.END}
                    minVisibleItems={3}
                    overflowRenderer={items => (
                        <Popover
                            interactionKind={PopoverInteractionKind.HOVER}
                            content={(
                                <Menu>
                                    {
                                        items.map(i => <MenuItem key={i} text={(<Tag>{i}</Tag>)} />)
                                    }
                                </Menu>

                            )}>
                            <Icon icon={IconNames.MORE} />
                        </Popover>
                    )}
                    visibleItemRenderer={i => <Tag className="info-item-control" key={i + UUID()}>{i}</Tag>}
                    items={file.instrumentNotes.tags}
                />
            </div>
        </div>
    );
    if (file.isDivider) {
        const title = (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                    fontSize: 16 + 'px',
                }}>
                    {file.title}
                </div>
                <div style={{ width: 100 + '%', display: 'inline-block', textAlign: 'right' }}>
                    <Button icon={IconNames.ADD} onClick={handleClick} minimal />
                </div>
            </div>
        );
        return (
            <MenuItem
                active={modifiers.active}
                disabled={modifiers.disabled}
                key={file.title + file.hash}
                text={title}
            />
        )
    }
    return (
        <MenuItem
            icon={IconNames.DOCUMENT}
            active={current?.hash === file.hash}
            disabled={modifiers.disabled}
            text={titleElement}
            key={file.title + file.hash}
            onClick={handleClick}
        />
    );
}

export function addFileToArray(files: InstrumentListItem[], fileToAdd: InstrumentListItem) {
    return [...files, fileToAdd];
}

export function arrayContainsFile(files: InstrumentListItem[], fileToFind: InstrumentListItem): boolean {
    return files.some((file: InstrumentListItem) => file.hash === fileToFind.hash);
}

export function deleteFileFromArray(films: InstrumentListItem[], filmToDelete: InstrumentListItem) {
    return films.filter(film => film !== filmToDelete);
}

export function isInstrumentFileDisabled(item: InstrumentListItem) {
    return item.isDivider;
}

export function areFilesEqual(fileA: InstrumentListItem, fileB: InstrumentListItem) {
    // Compare only the titles (ignoring case) just for simplicity.
    return fileA.hash === fileB.hash;
}

export function maybeAddCreatedFileToArrays(
    items: InstrumentListItem[],
    createdItems: InstrumentListItem[],
    film: InstrumentListItem,
): { createdItems: InstrumentListItem[]; items: InstrumentListItem[] } {
    const isNewlyCreatedItem = !arrayContainsFile(items, film);
    return {
        createdItems: isNewlyCreatedItem ? addFileToArray(createdItems, film) : createdItems,
        // Add a created film to `items` so that the film can be deselected.
        items: isNewlyCreatedItem ? addFileToArray(items, film) : items,
    };
}

export function maybeDeleteCreatedFilmFromArrays(
    items: InstrumentListItem[],
    createdItems: InstrumentListItem[],
    film: InstrumentListItem,
): { createdItems: InstrumentListItem[]; items: InstrumentListItem[] } {
    const wasItemCreatedByUser = arrayContainsFile(createdItems, film);

    // Delete the item if the user manually created it.
    return {
        createdItems: wasItemCreatedByUser ? deleteFileFromArray(createdItems, film) : createdItems,
        items: wasItemCreatedByUser ? deleteFileFromArray(items, film) : items,
    };
}

export function getAllFiles() {
    const files: InstrumentListItem[] = [];
    const info = ProjectService.getInstruments();
    if (info) {
        //eslint-disable-next-line
        for (const key in Instrument) {
            const instFiles = info[key as keyof typeof Instrument];
            const title = InstrumentOptions[key as keyof typeof Instrument].title;
            files.push({
                title,
                isDivider: true,
                key: key as keyof typeof Instrument,
                instrumentNotes: { notes: [], tags: [] },
                hash: "-1",
            });

            for (let i = 0; i < instFiles.length; i += 1) {
                const item = instFiles[i];
                const inotes = { notes: [...item.notes], tags: [...item.tags] };
                const hash = hashCode(JSON.stringify(inotes) + i.toString() + key);
                files.push({
                    title,
                    isDivider: false,
                    key: key as keyof typeof Instrument,
                    instrumentNotes: inotes,
                    hash,
                })
            }
        }
    }
    return files;
}
