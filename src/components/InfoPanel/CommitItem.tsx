import React from 'react';
import { CommitDescription } from 'isomorphic-git';
import {
    MenuItem, Callout,
} from "@blueprintjs/core";
import { ItemPredicate, IItemRendererProps } from "@blueprintjs/select";
import { IconNames } from '@blueprintjs/icons';


export const filterCommit: ItemPredicate<CommitDescription> = (query, commit) => {
    if (query.length === 0) return true;
    else {
        if (commit) return commit.message.includes(query);
    }
    return true;
}

export const renderCommit = (
    commit: CommitDescription,
    { handleClick, modifiers }: IItemRendererProps,
    current: string,
    //commits: CommitDescription[],
) => {
    if (!modifiers.matchesPredicate) {
        return null;
    }
    const titleElement = (
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 + 'px' }}>
            <div style={{ width: 140 + 'px' }} className="number">
                {new Date(commit.author.timestamp * 1000).toLocaleString()}
            </div>
            <Callout style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'left',
                width: 100 + '%',
                padding: 7 + 'px',
                paddingTop: 3 + 'px',
                paddingBottom: 3 + 'px',
            }}>
                <pre style={{
                    margin: 0,
                    maxHeight: 6 + 'vh',
                    overflow: 'auto',
                }}>
                    {commit.message.trim()}
                </pre>
            </Callout>
        </div>
    );
    return (
        <MenuItem
            icon={IconNames.DOCUMENT}
            active={current === commit.oid}
            disabled={modifiers.disabled}
            text={titleElement}
            key={commit.oid}
            onClick={handleClick}
        />
    );
}

export function addCommitToArray(commits: CommitDescription[], commitToAdd: CommitDescription) {
    return [...commits, commitToAdd];
}

export function arrayContainsCommit(commits: CommitDescription[], commitToFind: CommitDescription): boolean {
    return commits.some((commit: CommitDescription) => commit.oid === commitToFind.oid);
}

export function areCommitsEqual(commitA: CommitDescription, commitB: CommitDescription) {
    // Compare only the titles (ignoring case) just for simplicity.
    return commitA.oid === commitB.oid;
}
