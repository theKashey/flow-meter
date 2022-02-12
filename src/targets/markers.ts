import {HTMLMeter} from "./html";
import {now} from "../time";
import {CallbackCompressor, compress} from "../compression";
import {DataBlock} from "../types";

export interface MarkerReport {
  rawOffset: number;
  decompressedOffset: number;
  chunkId: number;
}

export type Markers = Record<string, MarkerReport>

export const processMarkers = (data: Buffer, markers: Markers, signatures: string[], compressor: CallbackCompressor, blocks: DataBlock[]) => {
  signatures
    .filter(signature => !markers[signature])
    .forEach(signature => {
      const index = data.indexOf(signature);
      if (index >= 0) {
        const tillHere = blocks.map(x => x.data).join('') + data.toString().substr(0, index);
        markers[signature] = {
          rawOffset: compress(compressor, tillHere),
          decompressedOffset: tillHere.length,
          chunkId: blocks.length + 1
        }
      }
    });
};