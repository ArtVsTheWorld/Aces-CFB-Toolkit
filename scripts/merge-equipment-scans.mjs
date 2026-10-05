import fs from "node:fs";
const inputs = process.argv.slice(2).map(file => JSON.parse(fs.readFileSync(file, "utf8")));
if (!inputs.length || inputs.some(input => input.ProcessId !== inputs[0].ProcessId)) throw new Error("Only merge scans from the same game process.");
const names = new Map();
for (const input of inputs) for (const match of input.Matches) {
  const merged = names.get(match.Name) ?? { Name: match.Name, SampleAddresses: [], Encodings: [] };
  merged.SampleAddresses = [...new Set([...merged.SampleAddresses, ...match.SampleAddresses])];
  merged.Encodings = [...new Set([...merged.Encodings, ...match.Encodings])];
  names.set(match.Name, merged);
}
console.log(JSON.stringify({ ProcessId:inputs[0].ProcessId, Complete:inputs.at(-1).Complete, NextScanOffset:inputs.at(-1).NextScanOffset, Matches:[...names.values()] },null,2));
