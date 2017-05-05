import R from 'ramda';
import { TextDecoder } from 'text-encoding';
import pako from 'pako';
import schemas from './schema.json';

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
// :: buffer => offset => bitWidth => string
const getBitArray = (buffer, offset, bytes) => {
  const data = new DataView(
    buffer.slice(offset, bytes)
  );
  return R.compose(
    R.reverse, // Convert to little-endian
    R.chain(R.compose(
      getByteArray,
      n => data.getUint8(n + offset, true)
    )),
    R.times(R.identity)
  )(bytes);
};

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

// Process a single value from data at position by type
const processValue = (data, position, typeData, accumulator) => {
  const [ type ] = typeData;
  switch (type) {
    case 'int8':
      return [ 1, data.getInt8(position, true) ];

    case 'uint8':
      return [ 1, data.getUint8(position, true) ];

    case 'int16':
      return [ 2, data.getInt16(position, true) ];

    case 'uint16':
      return [ 2, data.getUint16(position, true) ];

    case 'int32':
      return [ 4, data.getInt32(position, true) ];

    case 'uint32':
      return [ 4, data.getUint32(position, true) ];

    case 'float32':
      return [ 4, data.getFloat32(position, true) ];

    case 'float64':
      return [ 8, data.getFloat64(position, true) ];

    case 'string':
      const string = getCString(data.buffer, position);
      const stringLength = string.length + 1; // Account for null byte
      return [ stringLength, string ];

    case 'bool':
      const bool = data.getUint8(position, true) === 1;
      return [ 1, bool ];

    case 'collection':
      const [ , collection ] = typeData;
      return applySchemaOnce(position, collection, data);

    case 'bitmask':
      const [ , bitmaskLength ] = typeData;
      const bitmask = R.compose(
        R.map(Boolean),
        getBitArray
      )(data.buffer, position, bitmaskLength);
      return [ bitmaskLength, bitmask ];

    case 'conditional':
      const [ , bitmaskKey, conditionals ] = typeData;
      // Extract an array of conditionals from the flag key
      const conditionalFormat = R.compose(
        // Remove types flagged as false
        R.filter(R.identity),
        R.zipWith(R.flip(R.and), conditionals),
        // Get bitmask
        R.prop(bitmaskKey)
      )(accumulator);
      return applySchemaOnce(position, conditionalFormat, data);

    default:
      throw new TypeError(`Invalid schema type "${type}"`);
  }
};

// Use a schema to convert an ArrayBuffer to JS data
const applySchemaOnce = (offset, format, data) => R.reduce(
  ([ offset, accumulator ], [ key, ...typeData ]) => {
    // Gracefully handle RangeErrors when buffer bounds are exceeded
    const [ length, value ] = (() => {
      try {
        return processValue(data, offset, typeData, accumulator);
      } catch (e) {
        if (e instanceof RangeError) {
          return [ 0, null ];
        }
        throw e;
      }
    })();
    return [
      offset + length,
      R.assoc(key, value, accumulator)
    ];
  },
  [ offset, {} ],
  format
);

// Apply schema against data multiple times, until buffer has been read
const applySchema = ({ type, format, multiple }, data) => {
  if (format === null) return new Uint8Array(data.buffer);
  const { byteLength } = data;
  let results = [];
  for (let offset = 0; offset < byteLength;) {
    // Read single set of data at offset
    const [
      length,
      result
    ] = applySchemaOnce(offset, format, data);
    results.push(result);
    offset = multiple
      ? offset + length // Move the pointer along
      : byteLength; // Skip any remaining data
  }
  return results;
};

// Parse event log to array, segmented every tick
const parser = R.compose(
  // Remove unknown data
  R.filter(R.identity),
  // Convert events to POJOs, according to schema
  R.map(event => {
    const schema = schemas[event[0]];
    if (!schema) {
      console.warn('Unknown message type: ' + event[0]);
      return null;
    }
    const data = new DataView(
      event.slice(1).buffer
    );
    // Apply schema to data
    return {
      type: schema.type,
      data: applySchema(schema, data)
    };
  }),
  // Read log & split into individual events
  processLog
);

export default parser;
