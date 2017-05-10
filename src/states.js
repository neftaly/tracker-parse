import R from 'ramda';
import { segment } from './lib';
import { fromJS, Map, List } from 'immutable';

const undefinedFlags = fromJS({ flags: undefined });

// TODO: use immutable.withMutations for entirity of tickParser reduce
const tickParser = R.reduce((state, event) => {
  const { type, data } = event;

  // Server
  if (type === 'serverDetails') {
    return state.set(
      'server',
      fromJS(data)
    );
  }
  if (type === 'tick') return state;

  // Player changes
  if (type === 'playerAdd') {
    const { id, ...rest } = data;
    return state.setIn(
      ['players', id],
      fromJS(rest)
    );
  }
  if (type === 'playerRemove') {
    const { id } = data;
    return state.deleteIn(
      ['players', id]
    );
  }
  if (type === 'playerUpdate') {
    const { id, ...rest } = data;
    return state.mergeDeepIn(
      ['players', id],
      fromJS(rest),
      undefinedFlags
    );
  }

  // Vehicle changes
  if (type === 'vehicleAdd') {
    const { id, ...rest } = data;
    return state.setIn(
      ['vehicles', id],
      fromJS(rest)
    );
  }
  if (type === 'vehicleRemove') {
    const { id } = data;
    return state.deleteIn(
      ['vehicles', id]
    );
  }
  if (type === 'vehicleUpdate') {
    const { id, ...rest } = data;
    return state.mergeDeepIn(
      ['vehicles', id],
      fromJS(rest),
      undefinedFlags
    );
  }

  // FOBs
  if (type === 'fobAdd') {
    const { id, ...rest } = data;
    console.log(data);
    return state.setIn(
      ['fobs', id],
      fromJS(rest)
    );
  }
  if (type === 'fobRemove') {
    const { id } = data;
    return state.deleteIn(
      ['fobs', id]
    );
  }

  // Tickets
  if (type === 'ticketsTeam1' || type === 'ticketsTeam2') {
    const team = type === 'ticketsTeam1' ? 1 : 2;
    const { tickets } = data;
    return state.setIn(
      ['tickets', team],
      tickets
    );
  }

  // Rallys
  if (type === 'rallyAdd') {
    const { id, ...rest } = data;
    return state.setIn(
      ['rallies', id],
      fromJS(rest)
    );
  }
  if (type === 'rallyRemove') {
    const { id } = data;
    return state.deleteIn(
      ['rallies', id]
    );
  }

  // Caches
  if (type === 'cacheAdd') {
    const { id, ...rest } = data;
    return state.setIn(
      ['caches', id],
      fromJS(rest)
    );
  }
  if (type === 'cacheRemove') {
    const { id } = data;
    return state.deleteIn(
      ['caches', id]
    );
  }
  if (type === 'cacheReveal') {
    const { id } = data;
    return state.setIn(
      ['caches', id, 'revealed'],
      true
    );
  }

  // Flags
  if (type === 'flagList') {
    const { id, ...rest } = data;
    return state.setIn(
      ['flags', id],
      fromJS(rest)
    );
  }
  if (type === 'flagUpdate') {
    const { id, owner } = data;
    return state.setIn(
      ['flags', id, 'owner'],
      owner
    );
  }

  // Intel
  if (type === 'intelChange') {
    const { points } = data;
    return state.update(
      'intel',
      0,
      R.add(points)
    );
  }

  // Squads
  if (type === 'squadName') {
    const {
      group: { team, squad },
      name
    } = data;
    return state.setIn(
      ['squads', team, squad],
      name
    );
  }

  // Chat
  if (type === 'chat') {
    const { id } = data;
    return state.update(
      'messages',
      new List([]),
      messages => messages.push(
        fromJS(data).set(
          'user',
          state.getIn(['players', id])
        )
      )
    );
  }

  console.log(type);

  return state;
});

const states = (
  initial = new List([]),
  events
) => R.compose(
  R.reduce((past, tick) => past.push(
    past.get(
      -1, new Map({})
    ).withMutations(
      p => tickParser(p, tick)
    )
  ), initial),
  segment(event => event.type === 'tick')
)(events);

export default states;
