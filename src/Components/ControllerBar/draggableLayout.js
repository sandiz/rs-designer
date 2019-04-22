/* eslint-disable */
import React from "react";
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

/*const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};*/

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: "none",
    margin: `0 0 ${grid}px 0`,
    padding: 13 + 'px',
    // change background colour if dragging
    background: isDragging ? "lightgreen" : "#343a40",

    // styles we need to apply on draggables
    ...draggableStyle,
});

const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? "#375a7f" : "inherit",
    padding: grid,
    width: "99%",
    margin: `0 auto`,
    paddingTop: 16 + 'px',
});

class DraggableLayout extends React.PureComponent {
    render() {
        return (
            <DragDropContext onDragEnd={this.props.onDragEnd}>
                <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={getListStyle(snapshot.isDraggingOver)}
                        >
                            {
                                this.props.items.map((request, index) => (
                                    <Draggable key={request.id} draggableId={request.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(
                                                    snapshot.isDragging,
                                                    provided.draggableProps.style,
                                                )}
                                            >

                                                <div className="d-flex">
                                                    {
                                                        "checked" in request
                                                            ? <input
                                                                style={{
                                                                    marginRight: 10 + 'px',
                                                                    marginTop: 5 + 'px',
                                                                }}
                                                                type="checkbox"
                                                                key={request.id}
                                                                checked={request.checked}
                                                                onChange={() => {
                                                                    request.checked = !request.checked
                                                                }} />
                                                            : null
                                                    }
                                                    <div className="pl-flex-1">{request.text}</div>
                                                    <div style={{ marginLeft: 'auto' }}>{request.icon}</div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        )
    }
}

DraggableLayout.propTypes = {
    items: PropTypes.array,
    onDragEnd: PropTypes.func,
};

DraggableLayout.defaultProps = {
    items: [],
    onDragEnd: () => { },
};

export default DraggableLayout;
