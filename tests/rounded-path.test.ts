import { expect, it } from 'vitest';
import { softenOrthogonalPath } from '../src/rounded-path';

it('softens corners without shifting an arrow endpoint', () => {
  expect(softenOrthogonalPath('M0,0L95,0Q100,0 100,5L100,96', 12))
    .toBe('M0,0L88,0Q100,0 100,12L100,96');
});
it('bounds curves on short legs and retains multiple turns', () => {
  expect(softenOrthogonalPath('M0,0L20,0L20,6L40,6', 12))
    .toBe('M0,0L17,0Q20,0 20,3L20,3Q20,6 23,6L40,6');
});
it('preserves straight paths, duplicates and reversed directions', () => {
  expect(softenOrthogonalPath('M40,30L20,30L20,30L20,0', 10))
    .toBe('M40,30L30,30Q20,30 20,20L20,0');
  expect(softenOrthogonalPath('M0,0L100,0L0,0', 10)).toBe('M0,0L100,0L0,0');
});
it.each(['M0,0C10,1 20,2 30,3', 'M0,0L20,20', 'M0,0Q10,10 20,0', 'M0,0A5,5 0 0 1 10,0', 'M0,0LNaN,1'])('leaves unsupported geometry untouched: %s', path => {
  expect(softenOrthogonalPath(path, 12)).toBe(path);
});
