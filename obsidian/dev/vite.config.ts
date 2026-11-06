import { defineConfig } from 'vite';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';
export default defineConfig({ plugins:[{
  name:'optional-large-publication-fixtures',
  configureServer(server){
    server.middlewares.use((req,res,next)=>{
      const match=/^\/__real_jwpub\/(it|nwtsty|nwt)$/.exec(req.url||'');
      const root=process.env.ATLAS_REAL_JWPUB_DIR;
      if(!match||!root){next();return;}
      const file=path.join(root,match[1]+'.jwpub');
      if(!existsSync(file)){res.statusCode=404;res.end();return;}
      res.setHeader('Content-Type','application/octet-stream');createReadStream(file).pipe(res);
    });
  }
}], cacheDir: 'node_modules/.vite-obsidian', server: { host: '127.0.0.1', port: 4273, strictPort: true }, optimizeDeps: { entries: ['obsidian/dev/index.html'], include: ['yaml'] } });
