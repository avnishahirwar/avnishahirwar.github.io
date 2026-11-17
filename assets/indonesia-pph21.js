(function(root){'use strict';
function amount(value,name){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' harus berupa angka tidak negatif.');return n;}
const tables={
 A:[[5400000,0],[5650000,.25],[5950000,.5],[6300000,.75],[6750000,1],[7500000,1.25],[8550000,1.5],[9650000,1.75],[10050000,2],[10350000,2.25],[10700000,2.5],[11050000,3],[11600000,3.5],[12500000,4],[13750000,5],[15100000,6],[16950000,7],[19750000,8],[24150000,9],[26450000,10],[28000000,11],[30050000,12],[32400000,13],[35400000,14],[39100000,15],[43850000,16],[47800000,17],[51400000,18],[56300000,19],[62200000,20],[68600000,21],[77500000,22],[89000000,23],[103000000,24],[125000000,25],[157000000,26],[206000000,27],[337000000,28],[454000000,29],[550000000,30],[695000000,31],[910000000,32],[1400000000,33],[Infinity,34]],
 B:[[6200000,0],[6500000,.25],[6850000,.5],[7300000,.75],[9200000,1],[10750000,1.5],[11250000,2],[11600000,2.5],[12600000,3],[13600000,4],[14950000,5],[16400000,6],[18450000,7],[21850000,8],[26000000,9],[27700000,10],[29350000,11],[31450000,12],[33950000,13],[37100000,14],[41100000,15],[45800000,16],[49500000,17],[53800000,18],[58500000,19],[64000000,20],[71000000,21],[80000000,22],[93000000,23],[109000000,24],[129000000,25],[163000000,26],[211000000,27],[374000000,28],[459000000,29],[555000000,30],[704000000,31],[957000000,32],[1405000000,33],[Infinity,34]],
 C:[[6600000,0],[6950000,.25],[7350000,.5],[7800000,.75],[8850000,1],[9800000,1.25],[10950000,1.5],[11200000,1.75],[12050000,2],[12950000,3],[14150000,4],[15550000,5],[17050000,6],[19500000,7],[22700000,8],[26600000,9],[28100000,10],[30100000,11],[32600000,12],[35400000,13],[38900000,14],[43000000,15],[47400000,16],[51200000,17],[55800000,18],[60400000,19],[66700000,20],[74500000,21],[83200000,22],[95600000,23],[110000000,24],[134000000,25],[169000000,26],[221000000,27],[390000000,28],[463000000,29],[561000000,30],[709000000,31],[965000000,32],[1419000000,33],[Infinity,34]]
};
function categoryFor(status,dependents){
 const married=status==='married';
 if(!married&&dependents<=1||married&&dependents===0)return 'A';
 if(!married&&dependents>=2||married&&(dependents===1||dependents===2))return 'B';
 if(married&&dependents===3)return 'C';
 throw new RangeError('Pilih status PTKP yang valid: lajang 0–3 tanggungan atau menikah 0–3 tanggungan.');
}
function calculateIndonesiaPPh21TER(monthlyGross,{maritalStatus='single',dependents=0,month='November'}={}){
 const gross=amount(monthlyGross,'Penghasilan bruto bulanan');
 const count=Number(dependents);
 if(!Number.isInteger(count)||count<0||count>3)throw new RangeError('Jumlah tanggungan harus 0 sampai 3.');
 const normalizedMonth=String(month);
 const months=['January','February','March','April','May','June','July','August','September','October','November'];
 if(!months.includes(normalizedMonth))throw new RangeError('Estimasi TER bulanan ini hanya untuk masa pajak Januari–November. Masa pajak terakhir (Desember) memakai penghitungan tahunan Pasal 17.');
 if(!['single','married'].includes(maritalStatus))throw new RangeError('Pilih status perkawinan yang valid.');
 const category=categoryFor(maritalStatus,count);
 const row=tables[category].find(([upper])=>gross<=upper)||tables[category][tables[category].length-1];
 const rate=row[1],tax=Math.round((gross*rate/100+Number.EPSILON)*100)/100;
 return {gross,category,rate,withholding:tax,netAfterPPh21:gross-tax,month:normalizedMonth,year:2026,scope:'Estimasi pemotongan PPh Pasal 21 TER bulanan untuk pegawai tetap, masa pajak selain masa terakhir (Januari–November). Tidak menghitung rekonsiliasi Desember, pajak tahunan, pegawai tidak tetap, bukan pegawai, BPJS atau tunjangan khusus.'};
}
const api={calculateIndonesiaPPh21TER,TER_TABLES:tables};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FCIndonesiaPPh21=Object.freeze(api);
if(typeof document!=='undefined'){
 const form=document.getElementById('id-pph21-form'),gross=document.getElementById('id-gross'),status=document.getElementById('id-status'),deps=document.getElementById('id-dependents'),month=document.getElementById('id-month'),result=document.getElementById('id-result'),error=document.getElementById('id-error');
 if(form){const fmt=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
 form.addEventListener('submit',event=>{event.preventDefault();try{const r=calculateIndonesiaPPh21TER(gross.value,{maritalStatus:status.value,dependents:deps.value,month:month.value});error.textContent='';result.replaceChildren();const heading=document.createElement('strong');heading.textContent='Estimasi pemotongan PPh 21: '+fmt(r.withholding);const dl=document.createElement('dl');const rows=[['Penghasilan bruto bulanan',fmt(r.gross)],['Kategori TER',r.category],['Tarif efektif bulanan',r.rate.toFixed(2)+'%'],['Penghasilan setelah PPh 21 (sebelum potongan lain)',fmt(r.netAfterPPh21)],['Masa pajak',r.month+' 2026']];for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}result.append(heading,dl);if(typeof gtag==='function')gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});}catch(err){result.replaceChildren();error.textContent=err.message;}});form.requestSubmit();}
}
})(typeof window!=='undefined'?window:globalThis);
