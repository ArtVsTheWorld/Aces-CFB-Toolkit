// Bounded EA roster decoder. Optional type evidence supports verified encoding.
export function decodeRosterTdf(buffer, { typed = false } = {}) {
  const types = new Map(); let rootTerminated = false;
  let offset = 0, nodes = 0;
  const requireBytes = size => { if (!Number.isSafeInteger(size) || size < 0 || offset + size > buffer.length) throw new Error('Roster data is truncated.'); };
  const integer = () => {
    requireBytes(1); let byte = buffer[offset++], value = BigInt(byte & 63), shift = 6n; const negative = Boolean(byte & 64);
    while (byte & 128) { requireBytes(1); byte = buffer[offset++]; value |= BigInt(byte & 127) << shift; shift += 7n; if (shift > 70n) throw new Error('Roster integer is too large.'); }
    if (negative) value = -value;
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value;
  };
  const byte = () => { requireBytes(1); return buffer[offset++]; };
  const data = (type, depth, location) => {
    if (typed) { const old=types.get(location);if(old&&old.type!==type)throw new Error('Roster field types disagree.');if(!old)types.set(location,{type}); }
    if (++nodes > 4000000 || depth > 64) throw new Error('Roster structure exceeds safe limits.');
    if (type === 0) return integer();
    if (type === 1 || type === 2) { const length = integer(); requireBytes(length); const result = buffer.subarray(offset, offset += length); return type === 1 ? result.toString('utf8').replace(/\0$/, '') : result; }
    if (type === 3) return fields(depth + 1, true, location);
    if (type === 4) { const element = byte(), count = integer(); if (!Number.isSafeInteger(count) || count < 0 || count > 1000000) throw new Error('Roster list is invalid.'); if(typed)types.set(location,{type,element}); return Array.from({ length: count }, () => data(element, depth + 1, location+'[]')); }
    if (type === 5) { const keyType = byte(), valueType = byte(), count = integer(); if (!Number.isSafeInteger(count) || count < 0 || count > 1000000) throw new Error('Roster map is invalid.'); if(typed)types.set(location,{type,keyType,valueType}); return Array.from({ length: count }, () => [data(keyType, depth + 1, location+'{key}'), data(valueType, depth + 1, location+'{value}')]); }
    if (type === 6) { const active = byte(); return active === 127 ? null : { active, ...field(depth + 1, location+'|'+active) }; }
    if (type === 10) { requireBytes(4); const value = buffer.readFloatBE(offset); offset += 4; return value; }
    throw new Error(`Unsupported roster field type ${type}.`);
  };
  const field = (depth, location) => { requireBytes(4); const packed = buffer.readUIntBE(offset, 3); offset += 3; const tag = [18, 12, 6, 0].map(shift => String.fromCharCode(((packed >>> shift) & 63) + 32)).join('').trimEnd(); const type = byte(); return { tag, value: data(type, depth, location+'.'+tag) }; };
  const fields = (depth, terminated, location = '$') => { const result = {}; while (offset < buffer.length) { if (buffer[offset] === 0) { if (terminated || depth === 0 && offset === buffer.length - 1) { offset++; if(depth===0)rootTerminated=true; return result; } throw new Error('Unexpected data after roster terminator.'); } const { tag, value } = field(depth, location); if (Object.hasOwn(result, tag)) throw new Error(`Duplicate roster field ${tag}.`); result[tag] = value; } if (terminated) throw new Error('Roster structure has no terminator.'); return result; };
  const value=fields(0, false); return typed?{value,types,rootTerminated}:value;
}
