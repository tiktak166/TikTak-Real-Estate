/* =========================================================
   TIKTAK REAL ESTATE - ADMIN DASHBOARD
   Real database integration
========================================================= */

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

let adminListings = [];
let adminUsers = [];
let adminDeals = [];
let adminCommissions = [];


/* =========================================================
   HELPERS
========================================================= */

function escapeAdmin(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function money(value, currency = '') {
  const amount = Number(value || 0);

  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 2
  }) + (currency ? ' ' + currency : '');
}

function toast(message) {
  const element = document.getElementById('toast');

  if (!element) return;

  element.textContent = message;
  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

function setSystemStatus(message, connected = false) {
  const element = document.getElementById('systemStatus');

  if (!element) return;

  element.textContent = message;
  element.style.color = connected ? '#16a34a' : '#d97706';
}

function showTableMessage(elementId, message, columns = 1) {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.innerHTML = `
    <tr>
      <td colspan="${columns}">${escapeAdmin(message)}</td>
    </tr>
  `;
}

function apiError(error) {
  const message = error?.message || 'Habaye ikibazo mu guhuza na server.';
  toast(message);
  return message;
}

function dateLabel(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */


// WEBSITE ANALYTICS - REAL DATABASE
async function renderAnalytics() {
  const status = document.getElementById('analyticsStatus');
  const periodInput = document.getElementById('analyticsPeriod');
  const visitorsElement = document.getElementById('reportVisitors');
  const visitsElement = document.getElementById('reportVisits');
  const listingViewsElement = document.getElementById('reportListingViews');
  const topBody = document.getElementById('reportTopListings');
  const chartBody = document.getElementById('reportAnalyticsRows');

  const period = periodInput?.value || 'week';

  if (status) status.textContent = "Tegereza amakuru y'isesengura...";

  try {
    const data = await TikTakAPI.request(
      `/admin/analytics?period=${encodeURIComponent(period)}`
    );

    if (visitorsElement) {
      visitorsElement.textContent =
        Number(data.uniqueBrowsers || 0).toLocaleString();
    }

    if (visitsElement) {
      visitsElement.textContent =
        Number(data.visits || 0).toLocaleString();
    }

    if (listingViewsElement) {
      listingViewsElement.textContent =
        Number(data.listingViews || 0).toLocaleString();
    }

    if (topBody) {
      topBody.innerHTML = (data.topListings || []).map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeAdmin(item.title)}</td>
          <td>${Number(item.views || 0).toLocaleString()}</td>
        </tr>
      `).join('') || `
        <tr><td colspan="3">Nta matangazo yarebwe muri iki gihe.</td></tr>
      `;
    }

    if (chartBody) {
      chartBody.innerHTML = (data.chart || []).map(item => `
        <tr>
          <td>${escapeAdmin(item.label)}</td>
          <td>${Number(item.visits || 0).toLocaleString()}</td>
          <td>${Number(item.visitors || 0).toLocaleString()}</td>
        </tr>
      `).join('') || `
        <tr><td colspan="3">Nta mibare iraboneka muri iki gihe.</td></tr>
      `;
    }

    if (status) {
      status.textContent =
        `Raporo ivuye muri database. Igihe: ${data.timezone || 'Africa/Kigali'}. Abasura ni browsers/devices byihariye, si umubare wÃ¢â‚¬â„¢abantu bemejwe.`;
    }

  } catch (error) {
    if (status) {
      status.textContent =
        'Ntibishobotse kubona raporo. Reba server na database.';
    }

    showTableMessage('reportTopListings', error.message, 3);
    showTableMessage('reportAnalyticsRows', error.message, 3);
    apiError(error);
  }
}

function showPage(id) {
  pages.forEach(page => {
    page.classList.toggle('active', page.id === id);
  });

  nav.forEach(item => {
    item.classList.toggle('active', item.dataset.page === id);
  });

  const title = document.getElementById('pageTitle');

  if (title) {
    title.textContent = titles[id] || 'TikTak Admin';
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  if (id === 'overview') renderDashboard();
  if (id === 'listings') renderListings();
  if (id === 'clients') renderClients();
  if (id === 'requests') renderRequests();
  if (id === 'deals') renderDeals();
  if (id === 'commissions') renderCommissions();
  if (id === 'messages') renderThreads();
  if (id === 'reports') renderAnalytics();
}

nav.forEach(item => {
  item.addEventListener('click', () => {
    showPage(item.dataset.page);
  });
});


/* =========================================================
   OVERVIEW - REAL DATABASE
========================================================= */

async function renderDashboard() {
  setSystemStatus('â— Igenzura rya database...');

  try {
    const [overview, listingData] = await Promise.all([
      TikTakAPI.request('/admin/overview'),
      TikTakAPI.request('/admin/listings')
    ]);

    adminListings = listingData.listings || [];

    const listingsElement = document.getElementById('overviewListings');
    const pendingElement = document.getElementById('overviewPending');
    const completedElement = document.getElementById('overviewCompleted');
    const commissionElement = document.getElementById('overviewCommission');
    const reportCompleted = document.getElementById('reportCompleted');

    if (listingsElement) {
      listingsElement.textContent = Number(overview.listings || 0).toLocaleString();
    }

    if (pendingElement) {
      pendingElement.textContent = Number(overview.pendingListings || 0).toLocaleString();
    }

    if (completedElement) {
      completedElement.textContent = Number(overview.completedDeals || 0).toLocaleString();
    }

    if (reportCompleted) {
      reportCompleted.textContent = Number(overview.completedDeals || 0).toLocaleString();
    }

    const commissionGroups = overview.commissions || [];

    const pendingCommissions = commissionGroups.filter(
      item => item.status === 'PENDING'
    );

    const commissionSummary = pendingCommissions.length
      ? pendingCommissions.map(item => {
          const currency = item.currency || '';
          const amount = item._sum?.amount || 0;
          return money(amount, currency);
        }).join(' Â· ')
      : '0';

    if (commissionElement) {
      commissionElement.textContent = commissionSummary;
    }

    renderOverviewListings(adminListings);

    const activity = document.getElementById('overviewActivityRows');

    if (activity) {
      activity.innerHTML = `
        <div class="activity">
          <span class="activity-icon gray">âŒ‚</span>
          <div>
            <b>Amatangazo ari muri database</b>
            <p>${Number(overview.listings || 0)} yose</p>
          </div>
        </div>

        <div class="activity">
          <span class="activity-icon yellow">âœ‰</span>
          <div>
            <b>Amatangazo ategereje kwemezwa</b>
            <p>${Number(overview.pendingListings || 0)} asuzumwa</p>
          </div>
        </div>

        <div class="activity">
          <span class="activity-icon green">âœ“</span>
          <div>
            <b>Amasezerano yarangiye</b>
            <p>${Number(overview.completedDeals || 0)} yemejwe</p>
          </div>
        </div>
      `;
    }

    setSystemStatus('â— Database ihujwe neza', true);

  } catch (error) {
    setSystemStatus('â— Database ntibashije kuyihuza');

    const ids = [
      'overviewListings',
      'overviewPending',
      'overviewCompleted',
      'overviewCommission',
      'reportCompleted'
    ];

    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '-';
    });

    showTableMessage(
      'overviewListingRows',
      'Ntibishobotse kubona amakuru ya database.',
      6
    );

    const activity = document.getElementById('overviewActivityRows');

    if (activity) {
      activity.innerHTML = `
        <div class="empty-state">
          Ntibishobotse kubona amakuru. Reba internet na server.
        </div>
      `;
    }

    apiError(error);
  }
}


function renderOverviewListings(listings) {
  const body = document.getElementById('overviewListingRows');

  if (!body) return;

  const recent = listings.slice(0, 5);

  body.innerHTML = recent.map(item => `
    <tr>
      <td>${escapeAdmin(item.code)}</td>

      <td>${escapeAdmin(item.title)}</td>

      <td>
        ${escapeAdmin(item.locality)},
        ${escapeAdmin(item.district)},
        ${escapeAdmin(item.country)}
      </td>

      <td>
        ${money(item.price, item.currency)}
      </td>

      <td>
        <span class="pill ${item.status === 'APPROVED' ? 'live' : 'pending'}">
          ${listingLabel(item.status)}
        </span>
      </td>

      <td>
        <button class="mini" onclick="showPage('listings')">
          Reba
        </button>
      </td>
    </tr>
  `).join('') || `
    <tr>
      <td colspan="6">Nta matangazo araboneka muri database.</td>
    </tr>
  `;
}


/* =========================================================
   LISTINGS - REAL DATABASE
========================================================= */

function listingLabel(status) {
  const labels = {
    PENDING: 'Isuzumwa',
    APPROVED: 'Riri ku rubuga',
    REJECTED: 'Ryanzwe',
    PAUSED: 'Ryahagaritswe',
    SOLD: 'Ryaragurishijwe'
  };

  return labels[status] || status || '-';
}

async function getListings() {
  const data = await TikTakAPI.request('/admin/listings');

  adminListings = data.listings || [];

  return adminListings;
}

async function renderListings() {
  const body = document.getElementById('listingRows');

  if (!body) return;

  body.innerHTML = `
    <tr><td colspan="6">Tegereza amakuru ava muri database...</td></tr>
  `;

  try {
    let listings = await getListings();

    const query = (
      document.getElementById('listingSearch')?.value || ''
    ).toLowerCase();

    const filter = document.getElementById('listingFilter')?.value || 'all';

    const country = document.getElementById('listingCountry')?.value || 'all';

    listings = listings.filter(item => {
      const matchesStatus =
        filter === 'all' || item.status === filter;

      const matchesCountry =
        country === 'all' || item.country === country;

      const searchable = [
        item.code,
        item.title,
        item.locality,
        item.district,
        item.province,
        item.country
      ].join(' ').toLowerCase();

      return matchesStatus &&
        matchesCountry &&
        searchable.includes(query);
    });

    body.innerHTML = listings.map(item => `
      <tr>
        <td>${escapeAdmin(item.code)}</td>

        <td>
          ${escapeAdmin(item.title)}
          <br>
          <small>${escapeAdmin(item.type)} Â· ${escapeAdmin(item.transactionType)}</small>
        </td>

        <td>${money(item.price, item.currency)}</td>

        <td>
          ${escapeAdmin(item.locality)},
          ${escapeAdmin(item.district)},
          ${escapeAdmin(item.country)}
        </td>

        <td>
          <span class="pill ${item.status === 'APPROVED' ? 'live' : 'pending'}">
            ${listingLabel(item.status)}
          </span>
        </td>

        <td>
          <div class="row-actions">

            ${item.status === 'PENDING' ? `
              <button
                class="mini success"
                onclick="listingAction('${escapeAdmin(item.id)}','APPROVED')"
              >Emeza</button>

              <button
                class="mini danger"
                onclick="listingAction('${escapeAdmin(item.id)}','REJECTED')"
              >Anga</button>
            ` : ''}

            ${item.status === 'APPROVED' ? `
              <button
                class="mini danger"
                onclick="listingAction('${escapeAdmin(item.id)}','PAUSED')"
              >Hagarika</button>
            ` : ''}

            ${item.status === 'PAUSED' ? `
              <button
                class="mini success"
                onclick="listingAction('${escapeAdmin(item.id)}','APPROVED')"
              >Subizaho</button>
            ` : ''}

            ${item.status !== 'SOLD' ? `
              <button
                class="mini"
                onclick="listingAction('${escapeAdmin(item.id)}','SOLD')"
              >Shyira Sold</button>
            ` : ''}

            <button
              class="mini"
              onclick="editAdminListing('${escapeAdmin(item.id)}')"
            >Hindura</button>

            <button
              class="mini danger"
              onclick="deleteAdminListing('${escapeAdmin(item.id)}')"
            >Siba</button>

          </div>
        </td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="6">Nta tangazo ribonetse.</td>
      </tr>
    `;

  } catch (error) {
    showTableMessage('listingRows', error.message, 6);
    apiError(error);
  }
}


async function listingAction(id, status) {
  try {
    await TikTakAPI.request(`/admin/listings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    toast('Imiterere yâ€™itangazo yahinduwe neza.');

    await renderListings();
    await renderDashboard();

  } catch (error) {
    apiError(error);
  }
}


['listingSearch', 'listingFilter', 'listingCountry'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderListings);
});


