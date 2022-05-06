import { writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import { getAllIssues } from "../utils/github.ts";
// import { getParsedVerifierIssues } from "./parse-verifier-application-issue.ts";

const data = await getAllIssues();

await writeJSON("./data/raw/notary-governance-issues.json", data);

// await writeJSON(
//   "./data/processed/notary-governance-issues.json",
//   getParsedVerifierIssues(),
// );
