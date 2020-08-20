import {now} from "../time";
import {FlowTimes} from "../types";

/**
 * Time to discover of important HTML pieces
 * In the order of their occurrence
 */
export interface HTMLMeter extends FlowTimes {
  head: number;
  script: number;
  title: number;
  body: number;
  header: number;
  h1: number;
  h2: number;
  footer: number;
  end: number;
  total: number;
}

export const hook = (data: Buffer, times: HTMLMeter) => {
  const str = String(data).toLowerCase();

  if (str.indexOf('<head') >= 0 && !times.head) {
    times.head = now();
  }
  if (str.indexOf('<title') >= 0 && !times.title) {
    times.title = now();
  }
  if (str.indexOf('<script') >= 0 && !times.script) {
    times.script = now();
  }
  if (str.indexOf('<body') >= 0 && !times.body) {
    times.body = now();
  }
  if (str.indexOf('<header') >= 0 && !times.header) {
    times.header = now();
  }
  if (str.indexOf('<h1') >= 0 && !times.h1) {
    times.h1 = now();
  }
  if (str.indexOf('<h2') >= 0 && !times.h2) {
    times.h2 = now();
  }
  if (str.indexOf('<footer') >= 0) {
    times.footer = now();
  }
  if (str.indexOf('</body>') >= 0 && !times.end) {
    times.end = now();
  }
}