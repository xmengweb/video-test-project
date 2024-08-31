/// <reference types="vite/client" />
declare module "@vitejs/plugin-react";
export interface IChunkListObj {
  fileChunk: Blob; //使用slice()进行切片
  size: number;
  percent: number;
  chunkName: string;
  fileName: string;
  index: number;
}
