#!/usr/bin/env node
'use strict';
/**
 * Merge pending additions into the published calculator search index.
 * Existing pages remain on disk; only invalid, duplicate, redirected, noindex
 * or non-self-canonical URLs are omitted from the searchable catalogue.
 * Usage: node scripts/merge-search-index.cjs [--check]
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const INDEX=path.join(ROOT,'assets','calculator-search-index.json');
const ADDITIONS=path.join(ROOT,'assets','calculator-search-index-additions.json');
const CHECK=process.argv.includes('--check');
const ORIGIN='https://friendlycalculator.in';

const index=JSON.parse(fs.readFileSync(INDEX,'utf8'));
const additions=JSON.parse(fs.readFileSync(ADDITIONS,'utf8'));
if(!Array.isArray(index)||!Array.isArray(additions))throw new Error('Expected both files to be JSON arrays');

function noindex(html){
 return /<meta\b[^>]*(?:name\s*=\s*["'](?:robots|googlebot)["'][^>]*content\s*=\s*["'][^"']*\bnoindex\b|content\s*=\s*["'][^"']*\bnoindex\b[^>]*name\s*=\s*["'](?:robots|googlebot)["'])/i.test(html);
}
function refreshRedirect(html){
 return /<meta\b(?=[^>]*http-equiv\s*=\s*["']refresh["'])[^>]*>/i.test(html);
}
function routeFile(url){
 if(typeof url!=='string'||!url.startsWith('/')||!url.endsWith('.html')||url.includes('?')||url.includes('#')||url.split('/').includes('..'))return null;
 try{
  const parsed=new URL(url,ORIGIN);
  if(parsed.origin!==ORIGIN||parsed.search||parsed.hash)return null;
  const decoded=decodeURIComponent(parsed.pathname);
  const file=path.resolve(ROOT,decoded.slice(1));
  if(!file.startsWith(ROOT+path.sep))return null;
  return file;
 }catch(_){return null;}
}
function canonicalMatches(html,url){
 const tags=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
 const tag=tags.find(item=>/\brel\s*=\s*["']canonical["']/i.test(item));
 if(!tag)return true; // Existing pages without canonical tags are left for a separate SEO repair.
 const href=(tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)||[])[1];
 if(!href)return false;
 try{
  const canonical=new URL(href,ORIGIN);
  const requested=new URL(url,ORIGIN);
  return canonical.origin===ORIGIN&&!canonical.search&&!canonical.hash&&canonical.pathname===requested.pathname;
 }catch(_){return false;}
}
function inspectIndexEntry(entry){
 if(!entry||typeof entry.url!=='string')return {keep:false,reason:'invalid'};
 const file=routeFile(entry.url);
 if(!file)return {keep:false,reason:'invalid'};
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return {keep:false,reason:'missing'};
 const html=fs.readFileSync(file,'utf8');
 if(noindex(html))return {keep:false,reason:'noindex'};
 if(refreshRedirect(html))return {keep:false,reason:'refresh redirect'};
 if(!canonicalMatches(html,entry.url))return {keep:false,reason:'canonical mismatch'};
 return {keep:true};
}

const nextIndex=[];
const existing=new Set();
const prunedReasons={invalid:0,missing:0,noindex:0,'refresh redirect':0,'canonical mismatch':0,duplicate:0};
for(const entry of index){
 const inspection=inspectIndexEntry(entry);
 if(!inspection.keep){prunedReasons[inspection.reason]=(prunedReasons[inspection.reason]||0)+1;continue;}
 if(existing.has(entry.url)){prunedReasons.duplicate++;continue;}
 existing.add(entry.url);
 nextIndex.push(entry);
}
const suppressedNoindex=[];
const missingPages=[];
let added=0,duplicateEntries=0;
for(const entry of additions){
 if(!entry||typeof entry.name!=='string'||!entry.name.trim()||
    typeof entry.url!=='string'||!entry.url.startsWith('/calculators/')||
    !entry.url.endsWith('.html')||entry.url.includes('?')||
    entry.url.includes('#')||entry.url.split('/').includes('..')){
  throw new Error('Addition must have a valid calculator name and local /calculators/*.html URL');
 }
 if(existing.has(entry.url)){duplicateEntries++;continue;}
 const file=routeFile(entry.url);
 if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile()){missingPages.push(entry.url);continue;}
 const html=fs.readFileSync(file,'utf8');
 if(noindex(html)||refreshRedirect(html)||!canonicalMatches(html,entry.url)){
  suppressedNoindex.push(entry.url);
  continue;
 }
 nextIndex.push({
  name:entry.name.trim(),url:entry.url,category:entry.category||'Everyday Life',
  keywords:entry.keywords||entry.name.toLowerCase(),description:entry.description||''
 });
 existing.add(entry.url);
 added++;
}
const pruned=Object.values(prunedReasons).reduce((sum,count)=>sum+count,0);
console.log('calculator-search-index: '+index.length+' -> '+nextIndex.length+
 ' entries (added '+added+', pruned '+pruned+', duplicate additions '+duplicateEntries+
 ', suppressed noindex/redirect/canonical additions '+suppressedNoindex.length+
 ', missing addition pages '+missingPages.length+')');
if(prunedReasons.noindex||prunedReasons['refresh redirect']||prunedReasons['canonical mismatch']){
 console.log('Pruned reasons: '+JSON.stringify(prunedReasons));
}
if(missingPages.length)console.warn('Skipped additions without a published HTML page: '+missingPages.join(', '));
if(suppressedNoindex.length)console.log('Suppressed '+suppressedNoindex.length+' addition(s) that are not indexable.');
if(CHECK){
 if(pruned>0||added>0){
  console.log('Search index needs reconciliation: the build step will prune noindex, redirect and noncanonical routes before count/sitemap validation.');
 }else{
  console.log('Search index is synchronized with unique, existing, indexable canonical routes.');
 }
 process.exit(0);
}
if(pruned>0||added>0){
 fs.writeFileSync(INDEX,JSON.stringify(nextIndex,null,2)+'\n');
}
