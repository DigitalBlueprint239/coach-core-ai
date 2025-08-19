import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import Konva from 'konva';
import { useBreakpointValue } from '@chakra-ui/react';
import { RESPONSIVE_SPACING, RESPONSIVE_FONTS } from '../../utils/responsive';

interface PlayDesignerCanvasProps {
  playData?: any;
  onPlayUpdate?: (data: any) => void;
  fieldType?: '11v11' | '7v7' | '5v5';
  theme?: 'coach-core-default' | 'coach-core-dark' | 'coach-core-light';
  width?: number;
  height?: number;
  mobileOptimized?: boolean;
}

interface FieldConfig {
  width: number;
  height: number;
  centerCircleRadius: number;
  penaltyAreaWidth: number;
  penaltyAreaHeight: number;
  goalAreaWidth: number;
  goalAreaHeight: number;
}

const FIELD_CONFIGS: Record<string, FieldConfig> = {
  '11v11': {
    width: 105,
    height: 68,
    centerCircleRadius: 9.15,
    penaltyAreaWidth: 40.32,
    penaltyAreaHeight: 16.5,
    goalAreaWidth: 18.32,
    goalAreaHeight: 5.5
  },
  '7v7': {
    width: 60,
    height: 40,
    centerCircleRadius: 6,
    penaltyAreaWidth: 24,
    penaltyAreaHeight: 12,
    goalAreaWidth: 12,
    goalAreaHeight: 4
  },
  '5v5': {
    width: 40,
    height: 30,
    centerCircleRadius: 4,
    penaltyAreaWidth: 16,
    penaltyAreaHeight: 8,
    goalAreaWidth: 8,
    goalAreaHeight: 3
  }
};

