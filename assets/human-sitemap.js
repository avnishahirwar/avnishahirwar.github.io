(()=>{'use strict';
const input=document.getElementById('sitemap-search');
const clear=document.getElementById('sitemap-clear');
const status=document.getElementById('sitemap-status');
const groups=[...document.querySelectorAll('[data-sitemap-category]')];
if(!input||!status||!groups.length)return;
const total=Number(document.querySelector('[data-sitemap-total]')?.dataset.sitemapTotal||0);
function filter(){
 const query=input.value.trim().toLocaleLowerCase();
 let visible=0;
 groups.forEach(group=>{
  const items=[...group.querySelectorAll('.sitemap-item')];
  let matches=0;
  items.forEach(item=>{const ok=!query||(item.dataset.search||item.textContent).toLocaleLowerCase().includes(query);item.hidden=!ok;if(ok)matches++;});
  group.hidden=Boolean(query)&&matches===0;
  if(query&&matches)group.open=true;
  if(!query)group.open=false;
  visible+=matches;
 });
 status.textContent=query?visible.toLocaleString()+' matching calculator entries.':total.toLocaleString()+' entries across '+groups.length+' categories.';
}
input.addEventListener('input',filter);
clear?.addEventListener('click',()=>{input.value='';filter();input.focus();});
document.querySelectorAll('.sitemap-category-index a').forEach(link=>link.addEventListener('click',()=>{const target=document.getElementById(decodeURIComponent(link.hash.slice(1)));if(target)target.open=true;}));
filter();
})();