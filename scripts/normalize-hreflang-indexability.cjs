#!/usr/bin/env node
'use strict';

// Normalize hreflang metadata without changing page copy, canonical URLs,
// robots directives, navigation, or calculator markup. Only invalid alternate
// link tags are removed; missing reciprocal tags are added by the companion
// additive repair script after this pass.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=process.cwd();
const ORIGIN='https://friendlycalculator.in';
const IGNORE=new Set(['.git','.github','node_modules','tests','vendor','_site','admin','avnish-ai','artifacts']);

function walk(dir,files=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')||IGNORE.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,files);
    else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))files.push(full);
  }
  return files;
}
function headOf(html){const end=html.toLowerCase().indexOf('</head>');return end<0?'':html.slice(0,end);}
function noindex(html){
  const h=headOf(html);
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(h)||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(h);
}
function langOf(html,file){
  const match=html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  if(match)return match[1].toLowerCase();
  const first=path.relative(ROOT,file).split(path.sep)[0];
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(first)?first.toLowerCase():'en';
}
function canonicalOf(html){
  const tag=headOf(html).match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href=tag&&tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  if(!href)return null;
  try{const u=new URL(href[1],ORIGIN);return u.origin===ORIGIN&&!u.search&&!u.hash?u.href:null;}catch{return null;}
}
function selfCanonical(file,canonical){
  if(!canonical)return false;
  const rel=path.relative(ROOT,file).split(path.sep).join('/');
  const candidates=new Set([new URL('/'+rel,ORIGIN).href]);
  if(rel==='index.html')candidates.add(ORIGIN+'/');
  else if(rel.endsWith('/index.html'))candidates.add(new URL('/'+rel.slice(0,-'index.html'.length),ORIGIN).href);
  return candidates.has(canonical);
}
function targetFile(href){
  try{
    const u=new URL(href,ORIGIN);
    if(u.origin!==ORIGIN||u.search||u.hash)return null;
    let p=decodeURIComponent(u.pathname);
    if(p==='/')p='/index.html';else if(p.endsWith('/'))p+='index.html';
    const file=path.resolve(ROOT,'.'+p);
    if(!file.startsWith(ROOT+path.sep))return null;
    return fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;
  }catch{return null;}
}
function parseAlternate(tag){
  const rel=tag.match(/\brel=["']([^"']+)["']/i);
  if(!rel||rel[1].toLowerCase()!=='alternate')return null;
  const lang=tag.match(/\bhreflang=["']([^"']+)["']/i);
  const href=tag.match(/\bhref=["']([^"']+)["']/i);
  return lang&&href?{lang:lang[1].toLowerCase(),href:href[1]}:null;
}
function normalizeHref(href){try{return new URL(href,ORIGIN).href;}catch{return null;}}
function main(){
  const files=walk(ROOT);
  const htmlByFile=new Map(files.map(file=>[file,fs.readFileSync(file,'utf8')]));
  const canonicalByFile=new Map();
  const stats={pages:files.length,noindexPages:0,removedFromNoindex:0,removedNoindexTargets:0,removedMissingTargets:0,removedLanguageMismatches:0,removedCanonicalMismatches:0,removedDuplicateTags:0,removedConflicts:0,changedPages:0};
  for(const [file,html] of htmlByFile){
    canonicalByFile.set(file,canonicalOf(html));
    if(noindex(html))stats.noindexPages++;
  }
  const keepByFile=new Map();
  const outgoing=[];
  for(const [file,html] of htmlByFile){
    const head=headOf(html);
    const tags=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
    const alternateTags=tags.filter(tag=>parseAlternate(tag));
    if(!alternateTags.length)continue;
    const sourceCanonical=canonicalByFile.get(file);
    if(noindex(html)||!selfCanonical(file,sourceCanonical)){
      keepByFile.set(file,new Set());
      stats.removedFromNoindex+=alternateTags.length;
      continue;
    }
    const valid=[];
    for(const tag of alternateTags){
      const item=parseAlternate(tag);
      const target=targetFile(item.href);
      if(!target){stats.removedMissingTargets++;continue;}
      if(item.lang==='x-default'){
        const targetHtml=htmlByFile.get(target);
        if(!targetHtml||noindex(targetHtml)||canonicalByFile.get(target)!==normalizeHref(item.href)){stats.removedCanonicalMismatches++;continue;}
        valid.push({tag,...item,target});
        continue;
      }
      const targetHtml=htmlByFile.get(target);
      if(!targetHtml||noindex(targetHtml)){stats.removedNoindexTargets++;continue;}
      if(langOf(targetHtml,target)!==item.lang){stats.removedLanguageMismatches++;continue;}
      if(canonicalByFile.get(target)!==normalizeHref(item.href)){stats.removedCanonicalMismatches++;continue;}
      valid.push({tag,...item,target});
      outgoing.push({source:file,sourceLang:langOf(html,file),sourceCanonical,target});
    }
    const groups=new Map();
    for(const item of valid){if(!groups.has(item.lang))groups.set(item.lang,[]);groups.get(item.lang).push(item);}
    const keep=new Set();
    for(const [lang,items] of groups){
      const urls=new Set(items.map(x=>normalizeHref(x.href)));
      if(urls.size>1){stats.removedConflicts+=items.length;continue;}
      keep.add(items[0].tag);
      stats.removedDuplicateTags+=items.length-1;
    }
    keepByFile.set(file,keep);
  }
  // A valid source edge must have an unambiguous reciprocal slot on its target.
  // Remove a conflicting reciprocal value so the companion script can add the
  // correct one; preserve unrelated locale entries.
  for(const edge of outgoing){
    const targetHtml=htmlByFile.get(edge.target);
    if(!targetHtml||noindex(targetHtml))continue;
    const targetKeep=keepByFile.get(edge.target)||new Set(
      [...headOf(targetHtml).matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(tag=>parseAlternate(tag))
    );
    const matching= [...targetKeep].filter(tag=>parseAlternate(tag)?.lang===edge.sourceLang);
    if(matching.some(tag=>normalizeHref(parseAlternate(tag).href)!==edge.sourceCanonical)){
      for(const tag of matching){targetKeep.delete(tag);stats.removedConflicts++;}
      keepByFile.set(edge.target,targetKeep);
    }
  }
  let changed=0;
  for(const [file,keep] of keepByFile){
    const original=htmlByFile.get(file);
    const head=headOf(original);
    const nextHead=head.replace(/<link\b[^>]*>/gi,tag=>{
      if(!parseAlternate(tag))return tag;
      return keep.has(tag)?tag:'';
    });
    if(nextHead===head)continue;
    const next=original.slice(0,head.length).replace(head,nextHead)+original.slice(head.length);
    if(process.argv.includes('--write'))fs.writeFileSync(file,next);
    htmlByFile.set(file,next);
    changed++;
  }
  stats.changedPages=changed;
  console.log('Hreflang indexability normalization: '+JSON.stringify(stats));
  if(!process.argv.includes('--write'))console.log('Dry run only. No files were changed.');
}
main();
