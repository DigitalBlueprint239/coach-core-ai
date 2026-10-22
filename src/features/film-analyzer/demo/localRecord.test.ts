import { clearVerified, decode, emptyMark, encode, RECORD_KEY, validMark, writeVerified } from './localRecord';
const mark = { startMs: 3500, endMs: 6000, label: 'Out route', note: 'Break toward the sideline.' };
afterEach(() => { jest.restoreAllMocks(); localStorage.clear(); });
it('round-trips the exact interval/text and binds both synthetic encodings', () => {
  expect(decode(encode(mark))).toEqual(mark);
  expect(writeVerified(mark)).toBe(localStorage.getItem(RECORD_KEY));
});
it.each([{ ...mark, startMs: -1 }, { ...mark, endMs: 8001 }, { ...mark, startMs: 6000 }, { ...mark, startMs: NaN }, { ...mark, label: '' }, { ...mark, note: 'x'.repeat(2001) }])('rejects invalid ranges/text %j', value => {
  expect(validMark(value)).toBe(false); expect(() => encode(value)).toThrow();
});
it('rejects foreign, malformed and unexpected stored identities without deleting them', () => {
  for (const raw of ['{', 'null', JSON.stringify({ ...JSON.parse(encode(mark)), sampleId: 'foreign' }), JSON.stringify({ ...JSON.parse(encode(mark)), extra: true }), JSON.stringify({ ...JSON.parse(encode(mark)), sampleHashes: [] })]) {
    localStorage.setItem(RECORD_KEY, raw); expect(() => decode(raw)).toThrow(); expect(localStorage.getItem(RECORD_KEY)).toBe(raw);
  }
});
it('propagates blocked storage access', () => {
  jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
  expect(() => writeVerified(mark)).toThrow('denied');
});
it('propagates quota failure and preserves the previous saved record', () => {
  localStorage.setItem(RECORD_KEY, encode(mark));
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  expect(() => writeVerified({ ...mark, note: 'new' })).toThrow(); expect(decode(localStorage.getItem(RECORD_KEY)!)).toEqual(mark);
});
it('rejects mismatching or throwing readback', () => {
  const spy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('different');
  expect(() => writeVerified(mark)).toThrow('readback'); spy.mockImplementation(() => { throw new Error('read denied'); });
  expect(() => writeVerified(mark)).toThrow('read denied');
});
it('reset deletes only this record and checks actual deletion', () => {
  localStorage.setItem(RECORD_KEY, encode(mark)); localStorage.setItem('unrelated', 'keep'); clearVerified();
  expect(localStorage.getItem(RECORD_KEY)).toBeNull(); expect(localStorage.getItem('unrelated')).toBe('keep');
});
it('rejects reset removal failure and a no-op removal', () => {
  localStorage.setItem(RECORD_KEY, encode(mark));
  const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  expect(() => clearVerified()).toThrow('denied'); spy.mockImplementation(() => {}); expect(() => clearVerified()).toThrow('confirmed');
});
it('the empty session mark cannot be claimed as a valid saved cue', () => expect(validMark(emptyMark())).toBe(false));