/* =========================================================
   REQUESTS
   BACKEND API NOT YET AVAILABLE
========================================================= */

function renderRequests() {
  const body = document.getElementById('requestRows');

  if (!body) return;

  body.innerHTML = `
    <div class="empty-state">
      Ibyifuzo ntibirahuzwa na database.
      Backend ntirafite API ibika kandi igarura ibyifuzo by'abaguzi.
    </div>
  `;
}


/* =========================================================
   MESSAGES
   BACKEND API NOT YET AVAILABLE
========================================================= */

function renderThreads() {
  const list = document.getElementById('threadList');
  const messages = document.getElementById('chatMessages');

  if (list) {
    list.innerHTML = `
      <div class="empty-state">
        Ubutumwa ntiburahuzwa na database.
      </div>
    `;
  }

  if (messages) {
    messages.innerHTML = `
      <div class="empty-state">
        Ubutumwa nyakuri buzagaragara nyuma yo gushyiraho API yabwo.
      </div>
    `;
  }

  const name = document.getElementById('chatName');
  const meta = document.getElementById('chatMeta');

  if (name) name.textContent = 'Nta kiganiro gihari';
  if (meta) meta.textContent = 'Ubutumwa ntiburahuzwa na database.';
}


/* Ntitubika ubutumwa bw'igerageza muri browser. */
document.getElementById('replyForm')?.addEventListener('submit', event => {
  event.preventDefault();

  toast('Ubutumwa ntiburabasha koherezwa. API yabwo ntirashyirwaho.');
});


