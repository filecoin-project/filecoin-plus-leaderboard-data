import { writeJSON } from '../utils/general.ts';
import { getAllIssues } from '../utils/github.ts';

const data = await getAllIssues();

await writeJSON('./data/raw/notary-governance-issues.json', data);
