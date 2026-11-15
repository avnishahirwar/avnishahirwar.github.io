(()=>{'use strict';
const RECENT_KEY='fc-recent-v1';
const FAVOURITE_KEY='fc-favourites-v1';
const safeRead=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item.url==='string'&&item.url.startsWith('/')&&typeof item.title==='string').slice(0,20):[];}catch(_){return [];}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}};
const render=(target,items,key,empty,allowRemove)=>{
 if(!target)return;
 target.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent=empty;target.append(p);return;}
 items.forEach((item,index)=>{
  const row=document.createElement('div');row.className='fc-home-personal-item';
  const link=document.createElement('a');link.href=item.url;link.textContent=item.title;
  row.append(link);
  if(allowRemove){const remove=document.createElement('button');remove.type='button';remove.className='fc-home-personal-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.title+' from favourites');remove.addEventListener('click',()=>{const next=safeRead(key).filter((_,i)=>i!==index);safeWrite(key,next);render(target,next,key,empty,allowRemove);});row.append(remove);}
  target.append(row);
 });
};
const recent=safeRead(RECENT_KEY).slice(0,5);
const favourites=safeRead(FAVOURITE_KEY).slice(0,20);
render(document.getElementById('fc-home-recent'),recent,RECENT_KEY,'Your recently opened calculators will appear here.',false);
render(document.getElementById('fc-home-favourites'),favourites,FAVOURITE_KEY,'Save a calculator from its page to add it here.',true);
document.getElementById('fc-clear-recent')?.addEventListener('click',()=>{safeWrite(RECENT_KEY,[]);render(document.getElementById('fc-home-recent'),[],RECENT_KEY,'Your recently opened calculators will appear here.',false);});
})();