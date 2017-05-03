import tape from 'tape';
import fs from 'fs';
import parse from '../index';

const rawFile = fs.readFileSync(
  './test/fixtures/tracker_2017_04_18_12_31_11.PRdemo'
);

tape(test => {
  test.plan(1);

  const start = new Date();
  const parsed = parse(rawFile);
  const end = new Date();

  fs.writeFileSync(
    './test/results/tracker_2017_04_18_12_31_11.json',
    JSON.stringify(parsed, null, 2)
  );
  console.log('Execution time: ' + ((end - start) / 1000) + ' sec');

  test.skip(1);
}, 'parse');