/* =========================================================
   CLIENTS - REAL DATABASE
========================================================= */

async function renderClients() {
  const body = document.getElementById('clientRows');
  const status = document.getElementById('clientStatus');

  if (!body) return;

  body.innerHTML = `
    <tr><td colspan="6">Tegereza...</td></tr>
  `;

  try {
    const data = await TikTakAPI.request('/admin/users');

    adminUsers = data.users || [];

    const query = (
      document.getElementById('clientSearch')?.value || ''
    ).toLowerCase();

    const role = document.getElementById('clientRole')?.value || 'all';

    const filtered = adminUsers.filter(user => {
      const matchesRole = role === 'all' || user.role === role;

      const searchable = [
        user.fullName,
        user.contact,
        user.country,
        user.role
      ].join(' ').toLowerCase();

      return matchesRole && searchable.includes(query);
    });

    body.innerHTML = filtered.map(user => `
      <tr>

        <td>${escapeAdmin(user.fullName)}</td>

        <td>${escapeAdmin(user.contact)}</td>

        <td>${escapeAdmin(user.country)}</td>

        <td>${escapeAdmin(user.role)}</td>

        <td>
          <span class="pill ${user.isActive ? 'live' : 'pending'}">
            ${user.isActive ? 'Active' : 'Disabled'}
          </span>
        </td>

        <td>
          <button
            class="mini ${user.isActive ? 'danger' : 'success'}"
            onclick="toggleClient('${escapeAdmin(user.id)}',${!user.isActive})"
          >
            ${user.isActive ? 'Hagarika' : 'Fungura'}
          </button>
        </td>

      </tr>
    `).join('') || `
      <tr>
        <td colspan="6">Nta mukiriya ubonetse.</td>
      </tr>
    `;

    if (status) {
      status.textContent =
        `Abakiriya ${adminUsers.length} babonetse muri database.`;
    }

  } catch (error) {
    showTableMessage('clientRows', error.message, 6);

    if (status) {
      status.textContent =
        'Ntibishobotse kubona abakiriya. Reba uburenganzira bwa Admin.';
    }

    apiError(error);
  }
}


