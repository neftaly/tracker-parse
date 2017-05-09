import R from 'ramda';
import {
  getCString,
  getBitArray
} from './lib';

// TODO: Remove this hack
// There is a bug with conditional collections, but I'm drawing a blank on it,
// so will just manually parse for now.

const fixPlayerUpdate = event => {
  const playerUpdateFlags = {
    team: 1,
    squad: 2,
    vehicle: 4,
    health: 8,
    score: 16,
    teamworkScore: 32,
    kills: 64,
    teamkills: 128,
    deaths: 256,
    ping: 512,
    placeholder: 1024,
    isAlive: 2048,
    isJoining: 4096,
    position: 8192,
    yaw: 16384,
    kit: 32768
  };
  const view = new DataView(event.data);
  const length = view.byteLength;
  const data = [];
  for (let offset = 0; offset < length;) {
    const item = {};
    const flags = view.getUint16(offset, true);
    offset = offset + 2;
    item.playerId = view.getUint8(offset);
    offset = offset + 1;
    // item.zflags = R.compose(
    //   R.map(Boolean),
    //   getBitArray
    // )(offset, 2, event.data);
    // item.yflags = flags;
    item.flags = [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false
    ];
    item.status = {};
    if (flags & playerUpdateFlags.team) {
      item.status.team = view.getInt8(offset);
      offset = offset + 1;
      item.flags[0] = true;
    }
    if (flags & playerUpdateFlags.squad) {
      item.status.squad = view.getUint8(offset);
      offset = offset + 1;
      item.flags[1] = true;
    }
    if (flags & playerUpdateFlags.vehicle) {
      item.status.vehicle = {};
      item.status.vehicle.vehicleId = view.getInt16(offset, true);
      offset = offset + 2;
      if (item.status.vehicle.vehicleId >= 0) {
        item.status.vehicle.seat = getCString(event.data, offset);
        offset = offset + item.status.vehicle.seat.length + 1;
        item.status.vehicle.slot = view.getInt8(offset);
        offset = offset + 1;
      }
      item.flags[2] = true;
    }
    if (flags & playerUpdateFlags.health) {
      item.status.health = view.getInt8(offset, true);
      offset = offset + 1;
      item.flags[3] = true;
    }
    if (flags & playerUpdateFlags.score) {
      item.status.score = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[4] = true;
    }
    if (flags & playerUpdateFlags.teamworkScore) {
      item.status.teamworkScore = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[5] = true;
    }
    if (flags & playerUpdateFlags.kills) {
      item.status.kills = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[6] = true;
    }
    if (flags & playerUpdateFlags.teamkills) {
      // THIS DATA IS NOT READABLE
      item.flags[7] = true;
    }
    if (flags & playerUpdateFlags.deaths) {
      item.status.deaths = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[8] = true;
    }
    if (flags & playerUpdateFlags.ping) {
      item.status.ping = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[9] = true;
    }
    if (flags & playerUpdateFlags.placeholder) {
      // THIS DATA IS NOT READABLE
      item.flags[10] = true;
    }
    if (flags & playerUpdateFlags.isAlive) {
      item.status.isAlive = view.getInt8(offset) === 1;
      offset = offset + 1;
      item.flags[11] = true;
    }
    if (flags & playerUpdateFlags.isJoining) {
      item.status.isJoining = view.getInt8(offset) === 1;
      offset = offset + 1;
      item.flags[12] = true;
    }
    if (flags & playerUpdateFlags.position) {
      item.status.position = {
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true),
        z: view.getInt16(offset + 4, true)
      };
      offset = offset + 6;
      item.flags[13] = true;
    }
    if (flags & playerUpdateFlags.yaw) {
      item.status.yaw = view.getInt16(offset, true);
      offset = offset + 2;
      item.flags[14] = true;
    }
    if (flags & playerUpdateFlags.kit) {
      item.status.kit = getCString(event.data, offset);
      offset = offset + item.status.kit.length + 1;
      item.flags[15] = true;
    }
    data.push(item);
  }
  return R.assoc('data', data, event);
};

const fixVehicleUpdate = event => {
  const view = new DataView(event.data);
  const length = view.byteLength;
  const data = [];
  for (let offset = 0; offset < length;) {
    const item = {};
    item.flags = R.compose(
      R.map(Boolean),
      getBitArray
    )(offset, 1, event.data);
    offset = offset + 1;
    item.vehicleId = view.getInt16(offset, true);
    offset = offset + 2;
    if (item.flags[0]) {
      item.team = view.getInt8(offset, true);
      offset = offset + 1;
    }
    if (item.flags[1]) {
      item.position = {
        x: view.getInt16(offset + 0, true),
        y: view.getInt16(offset + 2, true),
        z: view.getInt16(offset + 4, true)
      };
      offset = offset + 6;
    }
    if (item.flags[2]) {
      item.yaw = view.getInt16(offset, true);
      offset = offset + 2;
    }
    if (item.flags[3]) {
      item.health = view.getInt16(offset, true);
      offset = offset + 2;
    }
    data.push(item);
  }
  return R.assoc('data', data, event);
};

const fixEvent = event => {
  const { type } = event;
  if (type === 'playerUpdate') {
    return fixPlayerUpdate(event);
  }
  if (type === 'vehicleUpdate') {
    return fixVehicleUpdate(event);
  }
  return event;
};

export default fixEvent;
