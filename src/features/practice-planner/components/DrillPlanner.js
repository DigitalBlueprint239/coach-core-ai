"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrillPlanner = void 0;
const react_1 = __importDefault(require("react"));
const dnd_1 = require("@hello-pangea/dnd");
const usePracticeSession_1 = require("../hooks/usePracticeSession");
const DrillPlanner = () => {
    const { currentSession, reorderDrills } = (0, usePracticeSession_1.usePracticeStore)();
    const handleDragEnd = (result) => {
        if (!result.destination)
            return;
        reorderDrills(result.source.index, result.destination.index);
    };
    if (!currentSession)
        return null;
    return (react_1.default.createElement(dnd_1.DragDropContext, { onDragEnd: handleDragEnd },
        react_1.default.createElement(dnd_1.Droppable, { droppableId: "drills" }, (provided) => (react_1.default.createElement("div", Object.assign({}, provided.droppableProps, { ref: provided.innerRef }),
            currentSession.drills.map((drill, index) => (react_1.default.createElement(dnd_1.Draggable, { key: drill.id, draggableId: drill.id, index: index }, (provided, snapshot) => (react_1.default.createElement("div", Object.assign({ ref: provided.innerRef }, provided.draggableProps, provided.dragHandleProps, { className: `p-4 mb-2 bg-white rounded-lg shadow ${snapshot.isDragging ? 'shadow-lg' : ''}` }),
                react_1.default.createElement("div", { className: "flex items-center justify-between" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h4", { className: "font-semibold" }, drill.name),
                        react_1.default.createElement("p", { className: "text-sm text-gray-500" },
                            drill.duration,
                            " min \u2022 ",
                            drill.players,
                            " players")),
                    react_1.default.createElement("div", { className: "text-sm text-gray-400" }, drill.category))))))),
            provided.placeholder)))));
};
exports.DrillPlanner = DrillPlanner;