async function toggleClient(id, isActive) {
  try {
    await TikTakAPI.request(
      `/admin/users/${encodeURIComponent(id)}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      }
    );

    toast('Konti yahinduwe neza.');

    await renderClients();

  } catch (error) {
    apiError(error);
  }
}


['clientSearch', 'clientRole'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderClients);
});


/* =========================================================
   DEALS - REAL DATABASE
========================================================= */

const dealStatusLabels = {
  INTERESTED: 'Interested',
  NEGOTIATION: 'Negotiation',
  SALE_AGREEMENT: 'Sale Agreement',
  SALE_COMPLETED: 'Sale Completed',
  DISPUTED: 'Disputed'
};

async function getDeals() {
  const data = await TikTakAPI.request('/deals');

 adminDeals = data.deals || [];

  return adminDeals;
}


async function renderDeals() {
  const body = document.getElementById('dealRows');

  if (!body) return;

  body.innerHTML = `
    <tr><td colspan="6">Tegereza amakuru y'amasezerano...</td></tr>
  `;

  try {
    let deals = await getDeals();

    const query = (
      document.getElementById('dealSearch')?.value || ''
    ).toLowerCase();

    const filter = document.getElementById('dealFilter')?.value || 'all';

    const filtered = deals.filter(deal => {
      const matchesStatus = filter === 'all' ||
        deal.status === filter ||
        dealStatusLabels[deal.status] === filter;

      const searchable = [
        deal.code,
        deal.listing?.title,
        deal.listing?.code,
        deal.buyer?.fullName,
        deal.seller?.fullName
      ].join(' ').toLowerCase();

      return matchesStatus && searchable.includes(query);
    });

    body.innerHTML = filtered.map(deal => `
      <tr>

        <td>${escapeAdmin(deal.code)}</td>

        <td>
          ${escapeAdmin(deal.listing?.title || 'Itangazo ritabonetse')}
          <br>
          <small>${escapeAdmin(deal.buyer?.fullName || '')}</small>
        </td>

        <td>${money(deal.price, deal.currency)}</td>

        <td>${money(deal.commissionAmount, deal.currency)}</td>

        <td>
          <span class="pill ${deal.status === 'SALE_COMPLETED' ? 'live' : 'pending'}">
            ${escapeAdmin(dealStatusLabels[deal.status] || deal.status)}
          </span>
        </td>

        <td>
          <select
            onchange="changeDeal('${escapeAdmin(deal.id)}',this.value)"
          >
            ${Object.entries(dealStatusLabels).map(([value, label]) => `
              <option
                value="${value}"
                ${deal.status === value ? 'selected' : ''}
              >
                ${label}
              </option>
            `).join('')}
          </select>
        </td>

      </tr>
    `).join('') || `
      <tr>
        <td colspan="6">Nta masezerano ahuye n'ishakisha.</td>
      </tr>
    `;

  } catch (error) {
    showTableMessage('dealRows', error.message, 6);
    apiError(error);
  }
}


async function changeDeal(id, status) {
  try {
    await TikTakAPI.request(
      `/deals/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }
    );

    toast('Intambwe yâ€™amasezerano yahinduwe neza.');

    await renderDeals();
    await renderDashboard();
    await renderCommissions();

  } catch (error) {
    apiError(error);
    await renderDeals();
  }
}


