# tracker-parser
Converts a pr-tracker log to a list of events or states.

## usage
```js
import {
  parser,
  states
} from 'tracker-parser';

const events = parser(log);
const history = states(undefined, events);

console.log(
  'Current state',
  history.get(-1).toJS()
);
```
## `parser`
` :: logfile => [ ...events ]`

Using schema, converts log file from a Uint8Array, Array, or String,
to an array of events.

Values with decoding errors are set to `null`.

## `states`
` :: [ ...initial ] || undefined => [ ...events ] => [ ...initial, ...new ]`

Converts a List of initial states (or undefined) and an Array of events to a
List of states, separated by tick.

Lists use [immutable.js](https://facebook.github.io/immutable-js/).

The most common immutable List operations are:
  * `.get(index)` for a particular tick (index -1 for the last)
  * `.toJS()` to convert to a plain JS object.

## Message schema

[schema.json](./src/schema.json) contains a map of message IDs,
and the associated decoding instructions.

```json
{
  "32": {
    "type": "vehicleUpdate",
    "multiple": true,
    "format": [
      [ "flags", "bitmask", 1 ],
      [ "vehicleId", "int16" ],
      [ "status", "conditional", "flags", [
        [ "team", "uint16" ],
        [ "position", "collection", [
          [ "x", "int16" ],
          [ "y", "int16" ],
          [ "z", "int16" ]
        ] ],
        [ "yaw", "int16" ],
        [ "health", "int16" ]
      ] ]
    ]
  },
  ...
}
```

### `type`: **string**
Message type name.
Passed on directly to the parsed object.

### `comment` *optional*: **string** OR **array**
Comments regarding a particular message.
For multiple lines, use an array of strings.

### `multiple` *optional*: **boolean**
Whether a message can contain multiple sets of data.

  * `true`: message will be continually parsed until the entire chunk is read
  * `false`: message data beyond that defined in `format` will be ignored

### `format`: **array**
An list of `[ key, type, ... ]` tuples, defining data format and order.

Valid types are:
  * **int8**: 1 byte signed integer
  * **uint8**: 1 byte unsigned integer
  * **int16**: 2 byte signed integer
  * **uint16**: 2 byte unsigned integer
  * **int32**: 4 byte signed integer
  * **uint32**: 4 byte unsigned integer
  * **float32**: 4 byte float
  * **float64**: 8 byte float
  * **string**: null-terminated string
  * **bool**: 1 byte boolean
  * **null**: 0-byte placeholder value
  * **collection**: nested group of values
  * **bitmask**: group of true/false bytes
  * **condCollection**: nested group of values, read depending on first value
  * **conditional**: nested group of values, read depending on prior `bitmask`

Number types are expected to be little-endian.

#### `null`
Empty placeholder value. The key/value will not be included in output data.

Note that this is the string `"null"`, not the value `null`.

#### `collection`
A collection is a nested list of values.
The third argument contains a nested list of type definitions.

```js
[ key, "collection", [
  ...types
] ]
```

#### `bitmask`
A bitmask is a list of bit values.
The third argument indicates the bitmask length in bytes.

```js
[ key, "bitmask", length ]
```

#### `condCollection`
**Note**: WIP

Same as a collection,
except that values after the first are only read if first is > 0;

```js
[ key, "collection", [
  firstType,
  ...types
] ]
```

#### `conditional`
**Note**: WIP

A conditional is a nested group of values,
that are turned on or off depending on a prior `bitmask`.

The third argument contains the key of the prior `bitmask`,
and the fourth contains a list of type definitions.

```js
[ key, "conditional", conditionalKey, [
  ...values
] ]
```
