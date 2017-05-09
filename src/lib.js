import R from 'ramda';
import { TextDecoder } from 'text-encoding';
import pako from 'pako';

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

// Convert a big-endian Uint8 into to an array of bits
// Uint8 => [ ...bits ]
const getByteArray = R.compose(
  // Add unset bits
  list => R.concat(
    R.times(R.always(0), 8 - list.length),
    list
  ),
  // Convert number to binary array
  R.map(Number),
  R.splitEvery(1),
  n => n.toString(2),
  // Enforce strict type
  R.tap(n => {
    if (!Number.isInteger(n) || n < 0 || n >= 256) {
      throw new TypeError('Expected an unsigned 8-bit integer');
    }
  })
);

// Extract an array of bits from an array buffer
// :: offset => size => buffer => string
const getBitArray = R.compose(
  R.reverse, // Convert to little-endian
  R.chain(getByteArray),
  Array.from,
  R.constructN(1, Uint8Array),
  (from, length, list) => R.slice(from, from + length, list)
);

// Slice a log up into an array of events
// :: buffer => [ ...events ]
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

// Unnest events with multiple updates
// :: event => [ ...events ]
const flatten = event => {
  const {
    data: nestedData,
    ...rest
  } = event;
  return R.map(
    data => ({ ...rest, data }),
    nestedData
  );
};

export {
  getCString,
  getBitArray,
  processLog,
  flatten
};
