import fs from "fs";

export function loadCommentaryMap(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, "utf8"); }
  catch (error) { throw new Error(`Cannot read commentary map ${filePath}: ${error.message}`); }
  const map = new Map();
  // Current format: Name | ID. The legacy labeled format remains accepted so
  // users can still supply an older custom list with --map.
  const pattern = /^(?:Last Name:\s*)?(.*?)\s*\|\s*(?:Commentary ID:\s*)?(\d+)\s*$/gmi;
  for (const match of text.matchAll(pattern)) {
    const id = Number(match[2]);
    const name = match[1]?.trim();
    if (name && !/^Total names$/i.test(name) && Number.isSafeInteger(id) && id > 0) map.set(name, id);
  }
  if (!map.size) throw new Error(`No valid commentary entries were found in ${filePath}.`);
  return map;
}


