import http2 from "http2";
import zlib from "zlib";
import {ChunkCallback, EndCallback} from "./types";

export const COMPRESSION_HEADER: Record<CompressionOptions, string> = {
  'gzip': 'gzip',
  'brotli': 'br',
  none: ''
};

export type CompressionOptions = 'gzip' | 'brotli' | 'none';

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

export type CallbackCompressor = (data: Buffer) => { length: number };

export const createCompressor = (compression?: CompressionOptions): CallbackCompressor => {
  switch (compression) {
    case 'gzip':
      return (data: Buffer) => zlib.gzipSync(data);
    case 'brotli':
      return (data: Buffer) => zlib.brotliCompressSync(data);
    default:
      return () => ({length: -1});
  }
}

export const compress = (compressor: CallbackCompressor, data: string) => {
  return compressor(Buffer.from(data, 'utf8')).length;
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