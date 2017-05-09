import R from 'ramda';
import { segment } from './lib';

const tickParser = R.reduce((partial, event) => {
  const { type, data } = event;

  // Player changes
  if (type === 'playerAdd') {
    const { playerId, ...rest } = data;
    return R.assocPath(
      ['players', playerId],
      rest,
      partial
    );
  }
  if (type === 'playerRemove') {
    const { playerId } = data;
    return R.dissocPath(
      ['players', playerId],
      partial
    );
  }
  if (type === 'playerUpdate') {
    const { playerId, status } = data;
    return R.over(
      R.lensPath(['players', playerId, 'status']),
      R.merge(R.__, status),
      partial
    );
  }

  // Vehicle changes
  if (type === 'vehicleAdd') {
    const { id, ...rest } = data;
    return R.assocPath(
      ['vehicles', id],
      rest,
      partial
    );
  }
  if (type === 'vehicleRemove') {
    const { id } = data;
    return R.dissocPath(
      ['vehicles', id],
      partial
    );
  }
  if (type === 'vehicleUpdate') {
    const { id, status } = data;
    return R.over(
      R.lensPath(['vehicles', id, 'status']),
      R.merge(R.__, status),
      partial
    );
  }

  // FOBs
  if (type === 'fobAdd') {
    const { id, ...rest } = data;
    return R.assocPath(
      ['fobs', id],
      rest,
      partial
    );
  }
  if (type === 'fobRemove') {
    const { id } = data;
    return R.dissocPath(
      ['fobs', id],
      partial
    );
  }

  // Tickets
  if (type === 'ticketsTeam1') {
    const { tickets } = data;
    return R.assocPath(
      ['tickets', 'team1'],
      tickets,
      partial
    );
  }
  if (type === 'ticketsTeam2') {
    const { tickets } = data;
    return R.assocPath(
      ['tickets', 'team2'],
      tickets,
      partial
    );
  }

  // Rallys
  if (type === 'rallyAdd') {
    const { groupId, ...rest } = data;
    return R.assocPath(
      ['rallies', groupId],
      rest,
      partial
    );
  }
  if (type === 'rallyRemove') {
    const { groupId } = data;
    return R.dissocPath(
      ['rallies', groupId],
      partial
    );
  }

  // Caches
  if (type === 'cacheAdd') {
    const { id, ...rest } = data;
    return R.assocPath(
      ['caches', id],
      rest,
      partial
    );
  }
  if (type === 'cacheRemove') {
    const { id } = data;
    return R.dissocPath(
      ['caches', id],
      partial
    );
  }
  if (type === 'cacheReveal') {
    const { id } = data;
    return R.assocPath(
      ['caches', id, 'revealed'],
      true,
      partial
    );
  }
  if (type === 'intelChange') {
    const { points } = data;
    return R.over(
      R.lensPath(['intel']),
      R.compose(
        R.add(points),
        R.defaultTo(0)
      ),
      partial
    );
  }

  // Squads
  if (type === 'squadName') {
    const { groupId, squadName } = data;
    return R.assocPath(
      ['squads', String(groupId)],
      squadName,
      partial
    );
  }

  return partial;
});

// // Create an array of states
// const state = R.compose(
//   R.tail,
//   R.reduce(
//     (states, tick) => [
//       ...states,
//       tickParser(R.last(states), tick)
//     ],
//     [ {} ]
//   ),
//   segment(event => event.type === 'tick')
// );

const state = R.compose(
  R.reduce(tickParser, {}),
  segment(event => event.type === 'tick')
);

export default state;
