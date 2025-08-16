'use client';

import React from 'react';

interface CandlestickShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    open: number;
    high: number;
    low: number;
    close: number;
    date: Date;
  };
}

export function CandlestickShape(props: CandlestickShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  
  if (!payload || !x || !width) return null;
  
  const { open, high, low, close } = payload;
  const isGreen = close > open;
  const color = isGreen ? '#10b981' : '#ef4444';
  
  const centerX = x + width / 2;
  const bodyTop = y + (height * (1 - Math.min(open, close) / Math.max(high, low)));
  const bodyBottom = y + (height * (1 - Math.max(open, close) / Math.max(high, low)));
  const bodyHeight = Math.abs(bodyBottom - bodyTop);
  
  const wickTop = y + (height * (1 - high / Math.max(high, low)));
  const wickBottom = y + (height * (1 - low / Math.max(high, low)));
  
  return (
    <g>
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      
      <rect
        x={x + width * 0.2}
        y={Math.min(bodyTop, bodyBottom)}
        width={width * 0.6}
        height={Math.max(bodyHeight, 1)}
        fill={isGreen ? color : 'white'}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
}
