import { readJSON, writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";

const inputFilename = Deno.args[0];
const outputFilename = `${inputFilename}-processed`;
