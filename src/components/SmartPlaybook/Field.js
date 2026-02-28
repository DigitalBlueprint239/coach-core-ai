import React, { forwardRef } from 'react';

const Field = forwardRef(({ players = [], routes = [], onCanvasEvent, onPlayerDrag, ...props }, ref) => {
  return (
    <canvas
      ref={ref}
      width={800}
      height={500}
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#22c55e' }}
      {...props}
    />
  );
});

Field.displayName = 'Field';
export default Field;