['dealSearch', 'dealFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderDeals);
});


/* =========================================================
   COMMISSION CALCULATOR
========================================================= */

function calcCommission() {
  const price = Math.max(
    0,
    Number(document.getElementById('salePrice')?.value || 0)
  );

  const currency =
    document.getElementById('saleCurrency')?.value || 'RWF';

  const result = document.getElementById('commissionResult');

  if (result) {
    result.textContent = money(price * 0.05, currency);
  }
}

['salePrice', 'saleCurrency'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', calcCommission);
});


/* =========================================================
   COMMISSIONS - REAL DATABASE
========================================================= */

async function renderCommissions() {
  const body = document.getElementById('commissionRows');

  if (!body) return;

  body.innerHTML = `
    <tr><td colspan="6">Tegereza amakuru ya komisiyo...</td></tr>
  `;

  try {
    const data = await TikTakAPI.request('/admin/commissions');

    adminCommissions = data.commissions || [];

    body.innerHTML = adminCommissions.map(item => `
      <tr>

        <td>
          ${escapeAdmin(item.deal?.code || item.dealId)}
        </td>

        <td>
          ${money(item.deal?.price, item.currency)}
        </td>

        <td>
          ${money(item.amount, item.currency)}
        </td>

        <td>${escapeAdmin(item.currency)}</td>

        <td>
          <span class="pill ${item.status === 'PAID' ? 'live' : 'pending'}">
            ${escapeAdmin(item.status)}
          </span>
        </td>

        <td>
          ${
            item.status === 'PENDING'
              ? `
                <button
                  class="mini success"
                  onclick="markCommissionPaid('${escapeAdmin(item.id)}')"
                >
                  Emeza ko yishyuwe
                </button>
              `
              : item.status === 'PAID'
                ? escapeAdmin(item.reference || 'Yishyuwe')
                : '-'
          }
        </td>

      </tr>
    `).join('') || `
      <tr>
        <td colspan="6">Nta komisiyo iraboneka muri database.</td>
      </tr>
    `;

  } catch (error) {
    showTableMessage('commissionRows', error.message, 6);
    apiError(error);
  }
}


