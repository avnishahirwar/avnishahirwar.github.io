const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const origin='https://friendlycalculator.in';
const ignored=new Set(['node_modules','vendor','_site','tests','.git','.github','admin','avnish-ai']);
function walk(dir,files=[]){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||ignored.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full,files);
  else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))files.push(full);
 }
 return files;
}
function headOf(html){const i=html.toLowerCase().indexOf('</head>');return i<0?html:html.slice(0,i);}
function langOf(html,file){
 const m=headOf(html).match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
 if(m)return m[1].toLowerCase();
 const first=path.relative(root,file).split(path.sep)[0];
 return ['hi','de','es','fr','pt','ar','id','bn','ta','ja','ru'].includes(first)?first:'en';
}
function canonicalOf(html){const m=headOf(html).match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i);return m?new URL(m[1],origin).href:null;}
function alternatesOf(html){return [...headOf(html).matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>({lang:m[1].toLowerCase(),href:new URL(m[2],origin).href}));}
function localFile(url){
 const u=new URL(url);if(u.origin!==origin||u.search||u.hash)return null;
 let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';else if(p.endsWith('/'))p+='index.html';
 const f=path.resolve(root,'.'+p);
 if(!f.startsWith(root+path.sep)&&f!==path.join(root,'index.html'))return null;
 return fs.existsSync(f)&&fs.statSync(f).isFile()?f:null;
}
test('international hreflang alternates are unique, same-domain, resolvable and reciprocal',()=>{
 const pages=walk(root),cache=new Map();
 for(const file of pages)cache.set(file,fs.readFileSync(file,'utf8'));
 const errors=[];let checked=0,tagged=0;
 for(const [file,html] of cache){
  const links=alternatesOf(html);if(!links.length)continue;tagged++;
  const sourceLang=langOf(html,file),sourceCanonical=canonicalOf(html);
  if(!sourceCanonical){errors.push(file+': hreflang present but canonical missing');continue;}
  const seen=new Set();
  for(const link of links){
   checked++;
   if(seen.has(link.lang))errors.push(file+': duplicate hreflang '+link.lang);
   seen.add(link.lang);
   const targetFile=localFile(link.href);
   if(!targetFile){errors.push(file+': '+link.lang+' target missing/off-domain: '+link.href);continue;}
   if(link.lang==='x-default')continue;
   const targetHtml=cache.get(targetFile)||fs.readFileSync(targetFile,'utf8');
   const targetLang=langOf(targetHtml,targetFile);
   if(targetLang!==link.lang)errors.push(file+': hreflang '+link.lang+' points to page declaring lang='+targetLang);
   const targetLinks=alternatesOf(targetHtml);
   if(!targetLinks.some(item=>item.lang===sourceLang&&item.href===sourceCanonical)){
    errors.push(file+': '+link.lang+' target does not reciprocate '+sourceLang+' -> '+sourceCanonical);
   }
  }
 }
 console.log('Hreflang audit: '+pages.length+' HTML pages, '+tagged+' pages with alternates, '+checked+' alternate references, '+errors.length+' defects.');
 if(errors.length)console.log(errors.slice(0,80).join('\n'));
 assert.equal(errors.length,0,'Hreflang defects: '+errors.length);
});
