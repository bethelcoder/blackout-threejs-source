import { readFile } from 'node:fs/promises';

// Match Vite's JSON module handling for the DOM-stubbed Level 3 check in Node.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const source = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: `export default ${source};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
