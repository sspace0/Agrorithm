import { readFile, writeFile } from "node:fs/promises";
const source = await readFile(new URL("../public/images/agrorithm-o.png", import.meta.url));
const width = source.readUInt32BE(16), height = source.readUInt32BE(20);
if (width !== 256 || height !== 256) throw Error("Prepare the isolated botanical mark before building its browser icon.");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Agrorithm</title><rect width="64" height="64" rx="15" fill="#eef3df"/><image x="2" y="2" width="60" height="60" href="data:image/png;base64,${source.toString("base64")}"/></svg>`;
await writeFile(new URL("../public/images/agrorithm-mark.svg", import.meta.url), svg);
console.log("Built botanical O icon from the supplied Agrorithm logo.");
