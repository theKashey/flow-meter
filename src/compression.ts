import http2 from "http2";
import zlib from "zlib";
import {ChunkCallback, EndCallback} from "./types";

export const COMPRESSION_HEADER: Record<CompressionOptions, string> = {
  'gzip': 'gzip',
  'brotli': 'br'
};

export type CompressionOptions = 'gzip' | 'brotli';

export const createDecompressor = (compression: CompressionOptions) => {
  switch (compression) {
    case 'gzip':
      return zlib.createGunzip();
    case 'brotli':
      return zlib.createBrotliDecompress();
    default:
      return null;
  }
}

export const handleCompression = (request: Pick<http2.ClientHttp2Stream, 'pipe'>, compression: CompressionOptions, onChunk: ChunkCallback, onEnd: EndCallback) => {
  const decoder = createDecompressor(compression);
  if (decoder) {
    request.pipe(decoder);

    decoder.on('data', onChunk);
    decoder.on('end', onEnd);
    return true
  }

  return false;
}