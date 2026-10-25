// Static + HTTP checks (Node.js 18+, no dependencies): node test.cjs
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {spawn}=require('node:child_process');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let checks=0;const check=(name,fn)=>{fn();checks++;};
(async()=>{
const html=read('index.html'),css=read('style.css'),js=read('app.js');
const data=JSON.parse(read('assets/plots.json'));
const prices=JSON.parse(js.match(/const plotPrices=(\{[^}]+\})/)[1].replace(/(\d+):/g,'"$1":'));
const sold=JSON.parse(js.match(/const soldPlots=(\[[^\]]+\])/)[1]);
check('app.js parses',()=>new vm.Script(js));

// Snapshot data (17.10.2026): geometry, areas, prices, sold statuses.
check('233 unique plots',()=>{assert.equal(data.plots.length,233);assert.equal(new Set(data.plots.map(p=>p.id)).size,233);});
check('embedded geometry equals plots.json exactly',()=>{const embedded=JSON.parse(js.match(/^const plots=(\[.*\]);$/m)[1]);assert.deepEqual(embedded,data.plots);for(const p of data.plots){assert(p.area>0);assert(p.points.split(' ').length>=8);}});
check('187 published prices, 46 sold, disjoint and complete',()=>{assert.equal(Object.keys(prices).length,187);assert.equal(sold.length,46);assert.equal(prices[78],210000);for(const p of data.plots)assert.equal(sold.includes(p.id),!Object.hasOwn(prices,p.id));});
check('snapshot date 17.10.2026 shown',()=>{assert(html.includes('17.10.2026'));assert(js.includes("SNAPSHOT='17.10.2026'"));});
check('hero facts derived from data',()=>{const trusted=Object.entries(prices).filter(([id])=>id!=='78').map(([,v])=>v);assert.equal(Math.min(...trusted),1300000);assert.equal(Math.max(...trusted),6000000);const areas=data.plots.map(p=>p.area);assert.equal(Math.min(...areas),6);assert.equal(Math.max(...areas),15);
 assert(html.includes('<strong>187</strong><span>в продаже*</span>'));assert(html.includes('<strong>от 1,3 млн ₽</strong>'));assert(html.includes('<strong>6–15</strong>'));assert(!/от 210 000|от 0,21/.test(html));assert(js.includes('+id!==ANOMALY'));});

// Markup integrity.
check('area options well-formed',()=>{const sel=html.match(/<select id="filter-area">(.*?)<\/select>/)[1];assert(!/<\/option\s+value/.test(html));const values=[...sel.matchAll(/<option value="([^"]+)">[^<]+<\/option>/g)].map(m=>m[1]);assert.deepEqual(values,['all','6-7','7-10','10-99']);});
check('no duplicate ids',()=>{const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);});
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
for(const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(/^(https?|data):/.test(m[1]))continue;check('local asset '+m[1],()=>assert(fs.existsSync(path.join(__dirname,m[1])),m[1]+' missing'));}
for(const m of html.matchAll(/href="#([^"]+)"/g))check('anchor '+m[1],()=>assert(ids.includes(m[1]),'missing anchor '+m[1]));
check('every $(#id) used in app.js exists',()=>{for(const m of js.matchAll(/\$\('#([\w-]+)/g))assert(ids.includes(m[1]),'#'+m[1]+' missing in HTML');});
check('selector comes right after hero',()=>{const order=['class="hero"','id="genplan"','id="checklist"','id="place"','id="faq"','class="closing"'].map(s=>html.indexOf(s));assert(order.every((v,i)=>v>0&&(i===0||v>order[i-1])));});
check('double-ended price range + numeric inputs',()=>{for(const id of ['price-min','price-max','price-min-input','price-max-input'])assert(ids.includes(id));assert(js.includes('PRICE_LOW=Math.min(...trustedPrices)'));});

// Honesty: disclosures, no lead capture, no external transmission.
check('disclosures kept',()=>{assert(html.includes('не официальный сайт'));assert(html.includes('Не является публичной офертой'));assert(html.includes('Подлинный генплан'));assert(html.includes('Запрос не отправляется'));assert(html.includes('Получатель заявок'));});
check('no form, no personal-data fields',()=>{assert(!html.includes('<form'));assert(!/type="(tel|email)"|autocomplete="(name|tel|email)"/.test(html));});
check('no network transmission in app.js',()=>{assert(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\(/.test(js));assert(!/<script[^>]+src="https?:/.test(html));assert(!/@import|url\(https?:/.test(css));});
check('analytics hooks labelled not connected',()=>{assert(js.includes('NOT connected'));assert(js.includes("track('request_copy'"));});
check('no fake scarcity/reviews',()=>{assert(!/осталось всего|только сегодня|отзыв|★/i.test(html+js));});
check('css essentials',()=>{assert(css.includes('prefers-reduced-motion'));assert(css.includes('@media(max-width:760px)'));assert(css.includes('#focus-ring')||css.includes('.ring.outer'));});

// HTTP: server.cjs serves exactly the site allowlist.
const port=4190+Math.floor(Math.random()*500),base=`http://127.0.0.1:${port}/`;
const srv=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
try{
 for(let i=0;i<50;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 for(const file of ['','style.css','app.js','assets/hero.jpeg','assets/lake.jpeg','assets/forest.jpeg','assets/shore.jpeg','assets/masterplan.webp','assets/plots.json']){const r=await fetch(base+file);assert.equal(r.status,200,file);const body=Buffer.from(await r.arrayBuffer());assert(body.equals(fs.readFileSync(path.join(__dirname,file||'index.html'))),file+' served bytes differ');checks++;}
 assert.equal((await fetch(base+'missing')).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);checks+=2;
 for(const f of ['README.md','SOURCES.md','server.cjs','test.cjs','.git/config','..%2fREADME.md'])assert.equal((await fetch(base+f)).status,404,f),checks++;
}finally{srv.kill();}
console.log('PASS: '+checks+' static/HTTP checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
