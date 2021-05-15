import {ConnectorFabric, makeHTTP1Request, makeHTTP2Request} from "./connections";
import {canUseHTTP2, cloneURL} from "./utils";
import {COMPRESSION_HEADER, CompressionOptions} from "./compression";
import {now} from "./time";
import {FlowTimes} from "./types";

import {hook as htmlHook, HTMLMeter} from './targets/html';

interface MeterOptions {
  host?: string;
  http2?: boolean;
  verbose?: boolean;
  compression?: CompressionOptions;
  onChunk?: (data: Buffer, times: FlowTimes) => void;
  onConsole?: (message: string) => void;
}

/**
 * Connection Pre-flight timings;
 */
interface PreflightMeter {
  dnsLookup: number;
  tcpConnection: number;
  tlsHandshake: number;
  '::total': number;
}

/**
 * Data timings.
 */
interface DataMeter {
  rawFirstByte: number;
  firstByte: number;
  end: number;
  '::total': number;
}

/**
 * Complete information about the metered connection
 */
interface MeteredResult {
  preflight: PreflightMeter;
  data: DataMeter;
  html: HTMLMeter;

  bytesReceived: number;
  rawBytesReceived: number;

  totalTime: number;

  chunks: number;
  rawChunks: number;
}

interface FirstByte {
  firstByte: number;
}

export const flattenFlowTimes = <T extends { '::total': number }>(times: FlowTimes) => {
  const steps = Object.entries(times);
  const flatten = steps
    .map(([key, value], index) => index === 0 ? [key, 0] : [key, value - steps[index - 1][1]])
    .reduce((acc, [key, value], index) => (
      index > 0
        ? Object.assign(acc, {[key]: value})
        : acc
    ), {} as T);

  flatten['::total'] = steps.length > 1 ? steps[steps.length - 1][1] - steps[0][1] : 0;
  return flatten;
}

/**
 * Flow meter
 * @param {Url }url
 * @param options
 */
export const meter = (url: string, options: MeterOptions = {}): Promise<MeteredResult> => (
  new Promise(async (resolve) => {
    let lastTime = now();
    const delta = (): string => {
      const d = now() - lastTime;
      lastTime = now();
      const result = String(d);
      return '...️' + `️    `.substr(0, 5 - result.length) + '+' + result + 'ms';
    }
    const rawDataBlocks = [];
    const dataBlocks: Array<{
      time: number;
      data: Buffer | string;
    }> = [];
    const dnsTimes: FlowTimes = {
      start: now(),
    }
    const dataTimes: FlowTimes & FirstByte = {} as any;
    const htmlTimes: HTMLMeter & FirstByte = {} as any;

    let bytesReceived = 0;
    let rawBytesReceived = 0;

    const u = new URL(url);

    const h2 = canUseHTTP2(u.protocol) && options.http2;

    const factory: ConnectorFabric = h2 ? makeHTTP2Request : makeHTTP1Request;

    options.verbose && console.log('using', h2 ? 'h2' : 'http/1.1');

    const compression = options.compression && options.compression !== 'none' ? options.compression : undefined;

    const report = (message: string): void => {
      options.verbose && console.log(message);
      options.onConsole && options.onConsole(message);
    }

    const connection = await factory(
      {
        method: 'GET',
        compression,
        ...cloneURL(u),
        headers: {
          host: options.host || u.host,
          'User-Agent': 'flow-meter',
          ...(compression ? {'Accept-Encoding': COMPRESSION_HEADER[compression]} : {}),
        }
      },
      socket => {
        socket.on('lookup', () => {
          report(delta() + ' dns');
          dnsTimes.dnsLookup = now();
        })
        socket.on('connect', () => {
          report(delta() + ' connect');

          dataTimes.start = now();
          dnsTimes.tcpConnection = now();
        })
        socket.on('secureConnect', () => {
          report(delta() + ' handshake');
          dataTimes.start = now();
          dnsTimes.tlsHandshake = now();
        })
      },
      (buffer) => {
        if (!dataTimes.rawFirstByte) {
          dataTimes.rawFirstByte = now();
          report(delta() + ' first byte (' + buffer.length + ' bytes)');
        }

        rawBytesReceived += buffer.length;
        rawDataBlocks.push({
          time: now(),
          data: buffer,
        })
      },
      (buffer) => {
        if (!dataTimes.firstByte) {
          dataTimes.firstByte = now();
          htmlTimes.firstByte = now();
          report(delta() + ' readable (' + buffer.length + ' bytes)');
        }
        htmlHook(buffer, htmlTimes);

        // console.log(buffer.toString());
        bytesReceived += buffer.length;
        dataBlocks.push({
          time: now(),
          data: buffer,
        })
      },
      () => {
        report(delta() + ' end');
        dataTimes.end = now();
        //
        //
        // console.log(dataBlocks[dataBlocks.length - 1].data.toString());
        resolve({
          preflight: flattenFlowTimes<PreflightMeter>(dnsTimes),
          data: flattenFlowTimes<DataMeter>(dataTimes),
          html: flattenFlowTimes<HTMLMeter>({...htmlTimes, streamEnd: now()}),
          bytesReceived,
          rawBytesReceived,
          totalTime: dataTimes.end - dnsTimes.start,
          chunks: dataBlocks.length,
          rawChunks: rawDataBlocks.length,
        });
        // {
        //   headers: times.connected - times.start,
        //   all: times.end - times.start,
        // });
      }
    );

    // times.connected = now();
    report(`${delta()} >> ${url} ${connection.statusCode} v${connection.httpVersion} ${compression}`);
  })
);