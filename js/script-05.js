/* Extracted from original index.html; execution order: 5 of 5 */
(()=>{
 const $=id=>document.getElementById(id),end=$('trendEnd'),wig=$('trendWig'),unit=$('trendUnit');
 months.forEach((m,i)=>end.add(new Option(`S/D ${m.toUpperCase()} 2026`,String(i))));
 end.value='8';
 const unitPalette=['#e2a63d','#73b99e','#d9876d','#7b8fe8','#4d9dc9','#87b75a','#8b6fc7','#b75a93'];
 const safe=x=>escapeHtml(String(x));
 let exported=[];
 function titleCaseStatus(s){return s==='g'?'Hijau':s==='y'?'Kuning':s==='r'?'Merah':'Belum ada'}
 function getDb(){
   let db;try{db=JSON.parse(localStorage.getItem('ulp_monitoring_pekanbaru_v1')||'{}')}catch{db={}};
   const entries=db.entries&&typeof db.entries==='object'?db.entries:{};
   const names=[...new Set([...(Array.isArray(db.ulps)?db.ulps:[]),...Object.keys(entries).map(k=>{try{return JSON.parse(k)[0]}catch{return null}}).filter(Boolean)])].filter(Boolean).filter(n=>n!=='ULP 1');
   return {names,entries};
 }
 function buildUnits(selection){
   const db=getDb();
   const options=['<option value="all">Semua unit</option><option value="up3">UP3 saja</option>'].concat(db.names.map(n=>`<option value="${safe(n)}">UP3 + ${safe(n)}</option>`));
   const current=selection || unit.value || 'all';
   unit.innerHTML=options.join('');
   unit.value=[...unit.options].some(o=>o.value===current)?current:'all';
   const units=[{name:'UP3 Pekanbaru',type:'up3'}];
   db.names.forEach(n=>units.push({name:n,type:'ulp'}));
   return {units,entries:db.entries};
 }
 function getSeries(metric,entries,unitName){
   if(unitName==='UP3 Pekanbaru') return metric.pencapaian.slice();
   return months.map((_,j)=>{
      const rec=entries[JSON.stringify([unitName,`2026-${String(j+1).padStart(2,'0')}`])]?.[metric.id];
      return Number.isFinite(rec?.pencapaian)?rec.pencapaian:null;
   });
 }
 function headerRow(units){
   let html='<tr><th>Indikator Kinerja</th>';
   units.forEach((u,i)=>{html+=`<th style="background:${unitPalette[i%unitPalette.length]}">${safe(u.name)}</th>`});
   html+='</tr>';
   return html;
 }
 function metricList(){return metrics.filter(m=>wig.value==='all'||m.wig===wig.value)}
 function render(){
   const selectedBefore=unit.value;
   const {units:allUnits,entries}=buildUnits(selectedBefore);
   const shownUnits=unit.value==='up3'?allUnits.slice(0,1):unit.value==='all'?allUnits:allUnits.filter((u,idx)=>idx===0||u.name===unit.value);
   const k=Number(end.value), prev=Math.max(0,k-1), list=metricList();
   $('trendPerfTitle').textContent=`Matriks Kinerja · Pencapaian S/D ${months[k]} 2026`;
   $('trendPerfSub').textContent=`Nilai yang ditampilkan adalah persentase pencapaian setiap KPI untuk periode S/D ${months[k]} 2026.`;
   $('trendDeltaTitle').textContent=k===0?`Matriks Tren · Januari 2026`:`Matriks Tren · S/D ${months[prev]} → S/D ${months[k]} 2026`;
   $('trendDeltaSub').textContent=k===0?'Periode Januari adalah bulan awal sehingga perubahan tren belum tersedia.':`Perubahan yang ditampilkan adalah selisih pencapaian KPI dari S/D ${months[prev]} ke S/D ${months[k]} 2026, dalam poin persentase (pp).`;
   $('trendPerfHead').innerHTML=headerRow(shownUnits);
   $('trendDeltaHead').innerHTML=headerRow(shownUnits);
   const perfCounts=shownUnits.map(()=>({r:0,y:0,g:0,empty:0}));
   const deltaCounts=shownUnits.map(()=>({up:0,down:0,flat:0,empty:0}));
   $('trendPerfBody').innerHTML=list.map((m,rowIdx)=>{
      let row=`<tr><td><span class="row-index">${String(m.id).padStart(2,'0')}</span><span class="metric-name">${safe(m.name)}</span><span class="metric-meta">WIG ${safe(m.wig)} · ${safe(m.unit)}</span></td>`;
      shownUnits.forEach((u,ui)=>{
        const vals=getSeries(m,entries,u.name), val=vals[k], st=status(val);
        if(st) perfCounts[ui][st]++; else perfCounts[ui].empty++;
        row+=`<td class="${st==='g'?'perf-good':st==='y'?'perf-warn':st==='r'?'perf-bad':'perf-empty'}"><div class="cellbox"><div class="main">${Number.isFinite(val)?fmt(val)+'%':'—'}</div><div class="sub ${st?'' :'muted'}">${titleCaseStatus(st)}</div></div></td>`;
      });
      row+='</tr>'; return row;
   }).join('');
   $('trendPerfFoot').innerHTML=`<tr class="sum-red"><td>Jumlah Merah</td>${perfCounts.map(c=>`<td>${c.r}</td>`).join('')}</tr><tr class="sum-yellow"><td>Jumlah Kuning</td>${perfCounts.map(c=>`<td>${c.y}</td>`).join('')}</tr><tr class="sum-green"><td>Jumlah Hijau</td>${perfCounts.map(c=>`<td>${c.g}</td>`).join('')}</tr>`;
   $('trendDeltaBody').innerHTML=list.map(m=>{
      let row=`<tr><td><span class="row-index">${String(m.id).padStart(2,'0')}</span><span class="metric-name">${safe(m.name)}</span><span class="metric-meta">${k===0?'Belum ada pembanding':`Perbandingan ${months[prev]} ke ${months[k]}`}</span></td>`;
      shownUnits.forEach((u,ui)=>{
        const vals=getSeries(m,entries,u.name), val=vals[k], old=k>0?vals[k-1]:null;
        const hasDelta=k>0 && Number.isFinite(val) && Number.isFinite(old);
        const delta=hasDelta?val-old:null;
        const cls=!hasDelta?'delta-flat':delta>0?'delta-up':delta<0?'delta-down':'delta-flat';
        if(hasDelta){ if(delta>0) deltaCounts[ui].up++; else if(delta<0) deltaCounts[ui].down++; else deltaCounts[ui].flat++; } else deltaCounts[ui].empty++;
        const symbol=!hasDelta?'■':delta>0?'▲':delta<0?'▼':'■';
        const label=!hasDelta?'Belum tersedia':delta>0?'Membaik':delta<0?'Memburuk':'Tetap';
        const sub=!hasDelta?'—':`${fmt(old)}% → ${fmt(val)}%`;
        row+=`<td class="${cls}"><div class="cellbox"><div class="main">${!hasDelta?'—':`${symbol} ${(delta>0?'+':'')+fmt(delta)} pp`}</div><div class="sub ${hasDelta?'':'muted'}">${hasDelta?sub:label}</div></div></td>`;
      });
      row+='</tr>'; return row;
   }).join('');
   $('trendDeltaFoot').innerHTML=`<tr class="sum-up"><td>Jumlah Membaik</td>${deltaCounts.map(c=>`<td>${c.up}</td>`).join('')}</tr><tr class="sum-down"><td>Jumlah Memburuk</td>${deltaCounts.map(c=>`<td>${c.down}</td>`).join('')}</tr><tr class="sum-flat"><td>Jumlah Tetap / Belum Ada</td>${deltaCounts.map(c=>`<td>${c.flat + c.empty}</td>`).join('')}</tr>`;
   const filledCount=shownUnits.reduce((acc,u)=>acc+metricList().filter(m=>Number.isFinite(getSeries(m,entries,u.name)[k])).length,0);
   const below95=shownUnits.reduce((acc,u)=>acc+metricList().filter(m=>{const v=getSeries(m,entries,u.name)[k];return Number.isFinite(v)&&v<95}).length,0);
   $('trendKpis').innerHTML=[['Unit ditampilkan',shownUnits.length],['Indikator ditampilkan',list.length],['Sel berisi data',filledCount],['Sel merah (<95%)',below95]].map(([a,b])=>`<div class="trend-kpi"><span>${a}</span><strong>${b}</strong></div>`).join('');
   exported=[];
   exported.push(['Matriks Kinerja',`Periode S/D ${months[k]} 2026`]);
   exported.push(['Indikator',...shownUnits.map(u=>u.name)]);
   list.forEach(m=>{
      exported.push([`${String(m.id).padStart(2,'0')} ${m.name}`,...shownUnits.map(u=>{const v=getSeries(m,entries,u.name)[k];return Number.isFinite(v)?fmt(v)+'%':'—'})]);
   });
   exported.push([]);
   exported.push(['Matriks Tren',k===0?'Januari 2026':`S/D ${months[prev]} -> S/D ${months[k]} 2026`]);
   exported.push(['Indikator',...shownUnits.map(u=>u.name)]);
   list.forEach(m=>{
      exported.push([`${String(m.id).padStart(2,'0')} ${m.name}`,...shownUnits.map(u=>{const vals=getSeries(m,entries,u.name), val=vals[k], old=k>0?vals[k-1]:null; if(!(k>0&&Number.isFinite(val)&&Number.isFinite(old))) return '—'; const delta=val-old; return `${delta>0?'+':''}${fmt(delta)} pp (${fmt(old)}% -> ${fmt(val)}%)`;})]);
   });
 }
 [end,wig,unit].forEach(el=>el.addEventListener('change',render));
 $('trendRefresh').onclick=render;
 $('trendCsv').onclick=()=>{const lines=exported.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const blob=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='matriks_tren_UP3_ULP_2026.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 window.addEventListener('trend-activate',render);
 window.addEventListener('storage',render);
 render();
})();
