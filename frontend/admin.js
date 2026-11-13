
const pages = [...document.querySelectorAll('.page')];
const nav = [...document.querySelectorAll('.nav')];

const titles = {
  overview: "Incamake y'ubucuruzi",
  listings: "Gucunga amatangazo",
  requests: "Ibyifuzo by'abaguzi",
  clients: "Abakiriya",
  deals: "Amasezerano y'ubucuruzi",
  commissions: "Komisiyo ya TikTak",
  messages: "Ubutumwa bwa TikTak",
  reports: "Raporo n'isesengura"
};

function showPage(id) {
  pages.forEach(p => p.classList.toggle('active', p.id === id));
  nav.forEach(n => n.classList.toggle('active', n.dataset.page === id));

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[id] || 'TikTak Admin';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'listings') renderListings();
  if (id === 'clients') renderClients();
  if (id === 'requests') renderRequests();
  if (id === 'messages') renderThreads();
}

nav.forEach(n => n.addEventListener('click', () => showPage(n.dataset.page)));

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2300);
}

function escapeAdmin(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// =====================================================
// LISTINGS MANAGEMENT
// =====================================================

const initialListings = [
  {
    id: 'TTR-00128',
    title: 'Ikibanza · 500 m²',
    price: '25,000,000 RWF',
    place: 'Gasabo, Kigali',
    country: 'Rwanda',
    status: 'review'
  },
  {
    id: 'TTR-00127',
    title: 'Inzu · ibyumba 4',
    price: '85,000,000 RWF',
    place: 'Kicukiro, Kigali',
    country: 'Rwanda',
    status: 'live'
  },
  {
    id: 'TTR-00126',
    title: 'Toyota Corolla · 2020',
    price: '2,400,000 KES',
    place: 'Nairobi',
    country: 'Kenya',
    status: 'live'
  },
  {
    id: 'TTR-00125',
    title: 'Ikibanza · 300 m²',
    price: '18,000,000 RWF',
    place: 'Huye',
    country: 'Rwanda',
    status: 'paused'
  },
  {
    id: 'TTR-00124',
    title: 'Inzu · 3 bedrooms',
    price: '6,500,000 KES',
    place: 'Kiambu',
    country: 'Kenya',
    status: 'sold'
  }
];

const statusText = {
  review: 'Isuzumwa',
  live: 'Riri ku rubuga',
  paused: 'Ryahagaritswe',
  sold: 'Ryaragurishijwe'
};

let adminListings = [];

async function getListings() {
  try {
    const data = await TikTakAPI.request('/admin/listings');
    adminListings = data.listings || [];
    return adminListings;
  } catch (e) {
    toast(e.message);
    return [];
  }
}

function listingLabel(status) {
  return ({
    PENDING: 'Isuzumwa',
    APPROVED: 'Riri ku rubuga',
    REJECTED: 'Ryanzwe',
    PAUSED: 'Ryahagaritswe',
    SOLD: 'Ryaragurishijwe'
  })[status] || status;
}

async function renderListings() {
  const body = document.getElementById('listingRows');
  if (!body) return;

  let a = await getListings();

  const q = (document.getElementById('listingSearch')?.value || '').toLowerCase();
  const f = document.getElementById('listingFilter')?.value || 'all';
  const c = document.getElementById('listingCountry')?.value || 'all';

  a = a.filter(x =>
    (f === 'all' || x.status === f.toUpperCase()) &&
    (c === 'all' || x.country === c) &&
    (`${x.code} ${x.title} ${x.locality} ${x.district}`.toLowerCase().includes(q))
  );

  body.innerHTML = a.map(x => `
    <tr>
      <td>${escapeAdmin(x.code)}</td>
      <td>
        ${escapeAdmin(x.title)}
        ${x.type === 'HOUSE'
          ? `<small>${x.transactionType === 'RENT' ? ' · Ubukode' : ' · Kugurisha'}</small>`
          : ''}
      </td>
      <td>${Number(x.price).toLocaleString()} ${escapeAdmin(x.currency)}</td>
      <td>${escapeAdmin(x.locality)}, ${escapeAdmin(x.district)}, ${escapeAdmin(x.country)}</td>
      <td>
        <span class="pill ${
          x.status === 'APPROVED' ? 'live' :
          x.status === 'PENDING' ? 'pending' : 'live'
        }">${listingLabel(x.status)}</span>
      </td>
      <td>
        <div class="row-actions">
          ${x.status === 'PENDING' ? `
            <button class="mini success" onclick="listingAction('${x.id}','APPROVED')">Emeza</button>
            <button class="mini danger" onclick="listingAction('${x.id}','REJECTED')">Anga</button>
          ` : ''}

          ${x.status === 'APPROVED' ? `
            <button class="mini danger" onclick="listingAction('${x.id}','PAUSED')">Hagarika</button>
          ` : ''}

          ${x.status === 'PAUSED' ? `
            <button class="mini success" onclick="listingAction('${x.id}','APPROVED')">Subizaho</button>
          ` : ''}

          ${x.status !== 'SOLD' ? `
            <button class="mini" onclick="listingAction('${x.id}','SOLD')">Shyira Sold</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Nta tangazo ribonetse.</td></tr>';
}

async function listingAction(id, status) {
  try {
    await TikTakAPI.request(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    toast('Imiterere y’itangazo yahinduwe.');
    await renderListings();
  } catch (e) {
    toast(e.message);
  }
}

['listingSearch', 'listingFilter', 'listingCountry'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderListings);
});

// =====================================================
// CREATE NEW LISTING + CLOUDINARY IMAGES
// =====================================================

const createListingForm = document.getElementById('createListingForm');
const newListingType = document.getElementById('newListingType');
const transactionTypeGroup = document.getElementById('transactionTypeGroup');
const newTransactionType = document.getElementById('newTransactionType');
const createListingStatus = document.getElementById('createListingStatus');
const createListingButton = document.getElementById('createListingButton');

function updateTransactionTypeVisibility() {
  if (!newListingType || !transactionTypeGroup || !newTransactionType) return;

  const isHouse = newListingType.value === 'HOUSE';

  transactionTypeGroup.hidden = !isHouse;
  newTransactionType.disabled = !isHouse;
  newTransactionType.required = isHouse;

  if (!isHouse) {
    newTransactionType.value = 'SALE';
  }
}

newListingType?.addEventListener('change', updateTransactionTypeVisibility);
updateTransactionTypeVisibility();

createListingForm?.addEventListener('submit', async e => {
  e.preventDefault();

  if (!createListingForm) return;

  const imagesInput = document.getElementById('newListingImages');
  const files = Array.from(imagesInput?.files || []);

  if (files.length < 1) {
    toast('Shyiraho nibura ifoto imwe y’itangazo.');
    return;
  }

  if (files.length > 10) {
    toast('Ntushobora kurenza amafoto 10.');
    return;
  }

  const type = newListingType?.value;

  if (!type) {
    toast('Hitamo ubwoko bw’itangazo.');
    return;
  }

  const transactionType = type === 'HOUSE'
    ? newTransactionType?.value
    : 'SALE';

  if (type === 'HOUSE' && !['RENT', 'SALE'].includes(transactionType)) {
    toast('Hitamo niba inzu ikodeshwa cyangwa igurishwa.');
    return;
  }

  const payload = {
    type,
    transactionType,
    title: document.getElementById('newListingTitle')?.value.trim(),
    country: document.getElementById('newListingCountry')?.value.trim(),
    province: document.getElementById('newListingProvince')?.value.trim(),
    district: document.getElementById('newListingDistrict')?.value.trim(),
    locality: document.getElementById('newListingLocality')?.value.trim(),
    price: Number(document.getElementById('newListingPrice')?.value),
    currency: document.getElementById('newListingCurrency')?.value,
    description: document.getElementById('newListingDescription')?.value.trim()
  };

  if (
    !payload.title ||
    !payload.country ||
    !payload.district ||
    !payload.locality ||
    !payload.price ||
    payload.price <= 0 ||
    !payload.currency ||
    !payload.description
  ) {
    toast('Uzuza neza amakuru yose asabwa.');
    return;
  }

  if (createListingButton) {
    createListingButton.disabled = true;
    createListingButton.textContent = 'Tegereza...';
  }

  if (createListingStatus) {
    createListingStatus.textContent = 'Turimo kubika itangazo...';
  }

  let listingCreated = false;

  try {
    // 1. Save listing details in PostgreSQL.
    const result = await TikTakAPI.request('/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const listing = result.listing;

    if (!listing?.id) {
      throw new Error('Itangazo ntiryabitswe neza. Ongera ugerageze.');
    }

    listingCreated = true;

    // 2. Upload listing images to Cloudinary.
    const formData = new FormData();

    files.forEach(file => {
      formData.append('images', file);
    });

    if (createListingStatus) {
      createListingStatus.textContent = 'Itangazo ribitswe. Turimo kohereza amafoto...';
    }

    await TikTakAPI.request(`/listings/${listing.id}/images`, {
      method: 'POST',
      body: formData
    });

    // 3. Clear form and refresh listings.
    createListingForm.reset();
    updateTransactionTypeVisibility();

    if (createListingStatus) {
      createListingStatus.textContent = 'Itangazo n’amafoto byabitswe neza.';
    }

    toast('Itangazo n’amafoto byabitswe neza.');

    await renderListings();

  } catch (e) {
    if (listingCreated) {
      if (createListingStatus) {
        createListingStatus.textContent =
          `Itangazo ryabitswe, ariko amafoto ntiyoherejwe: ${e.message}`;
      }

      toast('Itangazo ryabitswe ariko amafoto ntiyoherejwe.');
      await renderListings();
    } else {
      if (createListingStatus) {
        createListingStatus.textContent = e.message;
      }

      toast(e.message || 'Habaye ikibazo mu kubika itangazo.');
    }
  } finally {
    if (createListingButton) {
      createListingButton.disabled = false;
      createListingButton.textContent = 'Bika itangazo';
    }
  }
});

// =====================================================
// BUYER REQUESTS
// =====================================================

const initialRequests = [
  {
    id: 'REQ-00024',
    title: 'Ikibanza i Gasabo',
    buyer: 'Demo Buyer',
    country: 'Rwanda',
    phone: '+250 *** ***',
    message: 'Yifuza kumenya ibisabwa mbere yo kugura.',
    status: 'Gishya'
  },
  {
    id: 'REQ-00023',
    title: 'Inzu i Kicukiro',
    buyer: 'Demo Client',
    country: 'Rwanda',
    phone: 'Email ihishwe',
    message: 'Yasabye ko TikTak imuhamagara.',
    status: 'Turimo kuvugana'
  },
  {
    id: 'REQ-00022',
    title: 'Toyota i Nairobi',
    buyer: 'Demo Customer',
    country: 'Kenya',
    phone: '+254 *** ***',
    message: 'Ashaka kumenya amateka y’imodoka.',
    status: 'Negotiation'
  }
];

function getRequests() {
  try {
    return JSON.parse(localStorage.getItem('tt5_requests')) || initialRequests;
  } catch {
    return initialRequests;
  }
}

function renderRequests() {
  const q = (document.getElementById('requestSearch')?.value || '').toLowerCase();
  const f = document.getElementById('requestFilter')?.value || 'all';

  const a = getRequests().filter(x =>
    (f === 'all' || x.status === f) &&
    (`${x.id} ${x.title} ${x.buyer}`.toLowerCase().includes(q))
  );

  const body = document.getElementById('requestRows');
  if (!body) return;

  body.innerHTML = a.map(x => `
    <div class="lead">
      <div class="lead-main">
        <b>${escapeAdmin(x.id)} · ${escapeAdmin(x.title)}</b>
        <p>${escapeAdmin(x.buyer)} · ${escapeAdmin(x.country)} · ${escapeAdmin(x.phone)}</p>
        <small>${escapeAdmin(x.message)}</small>
        <p>
          <label>
            Imiterere:
            <select onchange="requestStatus('${x.id}',this.value)">
              ${['Gishya', 'Turimo kuvugana', 'Negotiation', 'Byarangiye']
                .map(v => `<option ${v === x.status ? 'selected' : ''}>${v}</option>`)
                .join('')}
            </select>
          </label>
        </p>
      </div>
      <span class="pill ${x.status === 'Gishya' ? 'pending' : 'live'}">${escapeAdmin(x.status)}</span>
    </div>
  `).join('') || '<div class="empty-state">Nta byifuzo bihari.</div>';
}

function requestStatus(id, status) {
  localStorage.setItem(
    'tt5_requests',
    JSON.stringify(getRequests().map(x => x.id === id ? { ...x, status } : x))
  );

  renderRequests();
  toast('Imiterere y’icyifuzo yahinduwe.');
}

['requestSearch', 'requestFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderRequests);
});

// =====================================================
// MESSAGES
// =====================================================

const initialThreads = [
  {
    id: 'th1',
    name: 'Demo Buyer · REQ-00024',
    meta: 'Ikibanza i Gasabo · Rwanda',
    messages: [
      {
        from: 'client',
        text: 'Muraho, ndifuza kumenya ibisabwa kuri iki kibanza.',
        time: '09:15'
      },
      {
        from: 'admin',
        text: 'Muraho neza. Murakoze kutwandikira. Turimo kugenzura amakuru y’itangazo.',
        time: '09:20'
      }
    ]
  },
  {
    id: 'th2',
    name: 'Demo Client · REQ-00023',
    meta: 'Inzu i Kicukiro · Rwanda',
    messages: [
      {
        from: 'client',
        text: 'Ese nshobora gusura inzu muri iki cyumweru?',
        time: 'Ejo'
      }
    ]
  },
  {
    id: 'th3',
    name: 'Demo Customer · REQ-00022',
    meta: 'Toyota i Nairobi · Kenya',
    messages: [
      {
        from: 'client',
        text: 'Ndifuza kumenya mileage y’imodoka.',
        time: 'Ku wa mbere'
      }
    ]
  }
];

let activeThread = null;

function getThreads() {
  try {
    return JSON.parse(localStorage.getItem('tt5_threads')) || initialThreads;
  } catch {
    return initialThreads;
  }
}

function renderThreads() {
  const a = getThreads();
  const list = document.getElementById('threadList');
  if (!list) return;

  list.innerHTML = a.map(t => `
    <div class="thread ${activeThread === t.id ? 'selected' : ''}" onclick="openThread('${t.id}')">
      <span class="avatar">${escapeAdmin(t.name.charAt(0))}</span>
      <div>
        <b>${escapeAdmin(t.name)}</b>
        <small>${escapeAdmin(t.messages.at(-1)?.text || '')}</small>
      </div>
    </div>
  `).join('');

  if (activeThread && !a.some(t => t.id === activeThread)) {
    activeThread = null;
  }

  if (activeThread) renderChat();
}

function openThread(id) {
  activeThread = id;
  renderThreads();
  renderChat();
}

function renderChat() {
  const t = getThreads().find(x => x.id === activeThread);
  if (!t) return;

  const chatName = document.getElementById('chatName');
  const chatMeta = document.getElementById('chatMeta');
  const chatMessages = document.getElementById('chatMessages');

  if (!chatMessages) return;

  if (chatName) chatName.textContent = t.name;
  if (chatMeta) chatMeta.textContent = t.meta;

  chatMessages.innerHTML = t.messages.map(m => `
    <div class="bubble ${m.from === 'admin' ? 'admin' : ''}">
      ${escapeAdmin(m.text)}
      <small>${m.from === 'admin' ? 'TikTak Admin' : 'Umukiriya'} · ${escapeAdmin(m.time)}</small>
    </div>
  `).join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('replyForm')?.addEventListener('submit', e => {
  e.preventDefault();

  const input = document.getElementById('replyText');
  const v = input?.value.trim();

  if (!v || !activeThread) {
    toast('Banza uhitemo ikiganiro kandi wandike ubutumwa.');
    return;
  }

  const a = getThreads().map(t =>
    t.id === activeThread
      ? {
          ...t,
          messages: [
            ...t.messages,
            {
              from: 'admin',
              text: v,
              time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          ]
        }
      : t
  );

  localStorage.setItem('tt5_threads', JSON.stringify(a));
  input.value = '';

  renderThreads();
  renderChat();
  toast('Ubutumwa bwabitswe muri demo.');
});

// =====================================================
// DEALS AND COMMISSIONS
// =====================================================

const demoDeals = [
  {
    id: 'TTR-D004',
    item: 'Inzu i Kigali',
    price: 5000000,
    currency: 'RWF',
    status: 'Negotiation'
  },
  {
    id: 'TTR-D003',
    item: 'Ikibanza i Nairobi',
    price: 3000000,
    currency: 'KES',
    status: 'Sale Completed'
  },
  {
    id: 'TTR-D002',
    item: 'Toyota Corolla i Kigali',
    price: 12000000,
    currency: 'RWF',
    status: 'Sale Agreement'
  },
  {
    id: 'TTR-D001',
    item: 'Ikibanza i Huye',
    price: 8000000,
    currency: 'RWF',
    status: 'Interested'
  }
];

function deals() {
  try {
    return JSON.parse(localStorage.getItem('tt6_deals')) || demoDeals;
  } catch {
    return demoDeals;
  }
}

function renderDeals() {
  const q = (document.getElementById('dealSearch')?.value || '').toLowerCase();
  const f = document.getElementById('dealFilter')?.value || 'all';

  const a = deals().filter(d =>
    (f === 'all' || d.status === f) &&
    (`${d.id} ${d.item}`.toLowerCase().includes(q))
  );

  const body = document.getElementById('dealRows');
  if (!body) return;

  body.innerHTML = a.map(d => `
    <tr>
      <td>${escapeAdmin(d.id)}</td>
      <td>${escapeAdmin(d.item)}</td>
      <td>${d.price.toLocaleString()} ${escapeAdmin(d.currency)}</td>
      <td>${(d.price * 0.05).toLocaleString()} ${escapeAdmin(d.currency)}</td>
      <td>
        <span class="pill ${d.status === 'Sale Completed' ? 'live' : 'pending'}">
          ${escapeAdmin(d.status)}
        </span>
      </td>
      <td>
        <select onchange="changeDeal('${d.id}',this.value)">
          ${['Interested', 'Negotiation', 'Sale Agreement', 'Sale Completed', 'Disputed']
            .map(v => `<option ${v === d.status ? 'selected' : ''}>${v}</option>`)
            .join('')}
        </select>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Nta masezerano ahuye n’ishakisha.</td></tr>';
}

function changeDeal(id, status) {
  localStorage.setItem(
    'tt6_deals',
    JSON.stringify(deals().map(d => d.id === id ? { ...d, status } : d))
  );

  renderDeals();
  toast('Intambwe y’amasezerano yahinduwe (demo).');
}

['dealSearch', 'dealFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderDeals);
});

function calcCommission() {
  const price = Math.max(0, Number(document.getElementById('salePrice')?.value || 0));
  const cur = document.getElementById('saleCurrency')?.value || 'RWF';
  const result = document.getElementById('commissionResult');

  if (result) {
    result.textContent =
      (price * 0.05).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + cur;
  }
}

['salePrice', 'saleCurrency'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', calcCommission);
});

const priorShowPage = showPage;

showPage = function(id) {
  priorShowPage(id);
  if (id === 'deals') renderDeals();
};

// =====================================================
// LIVE CLIENT MANAGEMENT
// =====================================================

let adminUsers = [];

async function renderClients() {
  const body = document.getElementById('clientRows');
  const status = document.getElementById('clientStatus');

  if (!body) return;

  body.innerHTML = '<tr><td colspan="6">Tegereza...</td></tr>';

  try {
    const data = await TikTakAPI.request('/admin/users');
    adminUsers = data.users || [];

    const q = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    const role = document.getElementById('clientRole')?.value || 'all';

    const rows = adminUsers.filter(u =>
      (role === 'all' || u.role === role) &&
      `${u.fullName} ${u.contact} ${u.country}`.toLowerCase().includes(q)
    );

    body.innerHTML = rows.map(u => `
      <tr>
        <td>${escapeAdmin(u.fullName)}</td>
        <td>${escapeAdmin(u.contact)}</td>
        <td>${escapeAdmin(u.country)}</td>
        <td>${escapeAdmin(u.role)}</td>
        <td>
          <span class="pill ${u.isActive ? 'live' : 'pending'}">
            ${u.isActive ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td>
          <button
            class="mini ${u.isActive ? 'danger' : 'success'}"
            onclick="toggleClient('${u.id}',${!u.isActive})">
            ${u.isActive ? 'Hagarika' : 'Fungura'}
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">Nta mukiriya ubonetse.</td></tr>';

    if (status) {
      status.textContent = `Abakiriya ${adminUsers.length} babonetse muri database.`;
    }

  } catch (e) {
    body.innerHTML = `<tr><td colspan="6">${escapeAdmin(e.message)}</td></tr>`;

    if (status) {
      status.textContent = 'Kwinjira nka Admin birakenewe kugira ngo ucunge abakiriya.';
    }
  }
}

async function toggleClient(id, isActive) {
  try {
    await TikTakAPI.request(`/admin/users/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });

    toast('Konti yahinduwe neza.');
    await renderClients();

  } catch (e) {
    toast(e.message);
  }
}

['clientSearch', 'clientRole'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderClients);
});
