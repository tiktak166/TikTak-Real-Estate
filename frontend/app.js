
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const toast = msg => {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
};

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

$('#themeToggle')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem(
    'tiktak-theme',
    document.body.classList.contains('dark') ? 'dark' : 'light'
  );
});

if (localStorage.getItem('tiktak-theme') === 'dark') {
  document.body.classList.add('dark');
}

$('#languageSelect')?.addEventListener('change', e => {
  const lang = e.target.value;
  document.documentElement.lang = lang;

  $$('[data-rw][data-en]').forEach(el => {
    el.textContent = el.dataset[lang];
  });
});

function listingUrl(id) {
  return `listing.html?id=${encodeURIComponent(id)}`;
}

function renderListings(rows) {
  const grid = $('#listingGrid');
  if (!grid) return;

  grid.innerHTML = rows.map(x => {
    const type = String(x.type || '').toLowerCase();
    const loc = [x.locality, x.district, x.province]
      .filter(Boolean)
      .join(', ');

    const price = Number(x.price).toLocaleString();
    const label = type === 'land'
      ? 'LAND'
      : type === 'house'
        ? 'HOMES'
        : 'AUTO';

    const images = Array.isArray(x.images)
      ? x.images.filter(img => img && img.url)
      : [];

    const firstImage = images[0]?.url || '';
    const transaction = String(x.transactionType || 'SALE').toUpperCase();
    const transactionLabel = transaction === 'RENT'
      ? 'FOR RENT'
      : 'FOR SALE';

    const imageMarkup = firstImage
      ? `<img class="listing-slide-image"
          src="${esc(firstImage)}"
          alt="${esc(x.title)}"
          loading="lazy">`
      : '';

    return `
      <article class="listing-card"
        data-type="${esc(type)}"
        data-country="${esc(x.country)}"
        data-location="${esc(loc)}"
        data-slide-index="0"
        data-slide-count="${images.length}">

        <div class="listing-image image-${esc(type)}">

          <a class="listing-image-link"
            href="${listingUrl(x.id)}"
            aria-label="Reba amakuru yose ya ${esc(x.title)}">

            ${imageMarkup}

            <span class="status">${transactionLabel}</span>
            <span class="image-caption">
              ${label} · ${esc(x.country).toUpperCase()}
            </span>
          </a>

          ${images.length > 1 ? `
            <button class="listing-slide-control slide-prev"
              type="button"
              data-slide-prev
              aria-label="Ifoto ibanza">‹</button>

            <button class="listing-slide-control slide-next"
              type="button"
              data-slide-next
              aria-label="Ifoto ikurikira">›</button>

            <span class="listing-slide-counter">
              1 / ${images.length}
            </span>
          ` : ''}
        </div>

        <div class="listing-body">

          <div class="listing-meta">
            ${esc(loc).toUpperCase()}, ${esc(x.country).toUpperCase()}
            <span>ID: ${esc(x.code)}</span>
          </div>

          <h3>
            <a class="listing-title-link"
              href="${listingUrl(x.id)}">
              ${esc(x.title)}
            </a>
          </h3>

          <div class="listing-detail">
            ${esc(x.description)}
          </div>

          <div class="listing-footer">
            <b>${esc(x.currency)} ${price}</b>
            <span>↗</span>
          </div>

          <a class="btn btn-yellow listing-details-button"
            href="${listingUrl(x.id)}">
            Reba amakuru yose
          </a>

        </div>
      </article>
    `;
  }).join('');

  if ($('#emptyState')) {
    $('#emptyState').hidden = rows.length > 0;
  }

  filterListings();
}

function changeListingSlide(card, direction) {
  const count = Number(card.dataset.slideCount || 0);
  if (count < 2) return;

  const images = card._listingImages;
  if (!images || !images.length) return;

  let index = Number(card.dataset.slideIndex || 0);
  index = (index + direction + count) % count;

  card.dataset.slideIndex = String(index);

  const image = card.querySelector('.listing-slide-image');
  const counter = card.querySelector('.listing-slide-counter');

  if (image) {
    image.src = images[index].url;
    image.alt = `${card.dataset.listingTitle || 'TikTak listing'} - ${index + 1}`;
  }

  if (counter) {
    counter.textContent = `${index + 1} / ${count}`;
  }
}

