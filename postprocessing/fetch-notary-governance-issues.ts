import { writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import { getAllIssues } from "../utils/github.ts";

const data = await getAllIssues();

await writeJSON('./data/raw/notary-governance-issues.json', data)
