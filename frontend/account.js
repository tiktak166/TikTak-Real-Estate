const tabs = [...document.querySelectorAll('.tab')];
const panes = [...document.querySelectorAll('.pane')];

tabs.forEach(button => {
  button.onclick = () => {
    tabs.forEach(item => item.classList.toggle('active', item === button));
    panes.forEach(pane => pane.classList.toggle('active', pane.id === button.dataset.id));
  };
});

function msg(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 5000);
}

const formData = form => Object.fromEntries(new FormData(form).entries());

document.getElementById('register').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const result = await TikTakAPI.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData(form))
    });

    TikTakAPI.saveSession(result);
    msg('Konti yawe yafunguwe neza.');
    setTimeout(() => location.href = 'dashboard.html', 900);
  } catch (error) {
    msg(error.message);
  }
};

document.getElementById('login').onsubmit = async event => {
  event.preventDefault();

  try {
    const result = await TikTakAPI.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData(event.currentTarget))
    });

    TikTakAPI.saveSession(result);
    msg('Winjiye muri konti yawe neza.');
    setTimeout(() => location.href = 'dashboard.html', 700);
  } catch (error) {
    msg(error.message);
  }
};

document.getElementById('country').onchange = event => {
  document.getElementById('currency').textContent =
    event.target.value === 'Rwanda' ? 'RWF' : 'KES';
};

const category = document.querySelector('#listing select');

const groups = {
  land: document.getElementById('landFields'),
  house: document.getElementById('houseFields'),
  car: document.getElementById('carFields')
};

const transactionTypeInput = document.getElementById('transactionType');

function updateFields() {
  const value = category.value;
  const isHouse = value === 'Inzu';

  Object.entries(groups).forEach(([key, element]) => {
    element.style.display =
      (value === 'Ikibanza' && key === 'land') ||
      (isHouse && key === 'house') ||
      (value === 'Imodoka' && key === 'car')
        ? 'block'
        : 'none';
  });

  transactionTypeInput.required = isHouse;

  if (!isHouse) {
    transactionTypeInput.value = '';
  }
}

category.addEventListener('change', updateFields);
updateFields();

document.getElementById('listing').onsubmit = async event => {
  event.preventDefault();

  if (!TikTakAPI.token) {
    msg('Banza winjire cyangwa ufungure konti y’umugurisha.');
    return;
  }

  const form = event.currentTarget;
  const values = formData(form);

  const types = {
    'Ikibanza': 'LAND',
    'Inzu': 'HOUSE',
    'Imodoka': 'CAR'
  };

  if (category.value === 'Inzu' && !values.transactionType) {
    msg('Hitamo niba inzu ikodeshwa cyangwa igurishwa.');
    return;
  }

  const selectedImages = document.getElementById('listingImages').files;
  const videoInput = document.getElementById('listingVideo');
  const selectedVideo = videoInput ? videoInput.files[0] : null;

  if (selectedVideo && selectedVideo.size > 50 * 1024 * 1024) {
    msg('Video ntigomba kurenza 50 MB.');
    return;
  }

  const country = values.country;

  const payload = {
    type: types[category.value],
    title: values.title,
    country,
    province: values.province,
    district: values.district,
    locality: values.locality,
    price: Number(values.price),
    currency: country === 'Rwanda' ? 'RWF' : 'KES',
    description: values.description,
    details: {}
  };

  if (category.value === 'Inzu') {
    payload.transactionType = values.transactionType;
  }

  try {
    const created = await TikTakAPI.request('/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const listingId = created.listing.id;

    if (selectedImages.length) {
      const imageData = new FormData();

      [...selectedImages].forEach(file => {
        imageData.append('images', file);
      });

      await TikTakAPI.request(`/listings/${listingId}/images`, {
        method: 'POST',
        body: imageData
      });
    }

    if (selectedVideo) {
      const videoData = new FormData();
      videoData.append('video', selectedVideo);

      await TikTakAPI.request(`/listings/${listingId}/video`, {
        method: 'POST',
        body: videoData
      });
    }

    msg('Itangazo, amafoto na video byoherejwe neza. Birategereje kwemezwa na Admin.');
    form.reset();
    updateFields();

  } catch (error) {
    msg(error.message + ' Reba Dashboard mbere yo kongera kohereza.');
  }
};

if (location.hash === '#login') {
  document.querySelector('[data-id="login"]')?.click();
}