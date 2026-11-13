const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const toast=(msg)=>{const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)};
$('#themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('tiktak-theme',document.body.classList.contains('dark')?'dark':'light')});if(localStorage.getItem('tiktak-theme')==='dark')document.body.classList.add('dark');
$('#languageSelect')?.addEventListener('change',e=>{const lang=e.target.value;document.documentElement.lang=lang;$$('[data-rw][data-en]').forEach(el=>{el.textContent=el.dataset[lang]})});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderListings(rows){const grid=$('#listingGrid');if(!grid)return;grid.innerHTML=rows.map(x=>{const type=String(x.type).toLowerCase(),loc=[x.locality,x.district,x.province].filter(Boolean).join(', '),price=Number(x.price).toLocaleString(),label=type==='land'?'LAND':type==='house'?'HOMES':'AUTO';return `<article class="listing-card" data-type="${type}" data-country="${esc(x.country)}" data-location="${esc(loc)}"><div class="listing-image image-${type}" style="${x.images?.[0]?.url ? `background-image:linear-gradient(180deg,transparent,#0008),url('${esc(x.images[0].url)}');background-size:cover;background-position:center` : ''}"><span class="status">FOR SALE</span><span class="image-caption">${label} Â· ${esc(x.country).toUpperCase()}</span></div><div class="listing-body"><div class="listing-meta">${esc(loc).toUpperCase()}, ${esc(x.country).toUpperCase()} <span>ID: ${esc(x.code)}</span></div><h3>${esc(x.title)}</h3><div class="listing-detail">${esc(x.description)}</div><div class="listing-footer"><b>${esc(x.currency)} ${price}</b><span>â†—</span></div><button class="primary offer-button" type="button" data-contact-tiktak="${esc(x.id)}" data-listing-title="${esc(x.title)}">Twandikire kuri iri tangazo</button></div></article>`}).join('');$('#emptyState').hidden=rows.length>0;filterListings()}
function filterListings(){const type=$('#typeFilter')?.value||'all',country=$('#countryFilter')?.value||'all',loc=($('#locationFilter')?.value||'').trim().toLowerCase();let count=0;$$('.listing-card').forEach(card=>{const ok=(type==='all'||card.dataset.type===type)&&(country==='all'||card.dataset.country===country)&&(!loc||card.dataset.location.toLowerCase().includes(loc));card.hidden=!ok;if(ok)count++});if($('#emptyState'))$('#emptyState').hidden=count>0}
$('#searchBtn')?.addEventListener('click',()=>{filterListings();$('#listings').scrollIntoView({behavior:'smooth'})});$$('.category-card').forEach(card=>card.addEventListener('click',()=>{$('#typeFilter').value=card.dataset.category;filterListings();$('#listings').scrollIntoView({behavior:'smooth'})}));
(async()=>{try{const data=await TikTakAPI.request('/listings');renderListings(data.listings||[]);$('#listingStatus').textContent='Amatangazo yemejwe na TikTak';$('.prototype-note')?.remove()}catch(err){$('#listingStatus').textContent='Server ntiraboneka Â· reba amatangazo yâ€™icyitegererezo';console.warn(err.message)}})();
$('#menuToggle')?.addEventListener('click',()=>toast('Menu yihariye ya telefone iri gutegurwa.'));



// TIKTAK DIRECT CONTACT
$('#listingGrid')?.addEventListener('click', event => {
  const button = event.target.closest('[data-contact-tiktak]');
  if (!button) return;

  const title = button.dataset.listingTitle || 'Iri tangazo';
  const modal = $('#contactModal');
  const listingName = $('#contactListingName');
  const whatsapp = $('#contactWhatsApp');

  if (listingName) listingName.textContent = `Ku bijyanye na: ${title}`;

  if (whatsapp) {
    const message = `Muraho TikTak, ndifuza amakuru arambuye no kuganira ku giciro cy'itangazo: ${title}.`;
    whatsapp.href = `https://wa.me/254142299336?text=${encodeURIComponent(message)}`;
  }

  if (modal) {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('contact-modal-open');
    modal.querySelector('.contact-close')?.focus();
  }
});

function closeContactModal() {
  const modal = $('#contactModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('contact-modal-open');
}

$('#contactModal')?.addEventListener('click', event => {
  if (event.target.closest('[data-contact-close]')) closeContactModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#contactModal')?.hidden) {
    closeContactModal();
  }
});

$('#contactMessageButton')?.addEventListener('click', () => {
  const title = $('#contactListingName')?.textContent?.replace(/^Ku bijyanye na: /, '') || '';
  sessionStorage.setItem('tiktak-contact-listing', title);
  if (!TikTakAPI.token) sessionStorage.setItem('tiktak-after-login', 'messages');
  location.href = TikTakAPI.token ? 'dashboard.html#messages' : 'account.html#login';
});

// END TIKTAK DIRECT CONTACT

