import test from 'node:test';
import assert from 'node:assert/strict';
import {requestId} from '../app/static/request-id.mjs';
const valid = id => assert.match(id, /^[A-Za-z0-9_-]{1,100}$/);
test('native UUID is used when available', () => {
  assert.equal(requestId({randomUUID:()=> '12345678-1234-1234-1234-123456789012'}),'12345678-1234-1234-1234-123456789012');
});
test('HTTP-compatible random bytes work without randomUUID', () => {
  const id=requestId({getRandomValues:bytes=>bytes.fill(42)});
  assert.equal(id,'2a'.repeat(16)); valid(id);
});
test('older-browser IDs are valid and distinct', () => {
  const ids=Array.from({length:1000},()=>requestId({}));
  ids.forEach(valid);assert.equal(new Set(ids).size,1000);
});
