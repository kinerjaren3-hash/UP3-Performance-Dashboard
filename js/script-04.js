/* Extracted from original index.html; execution order: 4 of 5 */
(function(){
 const tabs=[...document.querySelectorAll('.unit-tab')];
 function choose(page,updateHash){
  if(!['up3','ulp','tren'].includes(page))page='up3';
  document.querySelectorAll('.unit-page').forEach(el=>{el.hidden=(el.id!=='page-'+page)});
  tabs.forEach(t=>{let yes=t.dataset.page===page;t.classList.toggle('active',yes);t.setAttribute('aria-selected',String(yes))});
  if(updateHash)history.replaceState(null,'','#'+page); if(page==='tren')window.dispatchEvent(new Event('trend-activate'));
 }
 tabs.forEach(t=>t.addEventListener('click',()=>choose(t.dataset.page,true)));
 window.addEventListener('hashchange',()=>choose(location.hash.slice(1),false));
 choose(location.hash.slice(1),false);
})();
