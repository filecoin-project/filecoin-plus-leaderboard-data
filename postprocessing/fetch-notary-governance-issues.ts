import { writeJSON } from '../utils/general.ts';
import { getAllIssues } from '../utils/github.ts';
import { RAW_DATA_PATH } from '../constants.ts';

async function main() {
  try {
    const startTime = Date.now();
    const data = await getAllIssues();
    const elapsed = Date.now() - startTime;
    console.log(`Fetched ${data.length} issues in ${elapsed}ms`);

    await writeJSON(`${RAW_DATA_PATH}/notary-governance-issues.json`, data);
    console.log('Data successfully written to file.');
  } catch (error) {
    console.error('An error occurred:', error);
    Deno.exit(1);
  }
}

main();
