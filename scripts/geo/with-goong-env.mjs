// Local development helper: runs a command with the Goong keys from a file OUTSIDE the repository.
// Usage: node scripts/geo/with-goong-env.mjs <command> [args...]
// Key file: $GOONG_ENV_FILE or %USERPROFILE%/.vig-secrets/goong.env (KEY=value lines). Values are never printed.
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
const file=process.env.GOONG_ENV_FILE||join(homedir(),'.vig-secrets','goong.env');
const env={...process.env};
for(const line of readFileSync(file,'utf8').split(/\r?\n/)){const m=/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);if(m)env[m[1]]=m[2].trim()}
const [cmd,...args]=process.argv.slice(2);
if(!cmd){console.error('usage: node scripts/geo/with-goong-env.mjs <command> [args...]');process.exit(2)}
const child=spawn(cmd,args,{env,stdio:'inherit',shell:process.platform==='win32'});
child.on('exit',code=>process.exit(code??1));
