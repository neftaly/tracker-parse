import R from 'ramda';
import { TextDecoder } from 'text-encoding';
import pako from 'pako';

// Split an array every time the predicate returns true
// :: f => (array -> Boolean) -> f a -> f a
const segment = R.curry((fn, array) => {
  const chunks = [];
  let chunk = [];
  for (let value of array) {
    if (fn(value)) {
      chunks.push(chunk);
      chunk = [];
    }
    chunk.push(value);
  }
  chunks.push(chunk);
  return chunks;
});

// Extract a null-terminated string from an array buffer
// :: buffer => offset => string
const getCString = (buffer, offset) => {
  // Extract string and everything after it
  const head = new Uint8Array(
    buffer.slice(offset)
  );
  // Find the first null char
  const end = R.indexOf(0, head);
  const terminator = end < 0 ? head.length : end;
  // Extract everything before the null char
  return new TextDecoder('utf8').decode(
    head.slice(0, terminator)
  );
};

// Slice a log up into an array of events
const processLog = data => {
  const log = new DataView(
    pako.inflate(data).buffer
  );
  const events = [];
  for (let offset = 0; offset < log.byteLength;) {
    // Calculate event size
    const length = log.getUint16(offset, true);
    const start = offset + 2;
    const end = start + length;
    // Read event chunk
    const event = new Uint8Array(
      log.buffer.slice(start, end)
    );
    // Attach chunk
    events.push(event);
    offset = end;
  }
  return events;
};

export {
  segment,
  getCString,
  processLog
};
