import {RequestParameters} from "./connections";

/**
 * Generates H2 origin
 * @param parameters
 */
export function getOrigin(parameters: Pick<RequestParameters, 'hostname' | 'port' | 'protocol'>) {
  const {hostname, port, protocol} = parameters;
  let origin = protocol + '//' + hostname;
  if (port) {
    origin += ':' + port;
  }
  return origin;
}

/**
 * H2 is defined only for https
 * @param scheme
 */
export const canUseHTTP2 = (scheme: string) => scheme === 'https:';

/**
 * URL object is not "spreadable"
 * @param hostname
 * @param pathname
 * @param port
 * @param protocol
 * @param search
 */
export const cloneURL = ({hostname, pathname, port, protocol, search}: URL) => ({
  hostname,
  path: pathname,
  port,
  protocol,
  search,
})
