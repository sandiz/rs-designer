import {
    Instrument, InstrumentOptions, InstrumentNotesInMem,
} from "../../types/project";
import ProjectService from "../../services/project";
import { hashCode } from '../../lib/utils';

export interface InstrumentListItem {
    title: string;
    instrumentNotes: InstrumentNotesInMem;
    key: keyof typeof Instrument;
    hash: string;
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

export function isInstrumentFileDisabled() {
    return false;
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
            for (let i = 0; i < instFiles.length; i += 1) {
                const item = instFiles[i];
                const inotes = { notes: [...item.notes], tags: [...item.tags] };
                const hash = hashCode(JSON.stringify(inotes) + i.toString() + key);
                files.push({
                    title,
                    key: key as keyof typeof Instrument,
                    instrumentNotes: inotes,
                    hash,
                })
            }
        }
    }
    return files;
}
