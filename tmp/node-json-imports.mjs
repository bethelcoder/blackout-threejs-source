import { registerHooks } from 'node:module';
registerHooks({ load(url, context, nextLoad) {
  return nextLoad(url, url.endsWith('.json') ? { ...context, importAttributes: { ...context.importAttributes, type: 'json' } } : context);
} });
