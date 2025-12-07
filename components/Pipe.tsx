import React from 'react';
import { PipeData } from '../types';
import { PIPE_WIDTH, GAP_SIZE, GAME_HEIGHT, GROUND_HEIGHT } from '../constants';

interface PipeProps {
  pipe: PipeData;
}

const Pipe: React.FC<PipeProps> = ({ pipe }) => {
  return (
    <>
      {/* Top Pipe */}
      <div
        style={{
          left: pipe.x,
          top: 0,
          height: pipe.topHeight,
          width: PIPE_WIDTH,
        }}
        className="absolute bg-green-500 border-2 border-black border-t-0 z-10"
      >
        {/* Pipe Cap */}
        <div className="absolute bottom-0 left-[-4px] w-[calc(100%+8px)] h-6 bg-green-500 border-2 border-black"></div>
      </div>

      {/* Bottom Pipe */}
      <div
        style={{
          left: pipe.x,
          top: pipe.topHeight + GAP_SIZE,
          height: GAME_HEIGHT - GROUND_HEIGHT - (pipe.topHeight + GAP_SIZE),
          width: PIPE_WIDTH,
        }}
        className="absolute bg-green-500 border-2 border-black border-b-0 z-10"
      >
        {/* Pipe Cap */}
        <div className="absolute top-0 left-[-4px] w-[calc(100%+8px)] h-6 bg-green-500 border-2 border-black"></div>
      </div>
    </>
  );
};

export default Pipe;
