import {Socket} from "net";

export type SocketCallback = (socket: Socket) => void;
export type ChunkCallback = (data: Buffer) => void;
export type EndCallback = () => void;

export type FlowTimes = Record<string, number>;