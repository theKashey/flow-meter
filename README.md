Flow Meter (WIP)
===

HTTP/HTTPS/HTTP2 stream meter

- supports gzip/brotly compression
- reports about every important moment of data flow
- reports timing till major HTTP tags

## Usage

### CLI

`flow-meter <url>`

### API

- ✅ `import {meter} from 'flow-meter'`

```js
meter('https://theurge.com.au', {
  http2: true,
  compression: 'gzip',
}).then(console.log)
```

⬇️ ⬇️ ⬇️ ⬇️

```text
{
  preflight: { 
    dnsLookup: 160, 
    tcpConnection: 259,
    tlsHandshake: 290,
    total: 709        <-- 💩WOOPS
 },
  data: { 
   rawFirstByte: 718, <-- slow SSR?
   firstByte: 2,
   end: 321,          <-- slow transfer
   total: 1041
 },
  html: {
    head: 0,
    script: 0,
    title: 103,       <-- hmm, why delay?
    body: 1,
    header: 2,
    h2: 105,
    footer: 1,
    end: 108,         <-- 100ms from <footer> till </body>. That's redux store!
    total: 320
  },
  bytesReceived: 256566,   <-- HTML size
  rawBytesReceived: 31955, <-- transfered
  totalTime: 1750,
  chunks: 73,         <-- gzip chunks
  rawChunks: 60       <-- network chunks
}
```

```js
meter('https://shoptheurge.co.nz/', {
  http2: true,
  compression: 'brotli',
}).then(console.log)
```

⬇️ ⬇️ ⬇️ ⬇️

```text
{
  preflight: * the same *,
  data: { 
    rawFirstByte: 311,     <-- FASTER!
    firstByte: 1,
    end: 36,               <-- FASTER!
    total: 348
 },
  html: {
    head: 0,
    title: 1,              <-- NO DELAY!
    script: 0,
    body: 0,
    header: 1,
    h2: 0,
    footer: 1,
    end: 32,
    total: 35
  },
  bytesReceived: 256852,
  rawBytesReceived: 28746,<-- brotly is just 2kb smaller
  totalTime: 941,
  chunks: 40,
  rawChunks: 25           <-- less chunks!
}
```

# License

MIT