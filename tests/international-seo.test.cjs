const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
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
function noindexOf(html){const h=headOf(html);return /<meta\b[^>]*\bname\s*=\s*["\'](?:robots|googlebot)["\'][^>]*\bcontent\s*=\s*["\'][^"\']*\bnoindex\b/i.test(h)||/<meta\b[^>]*\bcontent\s*=\s*["\'][^"\']*\bnoindex\b[^"\']*["\'][^>]*\bname\s*=\s*["\'](?:robots|googlebot)["\']/i.test(h);}
function alternatesOf(html){return [...headOf(html).matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>({lang:m[1].toLowerCase(),href:new URL(m[2],origin).href}));}
function localPath(url){
 const u=new URL(url);if(u.origin!==origin||u.search||u.hash)return null;
 let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';else if(p.endsWith('/'))p+='index.html';
 const f=path.resolve(root,'.'+p);
 if(!f.startsWith(root+path.sep)&&f!==path.join(root,'index.html'))return null;
 return f;
}
function localFile(url){const f=localPath(url);return f&&fs.existsSync(f)&&fs.statSync(f).isFile()?f:null;
}
test('changed international hreflang alternates are unique, same-domain, resolvable and reciprocal',()=>{
 const pages=walk(root),cache=new Map();
 let changedFiles;
 try {
  const baseRef=process.env.GITHUB_BASE_REF;
  const range=baseRef?'origin/'+baseRef+'...HEAD':'HEAD^...HEAD';
  changedFiles=new Set(execFileSync('git',['diff','--name-only',range,'--','*.html'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean));
 } catch { changedFiles=null; }
 const isRelevant=(source,target)=>changedFiles===null||changedFiles.has(path.relative(root,source).split(path.sep).join('/'))||(target&&changedFiles.has(path.relative(root,target).split(path.sep).join('/')));
 const record=(source,target,message)=>{if(isRelevant(source,target))errors.push(message);};
 const errors=[];
 for(const file of pages)cache.set(file,fs.readFileSync(file,'utf8'));
 let checked=0,tagged=0;
 for(const [file,html] of cache){
  const links=alternatesOf(html);if(!links.length)continue;tagged++;
  if(noindexOf(html)){record(file,null,file+': noindex page carries hreflang alternates');continue;}
  const sourceLang=langOf(html,file),sourceCanonical=canonicalOf(html);
  if(!sourceCanonical){record(file,null,file+': hreflang present but canonical missing');continue;}
  const seen=new Set();
  for(const link of links){
   checked++;
   if(seen.has(link.lang))record(file,null,file+': duplicate hreflang '+link.lang);
   seen.add(link.lang);
   const targetPath=localPath(link.href);
   const targetFile=localFile(link.href);
   if(!targetFile){record(file,targetPath,file+': '+link.lang+' target missing/off-domain: '+link.href);continue;}
   if(link.lang==='x-default')continue;
   const targetHtml=cache.get(targetFile)||fs.readFileSync(targetFile,'utf8');
   if(noindexOf(targetHtml)){record(file,targetFile,file+': '+link.lang+' target is noindex: '+link.href);continue;}
   const targetLang=langOf(targetHtml,targetFile);
   if(targetLang!==link.lang)record(file,targetFile,file+': hreflang '+link.lang+' points to page declaring lang='+targetLang);
   const targetLinks=alternatesOf(targetHtml);
   if(!targetLinks.some(item=>item.lang===sourceLang&&item.href===sourceCanonical)){
    record(file,targetFile,file+': '+link.lang+' target does not reciprocate '+sourceLang+' -> '+sourceCanonical);
   }
  }
 }
 console.log('Hreflang audit: '+pages.length+' HTML pages, '+tagged+' pages with alternates, '+checked+' alternate references, '+errors.length+' defects.');
 if(errors.length)console.log(errors.join('\n'));
 assert.equal(errors.length,0,'Hreflang defects introduced by changed HTML pages: '+errors.length);
});
