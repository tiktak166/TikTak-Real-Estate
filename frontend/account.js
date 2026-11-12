const tabs = [...document.querySelectorAll('.tab')];
const panes = [...document.querySelectorAll('.pane')];

tabs.forEach(button => button.addEventListener('click', () => {
  tabs.forEach(item => item.classList.toggle('active', item === button));
  panes.forEach(pane => pane.classList.toggle('active', pane.id === button.dataset.id));
}));

function msg(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(window.tikTakToastTimer);
  window.tikTakToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 5000);
}

const formData = form => Object.fromEntries(new FormData(form).entries());

function redirectByRole(user) {
  const role = String(user?.role || '').toUpperCase();
  const next = sessionStorage.getItem('tiktak-after-login');
  sessionStorage.removeItem('tiktak-after-login');
  location.href = role === 'ADMIN' ? 'admin.html' : (next === 'messages' ? 'dashboard.html#messages' : 'dashboard.html');
}

document.getElementById('register')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const response = await TikTakAPI.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData(form))
    });
    TikTakAPI.saveSession(response);
    msg('Konti yawe yafunguwe neza.');
    setTimeout(() => redirectByRole(response.user), 700);
  } catch (error) { msg(error.message); }
});

document.getElementById('login')?.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const response = await TikTakAPI.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData(event.currentTarget))
    });
    TikTakAPI.saveSession(response);
    msg('Winjiye muri konti yawe neza.');
    setTimeout(() => redirectByRole(response.user), 500);
  } catch (error) { msg(error.message); }
});

const country = document.getElementById('country');
country?.addEventListener('change', event => {
  const currency = document.getElementById('currency');
  if (currency) currency.textContent = event.target.value === 'Rwanda' ? 'RWF' : 'KES';
});

const listingForm = document.getElementById('listing');
const category = listingForm?.querySelector('select[name="type"]');
const groups = {
  land: document.getElementById('landFields'),
  house: document.getElementById('houseFields'),
  car: document.getElementById('carFields')
};

function updateFields() {
  if (!category) return;
  const value = category.value;
  Object.entries(groups).forEach(([key, element]) => {
    if (element) element.style.display =
      ((value === 'Ikibanza' && key === 'land') ||
       (value === 'Inzu' && key === 'house') ||
       (value === 'Imodoka' && key === 'car')) ? 'block' : 'none';
  });
}
category?.addEventListener('change', updateFields);
updateFields();

function readExtraDetails() {
  const value = category?.value;
  const get = selector => listingForm.querySelector(selector)?.value?.trim() || '';
  if (value === 'Ikibanza') return {
    landUse: get('#landFields select'),
    area: get('#landFields input')
  };
  if (value === 'Inzu') {
    const fields = [...groups.house.querySelectorAll('input')];
    return {
      bedrooms: fields[0]?.value || '',
      bathrooms: fields[1]?.value || '',
      floors: fields[2]?.value || '',
      area: fields[3]?.value || '',
      houseType: fields[4]?.value || ''
    };
  }
  if (value === 'Imodoka') {
    const fields = [...groups.car.querySelectorAll('input')];
    return {
      make: fields[0]?.value || '',
      model: fields[1]?.value || '',
      year: fields[2]?.value || '',
      mileage: fields[3]?.value || '',
      transmission: fields[4]?.value || '',
      fuel: fields[5]?.value || ''
    };
  }
  return {};
}

const listingImagesInput = document.getElementById('listingImages');
const listingVideoInput = document.getElementById('listingVideo');
const imageCountHint = document.getElementById('imageCountHint');
const videoHint = document.getElementById('videoHint');

listingImagesInput?.addEventListener('change', () => {
  const count = listingImagesInput.files?.length || 0;
  if (imageCountHint) {
    imageCountHint.textContent = count >= 5 && count <= 10
      ? `Wahisemo amafoto ${count}; yujuje ibisabwa.`
      : `Wahisemo amafoto ${count}; hitamo nibura 5 kandi ntarenze 10.`;
  }
});
listingVideoInput?.addEventListener('change', () => {
  const file = listingVideoInput.files?.[0];
  if (videoHint) videoHint.textContent = file
    ? `Video wahisemo: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB).`
    : 'Ushobora kongeraho video imwe yerekana inzu, ikibanza cyangwa imodoka.';
});

listingForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const selected = listingImagesInput?.files || [];
  const videoFile = listingVideoInput?.files?.[0] || null;
  if (selected.length < 5 || selected.length > 10) {
    msg('Hitamo amafoto nibura 5 kandi ntarenze 10 mbere yo kohereza itangazo.');
    listingImagesInput?.focus();
    return;
  }
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if ([...selected].some(file => !allowedImages.includes(file.type) || file.size > 10 * 1024 * 1024)) {
    msg('Amafoto yemerewe ni JPG, PNG, WEBP cyangwa AVIF; buri foto ntirenze 10 MB.');
    return;
  }
  const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
  if (videoFile && (!allowedVideos.includes(videoFile.type) || videoFile.size > 100 * 1024 * 1024)) {
    msg('Video yemerewe ni MP4, WEBM cyangwa MOV kandi ntigomba kurenza 100 MB.');
    return;
  }
  if (!TikTakAPI.token) {
    msg('Banza winjire cyangwa ufungure konti y’umugurisha.');
    location.href = 'account.html#login';
    return;
  }
  const values = formData(listingForm);
  const types = { Ikibanza: 'LAND', Inzu: 'HOUSE', Imodoka: 'CAR' };
  const countryValue = values.country;
  const description = String(values.description || '').trim();
  if (description.length < 20) {
    msg('Ibisobanuro bigomba kugira nibura inyuguti 20.');
    return;
  }
  const payload = {
    type: types[values.type],
    title: values.title,
    country: countryValue,
    province: values.province,
    district: values.district,
    locality: values.locality,
    price: Number(values.price),
    currency: countryValue === 'Rwanda' ? 'RWF' : 'KES',
    description,
    details: readExtraDetails()
  };
  try {
    const created = await TikTakAPI.request('/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const imageForm = new FormData();
    [...selected].forEach(file => imageForm.append('images', file));
    await TikTakAPI.request(`/listings/${created.listing.id}/images`, {
      method: 'POST',
      body: imageForm
    });
    if (videoFile) {
      const videoForm = new FormData();
      videoForm.append('video', videoFile);
      await TikTakAPI.request(`/listings/${created.listing.id}/video`, {
        method: 'POST',
        body: videoForm
      });
    }
    msg(videoFile
      ? 'Itangazo, amafoto 5 cyangwa arenga na video byoherejwe. Birategereje kwemezwa na Admin.'
      : 'Itangazo n’amafoto 5 cyangwa arenga byoherejwe. Birategereje kwemezwa na Admin.');
    listingForm.reset();
    if (imageCountHint) imageCountHint.textContent = "Hitamo amafoto nibura 5 y'itangazo ryawe.";
    if (videoHint) videoHint.textContent = "Ushobora kongeraho video imwe yerekana inzu, ikibanza cyangwa imodoka.";
    updateFields();
  } catch (error) {
    msg(`${error.message} Reba Dashboard mbere yo kongera kohereza.`);
  }
});

if (location.hash === '#login') {
  document.querySelector('[data-id="login"]')?.click();
}
