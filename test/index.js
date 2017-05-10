import tape from 'tape';
import fs from 'fs';
import { parser, states } from '../src';

const rawFile = fs.readFileSync(
  './test/fixtures/tracker_2017_04_18_12_31_11.PRdemo'
);

const aStart = new Date();
const parsed = parser(rawFile);
const aEnd = new Date();
console.warn('Parse time: ' + ((aEnd - aStart) / 1000) + ' sec');

fs.writeFileSync(
  './test/results/tracker_2017_04_18_12_31_11.json',
  JSON.stringify(parsed, null, 2)
);

const bStart = new Date();
const result = states(undefined, parsed);
const bEnd = new Date();
console.warn('State time: ' + ((bEnd - bStart) / 1000) + ' sec');

fs.writeFileSync(
  './test/results/tracker_2017_04_18_12_31_11.state.json',
  JSON.stringify(result.last(), null, 2)
);

tape(test => {
  test.plan(1);
  test.skip(1);
}, 'parser');
