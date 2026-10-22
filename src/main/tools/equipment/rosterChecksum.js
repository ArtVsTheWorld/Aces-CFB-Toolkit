// The roster container uses CRC-32/BZIP2 over the complete unpacked TDF.
// Unlike ZIP/gzip CRC-32, this variant is not reflected. Both its initial
// value and final XOR are 0xffffffff; the polynomial is 0x04c11db7.
const table=Uint32Array.from({length:256},(_,index)=>{
 let value=index<<24;
 for(let bit=0;bit<8;bit++)value=(value&0x80000000)?(value<<1)^0x04c11db7:value<<1;
 return value>>>0;
});

export function rosterChecksum(bytes){
 if(!Buffer.isBuffer(bytes))throw new Error('Invalid roster checksum input.');
 let checksum=0xffffffff;
 for(const byte of bytes)checksum=((checksum<<8)^table[((checksum>>>24)^byte)&255])>>>0;
 return (checksum^0xffffffff)>>>0;
}
