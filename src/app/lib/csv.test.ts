import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCsv, safeCsvCell } from './csv';

test('escapes quotes and spreadsheet formula prefixes', () => {
  assert.equal(safeCsvCell('a"b'), '"a""b"');
  assert.equal(safeCsvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(makeCsv([['a', 'b'], ['1', '2']]), '"a","b"\r\n"1","2"');
});
