import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { usePracticeStore } from '../hooks/usePracticeSession';

export const DrillPlanner: React.FC = () => {
  const { currentSession, reorderDrills } = usePracticeStore();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderDrills(result.source.index, result.destination.index);
  };

  if (!currentSession) return null;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="drills">
        {provided => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {currentSession.drills.map((drill, index) => (
              <Draggable key={drill.id} draggableId={drill.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`p-4 mb-2 bg-white rounded-lg shadow ${
                      snapshot.isDragging ? 'shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{drill.name}</h4>
                        <p className="text-sm text-gray-500">
                          {drill.duration} min • {drill.players} players
                        </p>
                      </div>
                      <div className="text-sm text-gray-400">
                        {drill.category}
                      </div>
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
  );
};