async function markCommissionPaid(id) {
  const reference = window.prompt(
    'Andika reference yâ€™ubwishyu umaze kugenzura ko amafaranga yageze kuri konti ya TikTak:'
  );

  if (reference === null) return;

  if (!reference.trim()) {
    toast('Reference yâ€™ubwishyu irakenewe.');
    return;
  }

  const confirmed = window.confirm(
    'Wagenzuye koko ko amafaranga yageze kuri konti ya TikTak?'
  );

  if (!confirmed) return;

  try {
    await TikTakAPI.request(
      `/admin/commissions/${encodeURIComponent(id)}/paid`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reference: reference.trim()
        })
      }
    );

    toast('Komisiyo yashyizweho ko yishyuwe.');

    await renderCommissions();
    await renderDashboard();

  } catch (error) {
    apiError(error);
  }
}


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();

  document.getElementById('analyticsPeriod')
    ?.addEventListener('change', renderAnalytics);

  const refreshButton = document.getElementById('refreshAnalytics');

  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      if (refreshButton.disabled) return;

      const originalLabel = refreshButton.textContent;
      refreshButton.disabled = true;
      refreshButton.textContent = 'Birimo kuvugurura...';

      try {
        await renderAnalytics();
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = originalLabel;
      }
    });
  }
});
/* =========================================================
   ADMIN CREATE LISTING FORM
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminListingForm');
  if (!form) return;

  const typeInput = document.getElementById('adminListingType');
  const countryInput = document.getElementById('adminListingCountry');
  const currencyInput = document.getElementById('adminListingCurrency');
  const houseFields = document.getElementById('adminHouseFields');
  const transactionInput = document.getElementById('adminTransactionType');
  const imagesInput = document.getElementById('adminListingImages');
  const videoInput = document.getElementById('adminListingVideo');
  const submitButton = document.getElementById('adminListingSubmit');

  const showMessage = (message) => {
    if (typeof toast === 'function') toast(message);
    else alert(message);
  };

  typeInput.addEventListener('change', () => {
    const isHouse = typeInput.value === 'HOUSE';
    houseFields.hidden = !isHouse;
    transactionInput.required = isHouse;

    if (!isHouse) transactionInput.value = '';
  });

  countryInput.addEventListener('change', () => {
    if (countryInput.value === 'Rwanda') currencyInput.value = 'RWF';
    else if (countryInput.value === 'Kenya') currencyInput.value = 'KES';
    else currencyInput.value = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (typeInput.value === 'HOUSE' && !transactionInput.value) {
      showMessage('Hitamo niba inzu ikodeshwa cyangwa igurishwa.');
      transactionInput.focus();
      return;
    }

    const selectedVideo = videoInput.files[0];

    if (selectedVideo && selectedVideo.size > 50 * 1024 * 1024) {
      showMessage('Video ntigomba kurenza 50MB.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Birimo kubikwa...';

    let listingCreated = false;

    try {
      const payload = Object.fromEntries(new FormData(form).entries());

      if (payload.type !== 'HOUSE') {
        payload.transactionType = 'SALE';
      }

      payload.price = Number(payload.price);

      const created = await TikTakAPI.request('/listings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const listingId = created.listing.id;
      listingCreated = true;

      const selectedImages = [...imagesInput.files];

      if (selectedImages.length > 0) {
        const imageData = new FormData();
        selectedImages.forEach(file => imageData.append('images', file));

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

      form.reset();
      houseFields.hidden = true;
      transactionInput.required = false;
      currencyInput.value = '';

      showMessage('Itangazo ryabitswe neza kandi ritegereje kwemezwa.');

      if (typeof renderListings === 'function') {
        await renderListings();
      }

    } catch (error) {
      if (listingCreated) {
        showMessage('Itangazo ryarabitswe, ariko kohereza amafoto cyangwa video byagize ikibazo. Banza urebe muri Listings.');
      } else {
        showMessage(error.message || 'Habaye ikibazo mu kubika itangazo.');
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Bika itangazo';
    }
  });
});

/* =========================================================
   ADMIN LISTING EDIT AND DELETE
========================================================= */

