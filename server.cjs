// Dependency-free, loopback-only static preview (Node.js 18+). Serves only the site files below.
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;const port=Number(process.env.PORT||4173);
const allowed=new Set(['index.html','app.js','style.css','assets/hero.jpeg','assets/lake.jpeg','assets/forest.jpeg','assets/shore.jpeg','assets/masterplan.webp','assets/plots.json']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpeg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);return res.end();}
 if(!allowed.has(name)){res.writeHead(404);return res.end('Not found');}
 const file=path.resolve(root,name);
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
}).listen(port,'127.0.0.1',()=>console.log('Vuolie preview: http://127.0.0.1:'+port));
