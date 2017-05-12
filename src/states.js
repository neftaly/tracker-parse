import R from 'ramda';
import {
  segment
} from './lib';
import {
  fromJS,
  Map,
  List
} from 'immutable';

const tickParser = R.reduce((state, event) => {
  const {
    type: [ action, category ],
    data
  } = event;

  if (action === 'tick') return state;

  if (action === 'add') {
    const { id, ...rest } = data;
    return state.setIn(
      [category, id],
      fromJS(rest)
    );
  }

  if (action === 'remove') {
    const { id } = data;
    return state.deleteIn(
      [category, id]
    );
  }

  if (action === 'update') {
    const { id, ...rest } = data;
    return state.mergeDeepIn(
      [category, id],
      fromJS(rest)
    );
  }

  if (action === 'log') {
    const item = (() => {
      const basic = fromJS(data);
      const player = id => state.getIn(['players', id]);
      switch (category) {
        case 'messages':
        case 'kits':
          return basic.set(
            'player', player(data.id)
          );
        case 'kills':
          return basic.set(
            'victim', player(data.victimId)
          ).set(
            'attacker', player(data.attackerId)
          );
        case 'revives':
          return basic.set(
            'victim', player(data.victimId)
          ).set(
            'medic', player(data.medicId)
          );
        default:
          return basic;
      }
    })();
    return state.update(
      category,
      new List([]),
      log => log.push(item)
    );
  }

  if (action === 'intel') {
    const { change } = data;
    return state.updateIn(
      ['server', 'details', 'intel'],
      R.add(change)
    );
  }

  console.warn('Unknown event', action, category);
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
      past => tickParser(past, tick)
    )
  ), initial),
  segment(event => event.type[0] === 'tick') // Segment events by tick
)(events);

export {
  states
};
