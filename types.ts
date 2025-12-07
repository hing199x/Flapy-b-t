export interface PipeData {
  id: number;
  x: number;
  topHeight: number;
  passed: boolean;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface DifficultySettings {
  gravity: number;
  jumpStrength: number;
  pipeSpeed: number;
  pipeSpawnRate: number; // in frames
  gapSize: number;
}