async function editAdminListing(id) {
  try {
    const listing = adminListings.find(item => item.id === id);

    if (!listing) {
      await getListings();
    }

    const item = adminListings.find(entry => entry.id === id);

    if (!item) {
      toast('Itangazo ntiribashije kuboneka.');
      return;
    }

    const value = (key) => item[key] ?? '';

    const formHtml = `
      <div class="tiktak-edit-overlay" id="tiktakEditOverlay">
        <div class="tiktak-edit-modal">
          <h2>Hindura itangazo</h2>
          <p>${escapeAdmin(item.code || '')}</p>

          <form id="tiktakEditForm">
            <label>Ubwoko
              <select name="type" required>
                <option value="HOUSE" ${value('type') === 'HOUSE' ? 'selected' : ''}>HOUSE</option>
                <option value="LAND" ${value('type') === 'LAND' ? 'selected' : ''}>LAND</option>
                <option value="CAR" ${value('type') === 'CAR' ? 'selected' : ''}>CAR</option>
              </select>
            </label>

            <label>Umutwe w'itangazo
              <input name="title" required minlength="5" maxlength="140" value="${escapeAdmin(value('title'))}">
            </label>

            <label>Igihugu
              <select name="country" required>
                <option value="Rwanda" ${value('country') === 'Rwanda' ? 'selected' : ''}>Rwanda</option>
                <option value="Kenya" ${value('country') === 'Kenya' ? 'selected' : ''}>Kenya</option>
              </select>
            </label>

            <label>Intara / County
              <input name="province" required value="${escapeAdmin(value('province'))}">
            </label>

            <label>Akarere / District
              <input name="district" required value="${escapeAdmin(value('district'))}">
            </label>

            <label>Umurenge / Ahantu
              <input name="locality" required value="${escapeAdmin(value('locality'))}">
            </label>

            <label>Igiciro
              <input name="price" type="number" min="0.01" step="any" required value="${escapeAdmin(value('price'))}">
            </label>

            <label>Ifaranga
              <select name="currency" required>
                <option value="RWF" ${value('currency') === 'RWF' ? 'selected' : ''}>RWF</option>
                <option value="KES" ${value('currency') === 'KES' ? 'selected' : ''}>KES</option>
              </select>
            </label>

            <label class="tiktak-edit-full">Ubukode cyangwa kugurisha
              <select name="transactionType" ${item.type === 'HOUSE' ? 'required' : 'disabled'}>
                <option value="RENT" ${value('transactionType') === 'RENT' ? 'selected' : ''}>For Rent</option>
                <option value="SALE" ${value('transactionType') === 'SALE' ? 'selected' : ''}>For Sale</option>
              </select>
            </label>

            <label class="tiktak-edit-full">Ibisobanuro
              <textarea name="description" required minlength="20" maxlength="5000">${escapeAdmin(value('description'))}</textarea>
            </label>

            <div class="tiktak-edit-actions">
              <button type="button" class="mini" id="tiktakEditCancel">Funga</button>
              <button type="submit" class="primary" id="tiktakEditSave">Bika impinduka</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('tiktakEditOverlay')?.remove();
    document.body.insertAdjacentHTML('beforeend', formHtml);

    const overlay = document.getElementById('tiktakEditOverlay');
    const form = document.getElementById('tiktakEditForm');
    const typeSelect = form.elements.type;
    const transactionSelect = form.elements.transactionType;

    typeSelect.addEventListener('change', () => {
      transactionSelect.disabled = typeSelect.value !== 'HOUSE';
      transactionSelect.required = typeSelect.value === 'HOUSE';

      if (typeSelect.value !== 'HOUSE') {
        transactionSelect.value = 'SALE';
      }
    });

    document.getElementById('tiktakEditCancel').onclick = () => overlay.remove();

    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const saveButton = document.getElementById('tiktakEditSave');
      saveButton.disabled = true;
      saveButton.textContent = 'Birimo kubikwa...';

      try {
        const payload = Object.fromEntries(new FormData(form).entries());

        if (payload.type !== 'HOUSE') {
          payload.transactionType = 'SALE';
        }

        payload.price = Number(payload.price);

        await TikTakAPI.request(`/admin/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });

        overlay.remove();
        toast('Itangazo ryahinduwe neza.');
        await renderListings();
        await renderDashboard();

      } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = 'Bika impinduka';
        apiError(error);
      }
    });

  } catch (error) {
    apiError(error);
  }
}


async function deleteAdminListing(id) {
  const item = adminListings.find(entry => entry.id === id);

  if (!item) {
    toast('Itangazo ntiribashije kuboneka.');
    return;
  }

  const confirmed = confirm(
    `Urifuza gusiba itangazo "${item.title}" (${item.code})?\n\nIki gikorwa ntigishobora gusubizwa inyuma.`
  );

  if (!confirmed) return;

  try {
    await TikTakAPI.request(`/admin/listings/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    toast('Itangazo ryasibwe neza.');
    await renderListings();
    await renderDashboard();

  } catch (error) {
    apiError(error);
  }
}
