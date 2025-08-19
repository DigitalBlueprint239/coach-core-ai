import React, { useRef, useEffect, useState } from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import { useBreakpointValue } from '@chakra-ui/react';

interface PlayerProps {
  id: string;
  position: string;
  number: number;
  team: 'offense' | 'defense';
  x: number;
  y: number;
  isSelected?: boolean;
  isKey?: boolean;
  onDragEnd?: (x: number, y: number) => void;
  onSelect?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  mobileOptimized?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  id,
  position,
  number,
  team,
  x,
  y,
  isSelected = false,
  isKey = false,
  onDragEnd,
  onSelect,
  onDoubleClick,
  mobileOptimized = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const playerRef = useRef<any>(null);
  
  const spacing = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const fontSize = useBreakpointValue({ base: 10, md: 12, lg: 14 });

  // Team colors
  const teamColors = {
    offense: {
      primary: '#ff4444',
      secondary: '#cc0000',
      text: '#ffffff'
    },
    defense: {
      primary: '#4444ff',
      secondary: '#0000cc',
      text: '#ffffff'
    }
  };

  const colors = teamColors[team];

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e: any) => {
    setIsDragging(false);
    const newX = e.target.x();
    const newY = e.target.y();
    
    if (onDragEnd) {
      onDragEnd(newX, newY);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(id);
    }
  };

  const handleTouchStart = (e: any) => {
    e.evt.preventDefault();
    if (onSelect) {
      onSelect(id);
    }
  };

  return (
    <Group
      ref={playerRef}
      x={x}
      y={y}
      draggable={!mobileOptimized}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
    >
      {/* Player circle */}
      <Circle
        radius={mobileOptimized ? 15 : 20}
        fill={isSelected ? '#ffcc00' : colors.primary}
        stroke={isSelected ? '#ff9900' : colors.secondary}
        strokeWidth={isSelected ? 3 : 2}
        shadowColor={isDragging ? '#000' : 'transparent'}
        shadowBlur={isDragging ? 10 : 0}
        shadowOffset={isDragging ? { x: 5, y: 5 } : { x: 0, y: 0 }}
        shadowOpacity={isDragging ? 0.3 : 0}
      />

      {/* Player number */}
      <Text
        text={number.toString()}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fill={colors.text}
        align="center"
        verticalAlign="middle"
        offsetX={fontSize ? fontSize / 2 : 7}
        offsetY={fontSize ? fontSize / 2 : 7}
        fontStyle="bold"
      />

      {/* Position indicator */}
      <Text
        text={position}
        fontSize={fontSize ? fontSize - 2 : 8}
        fontFamily="Arial, sans-serif"
        fill={colors.text}
        align="center"
        verticalAlign="middle"
        offsetX={fontSize ? fontSize / 2 : 7}
        offsetY={mobileOptimized ? 25 : 30}
        fontStyle="italic"
        opacity={0.8}
      />

      {/* Key player indicator */}
      {isKey && (
        <Circle
          radius={mobileOptimized ? 8 : 10}
          fill="#ffcc00"
          stroke="#ff9900"
          strokeWidth={2}
          offsetX={mobileOptimized ? 15 : 20}
          offsetY={mobileOptimized ? -15 : -20}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <Circle
          radius={mobileOptimized ? 25 : 30}
          fill="transparent"
          stroke="#ffcc00"
          strokeWidth={2}
          dash={[5, 5]}
        />
      )}
    </Group>
  );
};

export default Player;
