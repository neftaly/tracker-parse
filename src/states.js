import R from 'ramda';
import {
  fromJS,
  Map,
  List
} from 'immutable';
import requestAnimationFrame from 'raf';
import {
  segment
} from './lib';

const splitTicks = segment(event => event.type[0] === 'tick');

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

const fastTickParser = (
  past = new Map(),
  tick
) => past.withMutations(
  past => tickParser(past, tick)
);

const states = (
  initial = new List(),
  events
) => R.reduce(
  (past, tick) => past.push(
    fastTickParser(
      past.last(),
      tick
    )
  ),
  initial,
  splitTicks(events)
);

// Break events into chunks, and return a promise.
// Invoke fn(Boolean(done), List(history)) on every chunk,
// and process them in a preemptable manner.
const statesStream = (
  initial = new List(),
  events,
  cb = R.identity
) => new Promise((resolve, reject) => {
  const processChunks = (fn, prior, [chunk, ...chunks]) => {
    try {
      const history = R.reduce(
        (past, tick) => past.push(
          fastTickParser(past.last(), tick)
        ),
        prior,
        chunk
      );
      if (chunks.length === 0) {
        fn(true, history);
        resolve(history);
      } else {
        fn(false, history);
        requestAnimationFrame(
          () => processChunks(fn, history, chunks)
        );
      }
    } catch (error) {
      return reject(error);
    }
  };
  const ticks = splitTicks(events);
  return processChunks(
    cb,
    initial,
    R.splitEvery(Math.ceil(ticks.length / 200), ticks)
  );
});

export {
  states,
  statesStream
};