export const PlayDesignerCanvas: React.FC<PlayDesignerCanvasProps> = ({
  playData,
  onPlayUpdate,
  fieldType = '11v11',
  theme = 'coach-core-default',
  width = 800,
  height = 600,
  mobileOptimized = false
}) => {
  const [stageSize, setStageSize] = useState({ width, height });
  const [scale, setScale] = useState(1);
  const [selectedTool, setSelectedTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);
  
  const stageRef = useRef<any>(null);
  const fieldLayerRef = useRef<any>(null);
  const playersLayerRef = useRef<any>(null);
  const routesLayerRef = useRef<any>(null);
  const annotationsLayerRef = useRef<any>(null);

  const fieldConfig = FIELD_CONFIGS[fieldType];
  const spacing = useBreakpointValue(RESPONSIVE_SPACING.md);
  const fontSize = useBreakpointValue(RESPONSIVE_FONTS.sm);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth * (mobileOptimized ? 0.95 : 0.8);
      const containerHeight = window.innerHeight * (mobileOptimized ? 0.7 : 0.7);
      setStageSize({ width: containerWidth, height: containerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOptimized]);

  // Field rendering
  const renderField = useCallback(() => {
    if (!fieldLayerRef.current) return;

    const fieldGroup = new Konva.Group({
      x: stageSize.width * 0.1,
      y: stageSize.height * 0.1
    });

    // Field outline
    const field = new Konva.Rect({
      width: fieldConfig.width * 8,
      height: fieldConfig.height * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 3,
      fill: theme === 'coach-core-dark' ? '#1a4d1a' : '#2a7f2a',
      cornerRadius: 5
    });

    // Center circle
    const centerCircle = new Konva.Circle({
      x: fieldConfig.width * 4,
      y: fieldConfig.height * 4,
      radius: fieldConfig.centerCircleRadius * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2
    });

    // Center line
    const centerLine = new Konva.Line({
      points: [fieldConfig.width * 4, 0, fieldConfig.width * 4, fieldConfig.height * 8],
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2
    });

    // Penalty areas
    const leftPenaltyArea = new Konva.Rect({
      x: 0,
      y: (fieldConfig.height * 8 - fieldConfig.penaltyAreaHeight * 8) / 2,
      width: fieldConfig.penaltyAreaWidth * 8,
      height: fieldConfig.penaltyAreaHeight * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2,
      fill: 'transparent'
    });

    const rightPenaltyArea = new Konva.Rect({
      x: (fieldConfig.width - fieldConfig.penaltyAreaWidth) * 8,
      y: (fieldConfig.height * 8 - fieldConfig.penaltyAreaHeight * 8) / 2,
      width: fieldConfig.penaltyAreaWidth * 8,
      height: fieldConfig.penaltyAreaHeight * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2,
      fill: 'transparent'
    });

    // Goal areas
    const leftGoalArea = new Konva.Rect({
      x: 0,
      y: (fieldConfig.height * 8 - fieldConfig.goalAreaHeight * 8) / 2,
      width: fieldConfig.goalAreaWidth * 8,
      height: fieldConfig.goalAreaHeight * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2,
      fill: 'transparent'
    });

    const rightGoalArea = new Konva.Rect({
      x: (fieldConfig.width - fieldConfig.goalAreaWidth) * 8,
      y: (fieldConfig.height * 8 - fieldConfig.goalAreaHeight * 8) / 2,
      width: fieldConfig.goalAreaWidth * 8,
      height: fieldConfig.goalAreaHeight * 8,
      stroke: theme === 'coach-core-dark' ? '#666' : '#fff',
      strokeWidth: 2,
      fill: 'transparent'
    });

    // Goals
    const leftGoal = new Konva.Rect({
      x: -5,
      y: (fieldConfig.height * 8 - 20) / 2,
      width: 5,
      height: 20,
      fill: theme === 'coach-core-dark' ? '#333' : '#000'
    });

    const rightGoal = new Konva.Rect({
      x: fieldConfig.width * 8,
      y: (fieldConfig.height * 8 - 20) / 2,
      width: 5,
      height: 20,
      fill: theme === 'coach-core-dark' ? '#333' : '#000'
    });

    fieldGroup.add(field, centerCircle, centerLine, leftPenaltyArea, rightPenaltyArea, leftGoalArea, rightGoalArea, leftGoal, rightGoal);
    
    return fieldGroup;
  }, [fieldConfig, stageSize, theme]);

  // Touch and mouse event handlers
  const handleMouseDown = useCallback((e: any) => {
    if (selectedTool === 'draw') {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      setDrawingPoints([pos.x, pos.y]);
    }
  }, [selectedTool]);

  const handleMouseMove = useCallback((e: any) => {
    if (isDrawing && selectedTool === 'draw') {
      const pos = e.target.getStage().getPointerPosition();
      setDrawingPoints(prev => [...prev, pos.x, pos.y]);
    }
  }, [isDrawing, selectedTool]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && selectedTool === 'draw') {
      setIsDrawing(false);
      // Create route from drawing points
      if (drawingPoints.length > 2) {
        createRoute(drawingPoints);
      }
      setDrawingPoints([]);
    }
  }, [isDrawing, selectedTool, drawingPoints]);

  const createRoute = useCallback((points: number[]) => {
    if (!routesLayerRef.current) return;

    const route = new Konva.Line({
      points: points,
      stroke: '#ffcc00',
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.5,
      dash: [10, 5]
    });

    // Add arrow at the end
    if (points.length >= 4) {
      const arrow = new Konva.Arrow({
        points: points.slice(-4),
        pointerLength: 10,
        pointerWidth: 10,
        fill: '#ffcc00',
        stroke: '#ffcc00',
        strokeWidth: 2
      });
      routesLayerRef.current.add(arrow);
    }

    routesLayerRef.current.add(route);
    routesLayerRef.current.batchDraw();
  }, []);

  // Zoom functionality
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.02;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  }, []);

  return (
    <div style={{ 
      width: stageSize.width, 
      height: stageSize.height,
      border: '2px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={selectedTool === 'pan'}
      >
        {/* Field Layer */}
        <Layer ref={fieldLayerRef}>
          {renderField()}
        </Layer>

        {/* Players Layer */}
        <Layer ref={playersLayerRef}>
          {/* Players will be added here */}
        </Layer>

        {/* Routes Layer */}
        <Layer ref={routesLayerRef}>
          {/* Routes will be added here */}
        </Layer>

        {/* Annotations Layer */}
        <Layer ref={annotationsLayerRef}>
          {/* Text, arrows, and other annotations */}
        </Layer>

        {/* Drawing Preview */}
        {isDrawing && drawingPoints.length > 2 && (
          <Layer>
            <Line
              points={drawingPoints}
              stroke="#ffcc00"
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              dash={[10, 5]}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
};

export default PlayDesignerCanvas;
