import R from 'ramda';
import schemas from './schema.json';
import {
  getCString,
  getBitArray,
  processLog,
  flatten
} from './lib';
import fixEvent from './fixEvent';
import {
  states,
  statesStream
} from './states';

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

    case 'static':
      const [ , staticValue ] = typeData;
      return [ 0, staticValue ];

    case '1uint7':
    case 'group':
      const [ , [ a1key, b7key ] ] = typeData;
      const a1b7 = data.getUint8(position, true);
      const a1 = a1b7 >= 0x80;
      return [ 1, {
        [a1key]: type === '1uint7' ? a1 : Number(a1) + 1,
        [b7key]: Number(a1b7 & 0x0F)
      } ];

    case 'collection':
      const [ , collection ] = typeData;
      return applySchemaOnce(position, collection, data);

    case 'bitmask':
      const [ , bitmaskLength ] = typeData;
      const bitmask = R.compose(
        R.map(Boolean),
        getBitArray
      )(position, bitmaskLength, data.buffer);
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

    case 'condCollection':
      const [ , condCollection ] = typeData;
      const first = processValue(
        data,
        position,
        R.tail(condCollection[0]),
        accumulator
      );
      if (first[1] < 0) return first;
      return applySchemaOnce(position, condCollection, data);

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
          console.error('error', e);
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
  if (format === null) return data.buffer;
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

// Parse event log to array
const parser = R.compose(
  R.chain(R.compose(
    // Unnest events
    flatten,
    // Temporary xUpdate fix
    fixEvent,
    // Convert events to POJOs, according to schema
    event => {
      const schema = schemas[event[0]];
      if (!schema) {
        throw new TypeError('Unknown message type: ' + event[0]);
      }
      const data = new DataView(
        event.slice(1).buffer
      );
      // Apply schema to data
      return {
        type: schema.type,
        data: applySchema(schema, data)
      };
    }
  )),
  // Read log & split into individual events
  processLog
);

export {
  parser,
  states,
  statesStream
};