function filterListings() {
  const type = $('#typeFilter')?.value || 'all';
  const country = $('#countryFilter')?.value || 'all';
  const loc = ($('#locationFilter')?.value || '').trim().toLowerCase();

  let count = 0;

  $$('.listing-card').forEach(card => {
    const ok =
      (type === 'all' || card.dataset.type === type) &&
      (country === 'all' || card.dataset.country === country) &&
      (!loc || card.dataset.location.toLowerCase().includes(loc));

    card.hidden = !ok;
    if (ok) count++;
  });

  if ($('#emptyState')) {
    $('#emptyState').hidden = count > 0;
  }
}

$('#searchBtn')?.addEventListener('click', () => {
  filterListings();
  $('#listings').scrollIntoView({ behavior: 'smooth' });
});

$('#typeFilter')?.addEventListener('change', filterListings);
$('#countryFilter')?.addEventListener('change', filterListings);
$('#locationFilter')?.addEventListener('input', filterListings);

$$('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    const filter = $('#typeFilter');
    if (filter) filter.value = card.dataset.category;

    filterListings();
    $('#listings')?.scrollIntoView({ behavior: 'smooth' });
  });
});

// LOAD ONLY REAL LISTINGS FROM THE SERVER
(async () => {
  try {
    const data = await TikTakAPI.request('/listings');
    const rows = data.listings || [];

    renderListings(rows);

    // Save each listing's photos for its homepage slider.
    $$('.listing-card').forEach((card, index) => {
      card._listingImages = Array.isArray(rows[index]?.images)
        ? rows[index].images.filter(img => img && img.url)
        : [];

      card.dataset.listingTitle = rows[index]?.title || '';
    });

    $('#listingStatus').textContent =
      'Amatangazo yemejwe na TikTak';

  } catch (err) {
    const grid = $('#listingGrid');
    if (grid) grid.innerHTML = '';

    const emptyState = $('#emptyState');
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent =
        'Nta matangazo yemejwe araboneka ubu.';
    }

    const status = $('#listingStatus');
    if (status) {
      status.textContent =
        'Nta matangazo yemejwe araboneka';
    }

    console.warn(
      'TikTak listings could not be loaded:',
      err.message
    );
  }
})();

// HOMEPAGE PHOTO SLIDER
$('#listingGrid')?.addEventListener('click', event => {
  const previous = event.target.closest('[data-slide-prev]');
  const next = event.target.closest('[data-slide-next]');

  if (previous) {
    event.preventDefault();
    event.stopPropagation();
    changeListingSlide(previous.closest('.listing-card'), -1);
  }

  if (next) {
    event.preventDefault();
    event.stopPropagation();
    changeListingSlide(next.closest('.listing-card'), 1);
  }
});

// Automatically change photos every 3 seconds.
// Pause when the visitor hovers over or focuses a listing.
const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!reducedMotion) {
  setInterval(() => {
    if (document.hidden) return;

    $$('.listing-card').forEach(card => {
      if (card.hidden) return;
      if (card.matches(':hover, :focus-within')) return;

      changeListingSlide(card, 1);
    });
  }, 3000);
}

$('#menuToggle')?.addEventListener('click', () => {
  toast('Menu yihariye ya telefone iri gutegurwa.');
});

// TIKTAK CONTACT MODAL
function openContactModal(title) {
  const modal = $('#contactModal');
  const listingName = $('#contactListingName');
  const whatsapp = $('#contactWhatsApp');

  if (listingName) {
    listingName.textContent = `Ku bijyanye na: ${title}`;
  }

  if (whatsapp) {
    const message =
      `Muraho TikTak, ndifuza amakuru arambuye no kuganira ku giciro cy'itangazo: ${title}.`;

    whatsapp.href =
      `https://wa.me/254142299336?text=${encodeURIComponent(message)}`;
  }

  if (modal) {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('contact-modal-open');
    modal.querySelector('.contact-close')?.focus();
  }
}

function closeContactModal() {
  const modal = $('#contactModal');
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('contact-modal-open');
}

$('#contactModal')?.addEventListener('click', event => {
  if (event.target.closest('[data-contact-close]')) {
    closeContactModal();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#contactModal')?.hidden) {
    closeContactModal();
  }
});

$('#contactMessageButton')?.addEventListener('click', () => {
  const title =
    $('#contactListingName')?.textContent
      ?.replace(/^Ku bijyanye na: /, '') || '';

  sessionStorage.setItem('tiktak-contact-listing', title);

  if (!TikTakAPI.token) {
    sessionStorage.setItem('tiktak-after-login', 'messages');
  }

  location.href = TikTakAPI.token
    ? 'dashboard.html#messages'
    : 'account.html#login';
});

// END TIKTAK CONTACT
