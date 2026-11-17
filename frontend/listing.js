
(() => {
  const $ = (id) => document.getElementById(id);

  let listing = null;
  let images = [];
  let currentImage = 0;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function safeURL(value) {
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function showError(message) {
    $('listingLoading').hidden = true;
    $('listingContent').hidden = true;
    $('listingError').hidden = false;
    $('listingError').textContent = message;
  }

  function formatPrice(item) {
    const price = Number(item.price);
    if (!Number.isFinite(price)) return 'Price on request';

    return `${price.toLocaleString()} ${item.currency || 'RWF'}`;
  }

  function formatLocation(item) {
    return [
      item.locality,
      item.district,
      item.province,
      item.country
    ].filter(Boolean).join(', ');
  }

  function renderSpecs(item) {
    const specs = [
      ['Listing type', item.type],
      ['Transaction', item.transactionType === 'RENT' ? 'For Rent' : 'For Sale'],
      ['Price', formatPrice(item)],
      ['Location', formatLocation(item)],
      ['Listing code', item.code]
    ];

    $('detailSpecs').innerHTML = specs
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([label, value]) => `
        <div class="detail-spec">
          <span>${escapeHTML(label)}</span>
          <strong>${escapeHTML(value)}</strong>
        </div>
      `).join('');
  }

  function renderExtraDetails(details) {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return;

    const entries = Object.entries(details).filter(([, value]) =>
      value !== null && value !== undefined && value !== ''
    );

    if (!entries.length) return;

    $('detailExtra').hidden = false;
    $('detailExtraContent').innerHTML = entries.map(([key, value]) => {
      const displayValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

      return `
        <div class="detail-spec">
          <span>${escapeHTML(key.replace(/([A-Z])/g, ' $1'))}</span>
          <strong>${escapeHTML(displayValue)}</strong>
        </div>
      `;
    }).join('');
  }

  function renderGallery() {
    if (!images.length) {
      $('mainListingImage').hidden = true;
      $('galleryPrev').hidden = true;
      $('galleryNext').hidden = true;
      $('galleryCounter').textContent = 'No photos available';
      return;
    }

    $('mainListingImage').hidden = false;
    $('mainListingImage').src = images[currentImage];
    $('mainListingImage').alt = `${listing.title || 'Listing'} photo ${currentImage + 1}`;

    $('galleryCounter').textContent = `${currentImage + 1} / ${images.length}`;
    $('galleryPrev').hidden = images.length < 2;
    $('galleryNext').hidden = images.length < 2;

    $('detailThumbnails').innerHTML = images.map((url, index) => `
      <button type="button"
        class="detail-thumbnail ${index === currentImage ? 'active' : ''}"
        data-image-index="${index}"
        aria-label="Show photo ${index + 1}">
        <img src="${escapeHTML(url)}" alt="Photo ${index + 1}">
      </button>
    `).join('');
  }

  function changeImage(direction) {
    if (!images.length) return;
    currentImage = (currentImage + direction + images.length) % images.length;
    renderGallery();
  }

  function getListingImages(item) {
    const source = Array.isArray(item.images) ? item.images : [];

    return source.map((image) => {
      if (typeof image === 'string') return safeURL(image);
      if (image && typeof image === 'object') {
        return safeURL(image.url || image.secure_url);
      }
      return '';
    }).filter(Boolean);
  }

  function renderVideo(item) {
    const videos = Array.isArray(item.videos) ? item.videos : [];
    const firstVideo = videos[0];
    const videoURL = typeof firstVideo === 'string'
      ? safeURL(firstVideo)
      : safeURL(firstVideo?.url || firstVideo?.secure_url);

    if (!videoURL) return;

    $('detailVideo').src = videoURL;
    $('detailVideoSection').hidden = false;
  }

  function renderContact(item) {
    const title = item.title || 'TikTak listing';
    const code = item.code ? ` (${item.code})` : '';
    const message = `Hello TikTak, I am interested in ${title}${code}.`;

    $('detailWhatsApp').href =
      `https://wa.me/254142299336?text=${encodeURIComponent(message)}`;

    $('detailMessage').href = window.TikTakAPI.token
      ? 'dashboard.html#messages'
      : 'account.html#login';
  }

  function renderListing(item) {
    listing = item;
    images = getListingImages(item);

    document.title = `${item.title || 'Listing'} | TikTak Real Estate`;

    $('detailTitle').textContent = item.title || 'Untitled listing';
    $('detailType').textContent = [
      item.type || 'PROPERTY',
      item.transactionType === 'RENT' ? 'FOR RENT' : 'FOR SALE'
    ].join(' | ');

    $('detailLocation').textContent = formatLocation(item) || 'Location not specified';
    $('detailPrice').textContent = formatPrice(item);
    $('detailDescription').textContent = item.description || 'No description provided.';

    renderSpecs(item);
    renderExtraDetails(item.details);
    renderGallery();
    renderVideo(item);
    renderContact(item);

    $('listingLoading').hidden = true;
    $('listingError').hidden = true;
    $('listingContent').hidden = false;
  }

  function listingLink() {
    return window.location.href.split('#')[0];
  }

  async function copyListingLink() {
    const url = listingLink();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement('textarea');
        field.value = url;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();

        const copied = document.execCommand('copy');
        field.remove();

        if (!copied) throw new Error('Copy failed');
      }

      $('shareFeedback').textContent = 'Listing link copied successfully.';
    } catch {
      $('shareFeedback').textContent = 'Could not copy the link. Please copy it from the browser address bar.';
    }
  }

  async function shareListing() {
    const url = listingLink();

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title || 'TikTak listing',
          text: `View this listing on TikTak Real Estate: ${listing.title || ''}`,
          url
        });
        $('shareFeedback').textContent = 'Share window opened.';
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    await copyListingLink();
  }

  async function loadListing() {
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
      showError('No listing ID was provided. Please return to the listings page.');
      return;
    }

    try {
      const data = await window.TikTakAPI.request('/listings');
      const rows = Array.isArray(data) ? data : (data.listings || []);

      const item = rows.find((row) => String(row.id) === String(id));

      if (!item) {
        showError('This listing could not be found. It may no longer be available.');
        return;
      }

      renderListing(item);
    } catch (error) {
      showError(error.message || 'Could not load this listing. Please try again.');
    }
  }

  $('galleryPrev').addEventListener('click', () => changeImage(-1));
  $('galleryNext').addEventListener('click', () => changeImage(1));

  $('detailThumbnails').addEventListener('click', (event) => {
    const button = event.target.closest('[data-image-index]');
    if (!button) return;

    currentImage = Number(button.dataset.imageIndex);
    renderGallery();
  });

  $('copyListingButton').addEventListener('click', copyListingLink);
  $('shareListingButton').addEventListener('click', shareListing);

  loadListing();
})();
