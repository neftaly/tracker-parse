# tracker-parse
Converts a pr-tracker log to an array of events.

## usage
```js
import parse from 'tracker-parse';

const events = parse(log);
```

## messages.json format

messages.json contains a map of message IDs,
and the associated decoding instructions.

```json
{
  "32": {
    "type": "vehicleUpdate",
    "multiple": true,
    "format": [
      [ "flags", "bitmask", [
        "team",
        "position",
        "yaw",
        "health"
      ] ],
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

### `comment`: **string** OR **array**
Comments regarding a particular message.
For multiple lines, use an array of strings.

### `multiple`: **boolean** *optional*
Whether a message can contain multiple sets of data.

  * `true`: message will be continually parsed until the entire chunk is read
  * `false`: message data beyond that defined in `format` will be ignored

### `format`: **array** OR **null**
An list of `[ key, type, ... ]` tuples, defining data format and order.

If `null`, raw `Uint8Array` data will be returned instead.

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
  * **collection**: nested group of values
  * ~~**conditional**: nested group of values, read depending on prior `byte array`~~

Number types are expected to be little-endian.

#### `collection`
A collection is a nested list of values.
The third argument contains a nested list of type definitions.

```js
[ key, "collection", [
  ...types
] ]
```

#### `conditional`
**Not yet implemented**

A conditional is a nested group of values,
that are turned on or off depending on a prior `value`.

The third argument contains the key of the prior `value`,
and the fourth contains a list of type definitions.

```js
[ key, "conditional", conditionalKey, [
  ...values
] ]
```
