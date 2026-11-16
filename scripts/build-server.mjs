import {build} from 'esbuild';
await build({entryPoints:['server/handler.ts'],bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',outfile:'server/generated-handler.mjs'});
