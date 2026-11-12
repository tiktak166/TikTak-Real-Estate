const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const toast = message => {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2500);
};

$('#themeToggle')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('tiktak-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('tiktak-theme') === 'dark') document.body.classList.add('dark');
$('#languageSelect')?.addEventListener('change', event => {
  const language = event.target.value;
  document.documentElement.lang = language;
  $$('[data-rw][data-en]').forEach(element => { element.textContent = element.dataset[language]; });
});

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
function readFavorites() {
  try {
    const values = JSON.parse(localStorage.getItem('tiktak-favorites') || '[]');
    return Array.isArray(values) ? values.map(String) : [];
  } catch { return []; }
}
function writeFavorites(values) {
  localStorage.setItem('tiktak-favorites', JSON.stringify([...new Set(values.map(String))]));
}
function renderListings(listings) {
  const grid = $('#listingGrid');
  if (!grid) return;
  const favorites = readFavorites();
  grid.innerHTML = listings.map(item => {
    const type = String(item.type || '').toLowerCase();
    const location = [item.locality, item.district, item.province].filter(Boolean).join(', ');
    const image = item.images?.[0]?.url;
    const videoUrl = item.details?.video?.url;
    const label = type === 'land' ? 'LAND' : type === 'house' ? 'HOMES' : 'AUTO';
    const isSaved = favorites.includes(String(item.id));
    return `<article class="listing-card" data-type="${escapeHtml(type)}" data-country="${escapeHtml(item.country)}" data-location="${escapeHtml(location)}">
      <div class="listing-image image-${escapeHtml(type)}">${image ? `<img class="listing-photo" src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <span class="status">FOR SALE</span><button class="favorite ${isSaved ? 'active' : ''}" type="button" data-favorite-id="${escapeHtml(item.id)}" aria-label="${isSaved ? 'Kuramo mu byo wabitse' : 'Bika iri tangazo'}" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button>
        <span class="image-caption">${label} · ${escapeHtml(item.country).toUpperCase()}</span></div>
      <div class="listing-body"><div class="listing-meta">${escapeHtml(location).toUpperCase()}, ${escapeHtml(item.country).toUpperCase()} <span>ID: ${escapeHtml(item.code)}</span></div>
        <h3>${escapeHtml(item.title)}</h3><div class="listing-detail">${escapeHtml(item.description)}</div>
        ${videoUrl ? `<div class="listing-video"><video controls preload="metadata" playsinline aria-label="Video ya ${escapeHtml(item.title)}"><source src="${escapeHtml(videoUrl)}"></video><small>Video y'itangazo</small></div>` : ''}
        <div class="listing-footer"><b>${escapeHtml(item.currency)} ${Number(item.price).toLocaleString()}</b><span>↗</span></div>
        <button class="primary offer-button" type="button" data-contact-tiktak="${escapeHtml(item.id)}" data-listing-title="${escapeHtml(item.title)}">Twandikire kuri iri tangazo</button></div></article>`;
  }).join('');
  filterListings();
}
function filterListings() {
  const type = $('#typeFilter')?.value || 'all';
  const country = $('#countryFilter')?.value || 'all';
  const location = ($('#locationFilter')?.value || '').trim().toLowerCase();
  let visible = 0;
  $$('.listing-card').forEach(card => {
    const matches = (type === 'all' || card.dataset.type === type) &&
      (country === 'all' || card.dataset.country === country) &&
      (!location || card.dataset.location.toLowerCase().includes(location));
    card.hidden = !matches;
    if (matches) visible++;
  });
  if ($('#emptyState')) $('#emptyState').hidden = visible > 0;
}
$('#searchBtn')?.addEventListener('click', () => {
  filterListings();
  $('#listings').scrollIntoView({ behavior: 'smooth' });
});
$$('.category-card').forEach(card => card.addEventListener('click', () => {
  $('#typeFilter').value = card.dataset.category;
  filterListings();
  $('#listings').scrollIntoView({ behavior: 'smooth' });
}));
$('#typeFilter')?.addEventListener('change', filterListings);
$('#countryFilter')?.addEventListener('change', filterListings);
$('#locationFilter')?.addEventListener('input', filterListings);
$('#listingGrid')?.addEventListener('click', event => {
  const favoriteButton = event.target.closest('[data-favorite-id]');
  if (favoriteButton) {
    const id = String(favoriteButton.dataset.favoriteId);
    const favorites = readFavorites();
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
    writeFavorites(next);
    const saved = next.includes(id);
    favoriteButton.classList.toggle('active', saved);
    favoriteButton.textContent = saved ? '♥' : '♡';
    favoriteButton.setAttribute('aria-pressed', String(saved));
    favoriteButton.setAttribute('aria-label', saved ? 'Kuramo mu byo wabitse' : 'Bika iri tangazo');
    toast(saved ? 'Itangazo ryabitswe.' : 'Itangazo rikuwemo mu byo wabitse.');
    return;
  }
  const contactButton = event.target.closest('[data-contact-tiktak]');
  if (contactButton) {
    const title = contactButton.dataset.listingTitle || 'iri tangazo';
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
  if (event.key === 'Escape' && !$('#contactModal')?.hidden) closeContactModal();
});
$('#contactMessageButton')?.addEventListener('click', () => {
  const title = $('#contactListingName')?.textContent?.replace(/^Ku bijyanye na: /, '') || '';
  sessionStorage.setItem('tiktak-contact-listing', title);
  if (!TikTakAPI.token) sessionStorage.setItem('tiktak-after-login', 'messages');
  location.href = TikTakAPI.token ? 'dashboard.html#messages' : 'account.html#login';
});

(async () => {
  const grid = $('#listingGrid');
  try {
    const data = await TikTakAPI.request('/listings');
    renderListings(data.listings || []);
    $('#listingStatus').textContent = 'Amatangazo yemejwe na TikTak';
  } catch (error) {
    if (grid) grid.innerHTML = '';
    if ($('#emptyState')) {
      $('#emptyState').hidden = false;
      $('#emptyState').textContent = 'Ntibishobotse kubona amatangazo ubu. Ongera ugerageze nyuma.';
    }
    $('#listingStatus').textContent = 'Urubuga ntirwashoboye kuvugana na server.';
    console.warn(error.message);
  }
})();
$('#menuToggle')?.addEventListener('click', () => toast('Menu yihariye ya telefone iri gutegurwa.'));

