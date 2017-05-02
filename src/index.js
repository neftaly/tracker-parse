import R from 'ramda';
import {
  // segment,
  getCString,
  processLog
} from './lib';
import schemas from './messages';

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
    // case 'conditional':
    //   const [ , key, conditionals ] = typeData;
    //   // Extract an array of conditionals from the flag key
    //   const conditionalTypeData = R.compose(
    //     // Remove types flagged as false
    //     R.filter(R.identity),
    //     R.zipWith(R.flip(R.and), conditionals),
    //     // Convert to little-endian
    //     R.reverse,
    //     // Convert to an array of booleans
    //     R.map(R.equals('1')),
    //     R.splitEvery(1),
    //     x => x.toString(2),
    //     // Get flag value
    //     R.prop(key)
    //   )(accumulator);
    //   return applySchemaOnce(position, conditionalTypeData, data);
    default:
      throw new TypeError(`Invalid schema type "${type}"`);
  }
};

// Use a schema to convert an ArrayBuffer to JS data
const applySchemaOnce = (offset, format, data) => R.reduce(
  ([ offset, accumulator ], [ key, ...typeData ]) => {
    const [
      length,
      value
    ] = processValue(data, offset, typeData, accumulator);
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
const parse = R.compose(
  // // Split at every tick
  // segment(event => event.type === 'tick'),
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

export default parse;
