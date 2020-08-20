import http, {ClientRequestArgs} from 'http';
import https from 'https';
import http2, {IncomingHttpHeaders} from 'http2';

import {getOrigin} from "./utils";
import {CompressionOptions, handleCompression} from "./compression";
import {ChunkCallback, EndCallback, SocketCallback} from "./types";

export interface RequestParameters extends ClientRequestArgs {
  protocol: string;
  compression?: CompressionOptions;
}

type Headers = IncomingHttpHeaders;

interface RequestConnectionResponse {
  headers: Headers,
  httpVersion: string;
  statusCode?: number;
}

export const makeHTTP2Request = ({compression, ...parameters}: RequestParameters, onSocket: SocketCallback, onRawChunk: ChunkCallback, onDecodedChunk: ChunkCallback, onEnd: EndCallback) => (
  new Promise<RequestConnectionResponse>((resolve, reject) => {
    const origin = getOrigin(parameters)
    const client = http2
      .connect(origin)
      .on('socketError', reject)
      .on('error', reject)

    onSocket(client.socket)

    const {headers, ...target} = parameters;
    const {host, ...customHeaders} = headers as any;
    let decoded = false;

    const request: http2.ClientHttp2Stream = client
      .request({
        ...customHeaders,
        ...target,
        // ':authority': host,
        ':method': parameters.method || 'GET',
        ':path': parameters.path || '/',
      } as any)
      .on('response', (headers: Headers) => {
        const statusCode: number = headers[':status'] as any;
        resolve({headers, httpVersion: '2.0', statusCode});
      })
      .on('data', (data) => {
        onRawChunk(data);
        if (!decoded) {
          onDecodedChunk(data);
        }
      })
      .on('end', () => !decoded && onEnd());

    if(compression) {
      decoded = handleCompression(request, compression, onDecodedChunk, onEnd)
    }

    request.end();
  })
)

export const makeHTTP1Request = ({compression, ...parameters}: RequestParameters, onSocket: SocketCallback, onRawChunk: ChunkCallback, onDecodedChunk: ChunkCallback, onEnd: EndCallback) => (
  new Promise<RequestConnectionResponse>((resolve, reject) => {
    const protocol = parameters.protocol === 'https:' ? https : http;

    protocol
      .request(parameters, response => {
        resolve(response);
        const decoded = compression &&  handleCompression(response, compression, onDecodedChunk, onEnd);
        response.on('readable', () => {
          const data = response.read();
          if (data) {
            onRawChunk(data)
            if (!decoded) {
              onDecodedChunk(data);
            }
          }
        })
          .on('end', () => !decoded && onEnd());
      })
      .on('socket', onSocket)
      .on('error', reject)
      .end();
  })
);