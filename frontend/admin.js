const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const titles = {
  overview: "Incamake y'ubucuruzi", listings: "Gucunga amatangazo",
  requests: "Ibyifuzo by'abaguzi", clients: "Abakiriya",
  deals: "Amasezerano y'ubucuruzi", commissions: "Komisiyo ya TikTak",
  messages: "Ubutumwa bwa TikTak", images: "Amafoto y'amatangazo",
  reports: "Raporo n'isesengura"
};
let adminUser = null;
let allListings = [];
let allDeals = [];
let allUsers = [];
let allCommissions = [];
let allMessages = [];
let allImages = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function money(value, currency = '') {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`.trim();
}
function toast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.tikTakToastTimer);
  window.tikTakToastTimer = setTimeout(() => element.classList.remove('show'), 3500);
}
function statusLabel(status) {
  return ({
    PENDING: 'Isuzumwa', APPROVED: 'Riri ku rubuga', REJECTED: 'Ryanzwe',
    PAUSED: 'Ryahagaritswe', SOLD: 'Ryaragurishijwe',
    INTERESTED: 'Interested', NEGOTIATION: 'Negotiation',
    SALE_AGREEMENT: 'Sale Agreement', SALE_COMPLETED: 'Sale Completed',
    DISPUTED: 'Disputed', PAID: 'Yishyuwe', WAIVED: 'Yakuweho'
  })[status] || status || '—';
}
function showPage(id) {
  $$('.page').forEach(page => page.classList.toggle('active', page.id === id));
  $$('.nav[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === id));
  if ($('#pageTitle')) $('#pageTitle').textContent = titles[id] || 'TikTak Admin';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const loaders = {
    overview: loadOverview, listings: loadListings, requests: loadRequests,
    clients: loadClients, deals: loadDeals, commissions: loadCommissions,
    messages: loadMessages, images: loadImages, reports: loadReports
  };
  loaders[id]?.();
}
window.showPage = showPage;

async function api(path, options) {
  return TikTakAPI.request(path, options);
}
async function verifyAdmin() {
  if (!TikTakAPI.token) {
    location.replace('account.html#login');
    return false;
  }
  try {
    const response = await api('/auth/me');
    adminUser = response.user;
    if (adminUser?.role !== 'ADMIN') {
      TikTakAPI.clearSession();
      alert('Iyi konti ntabwo ifite uburenganzira bwa Admin. Injira ukoresheje konti ya Admin.');
      location.replace('account.html#login');
      return false;
    }
    $('#adminIdentity').textContent = `${adminUser.fullName} · ADMIN`;
    $('#adminAvatar').textContent = String(adminUser.fullName || 'A').charAt(0).toUpperCase();
    $('#systemStatus').textContent = '● Backend ihujwe';
    return true;
  } catch (error) {
    $('#systemStatus').textContent = 'Backend ntihujwe';
    toast(error.message);
    if (/Authentication required|Invalid or expired token|Ongera winjire/i.test(error.message)) {
      TikTakAPI.clearSession();
      setTimeout(() => location.replace('account.html#login'), 900);
    }
    return false;
  }
}

async function loadOverview() {
  $('#overviewConnection').textContent = 'Tegereza...';
  try {
    const [summary, listingData] = await Promise.all([
      api('/admin/overview'), api('/admin/listings')
    ]);
    allListings = listingData.listings || [];
    $('#statListings').textContent = Number(summary.listings || 0).toLocaleString();
    $('#statPending').textContent = Number(summary.pendingListings || 0).toLocaleString();
    $('#statUsers').textContent = Number(summary.users || 0).toLocaleString();
    $('#statDeals').textContent = Number(summary.completedDeals || 0).toLocaleString();
    const commissionGroups = summary.commissions || [];
    $('#overviewCommissions').innerHTML = commissionGroups.length
      ? commissionGroups.map(group => `<div class="market"><div><span>${escapeHtml(group.currency)} · ${escapeHtml(group.status)}</span><b>${money(group._sum?.amount, group.currency)}</b></div></div>`).join('')
      : '<p>Nta komisiyo iraboneka.</p>';
    $('#overviewConnection').textContent = 'Backend na PostgreSQL birakora. Amakuru agaragara ava muri database.';
    $('#overviewListingRows').innerHTML = allListings.slice(0, 6).map(item => `
      <tr><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml([item.locality, item.district, item.country].filter(Boolean).join(', '))}</td>
      <td>${money(item.price, item.currency)}</td><td>${escapeHtml(statusLabel(item.status))}</td></tr>
    `).join('') || '<tr><td colspan="5">Nta tangazo riraboneka.</td></tr>';
  } catch (error) {
    $('#overviewConnection').textContent = error.message;
    $('#overviewListingRows').innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
    toast(error.message);
  }
}

async function loadListings() {
  const body = $('#listingRows');
  body.innerHTML = '<tr><td colspan="7">Tegereza...</td></tr>';
  try {
    const data = await api('/admin/listings');
    allListings = data.listings || [];
    renderListings();
    $('#listingStatus').textContent = `Amatangazo ${allListings.length} abitswe muri database.`;
  } catch (error) {
    body.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    $('#listingStatus').textContent = 'Reba ko winjiye nka Admin kandi backend ikora.';
  }
}
function renderListings() {
  const query = ($('#listingSearch').value || '').toLowerCase();
  const status = $('#listingFilter').value;
  const country = $('#listingCountry').value;
  const rows = allListings.filter(item =>
    (status === 'all' || item.status === status) &&
    (country === 'all' || item.country === country) &&
    `${item.code} ${item.title} ${item.locality} ${item.district} ${item.province}`.toLowerCase().includes(query)
  );
  $('#listingRows').innerHTML = rows.map(item => {
    const actions = [];
    if (item.status === 'PENDING') {
      actions.push(`<button class="mini success" onclick="listingAction('${item.id}','APPROVED')">Emeza</button>`);
      actions.push(`<button class="mini danger" onclick="listingAction('${item.id}','REJECTED')">Anga</button>`);
    }
    if (item.status === 'APPROVED') actions.push(`<button class="mini danger" onclick="listingAction('${item.id}','PAUSED')">Hagarika</button>`);
    if (item.status === 'PAUSED') actions.push(`<button class="mini success" onclick="listingAction('${item.id}','APPROVED')">Subizaho</button>`);
    const firstImage = item.images?.[0];
    const imageCell = firstImage?.url
      ? `<a class="listing-thumb-link" href="${escapeHtml(firstImage.url)}" target="_blank" rel="noopener" title="Fungura ifoto nini"><img class="listing-thumb" src="${escapeHtml(firstImage.url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.closest('a').replaceWith(Object.assign(document.createElement('span'),{className:'muted',textContent:'Ifoto ntiyafungutse'}))"></a>`
      : '<span class="muted">Nta foto</span>';
    return `<tr><td>${escapeHtml(item.code)}</td><td>${imageCell}</td><td>${escapeHtml(item.title)}<br><small>${escapeHtml(item.type)}</small></td>
      <td>${money(item.price, item.currency)}</td><td>${escapeHtml([item.locality, item.district, item.province, item.country].filter(Boolean).join(', '))}</td>
      <td><span class="pill ${item.status === 'APPROVED' ? 'live' : 'pending'}">${escapeHtml(item.status === 'PENDING' ? 'Itegerejwe' : statusLabel(item.status))}</span></td>
      <td><div class="row-actions">${actions.join(' ') || '—'}</div></td></tr>`;
  }).join('') || '<tr><td colspan="7">Nta tangazo rihuye n’ishakisha.</td></tr>';
}
async function listingAction(id, status) {
  try {
    await api(`/admin/listings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status })
    });
    toast('Imiterere y’itangazo yahinduwe muri database.');
    await loadListings();
  } catch (error) { toast(error.message); }
}
window.listingAction = listingAction;

async function loadDeals() {
  $('#dealRows').innerHTML = '<tr><td colspan="6">Tegereza...</td></tr>';
  try {
    const data = await api('/deals');
    allDeals = data.deals || [];
    renderDeals();
  } catch (error) {
    $('#dealRows').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
  }
}
function renderDeals() {
  const query = ($('#dealSearch').value || '').toLowerCase();
  const status = $('#dealFilter').value;
  const rows = allDeals.filter(deal =>
    (status === 'all' || deal.status === status) &&
    `${deal.code} ${deal.listing?.title} ${deal.buyer?.fullName} ${deal.seller?.fullName}`.toLowerCase().includes(query)
  );
  $('#dealRows').innerHTML = rows.map(deal => `
    <tr><td>${escapeHtml(deal.code)}</td><td>${escapeHtml(deal.listing?.title)}</td>
    <td>${escapeHtml(deal.buyer?.fullName)}</td><td>${money(deal.price, deal.currency)}</td>
    <td>${money(deal.commissionAmount, deal.currency)}</td><td>
    <select aria-label="Hindura status ya deal" onchange="changeDeal('${deal.id}',this.value)">
      ${['INTERESTED','NEGOTIATION','SALE_AGREEMENT','SALE_COMPLETED','DISPUTED'].map(value =>
        `<option value="${value}" ${value === deal.status ? 'selected' : ''}>${escapeHtml(statusLabel(value))}</option>`
      ).join('')}
    </select></td></tr>`).join('') || '<tr><td colspan="6">Nta masezerano araboneka.</td></tr>';
}
async function changeDeal(id, status) {
  if (status === 'SALE_COMPLETED' && !confirm('Uremeza ko igurisha ryarangiye koko? Ibi bizashyira itangazo kuri SOLD kandi bibare komisiyo ya 5%.')) {
    await loadDeals();
    return;
  }
  try {
    await api(`/deals/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status })
    });
    toast('Amasezerano yahinduwe muri database.');
    await loadDeals();
  } catch (error) { toast(error.message); await loadDeals(); }
}
window.changeDeal = changeDeal;

async function loadRequests() {
  $('#requestRows').innerHTML = '<tr><td colspan="6">Tegereza...</td></tr>';
  try {
    const data = await api('/deals');
    allDeals = data.deals || [];
    const query = ($('#requestSearch').value || '').toLowerCase();
    const status = $('#requestFilter').value;
    const rows = allDeals.filter(deal =>
      (status === 'all' || deal.status === status) &&
      `${deal.code} ${deal.listing?.title} ${deal.buyer?.fullName} ${deal.seller?.fullName}`.toLowerCase().includes(query)
    );
    $('#requestRows').innerHTML = rows.map(deal => `
      <tr><td>${escapeHtml(deal.code)}</td><td>${escapeHtml(deal.listing?.title)}</td>
      <td>${escapeHtml(deal.buyer?.fullName)}</td><td>${escapeHtml(deal.seller?.fullName)}</td>
      <td>${money(deal.price, deal.currency)}</td><td>${escapeHtml(statusLabel(deal.status))}</td></tr>
    `).join('') || '<tr><td colspan="6">Nta byifuzo by’uguze biraboneka.</td></tr>';
    $('#requestStatus').textContent = `Ibyifuzo ${rows.length} bigaragara muri database.`;
  } catch (error) {
    $('#requestRows').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    $('#requestStatus').textContent = '';
  }
}

async function loadClients() {
  $('#clientRows').innerHTML = '<tr><td colspan="6">Tegereza...</td></tr>';
  try {
    const data = await api('/admin/users');
    allUsers = data.users || [];
    renderClients();
    $('#clientStatus').textContent = `Abakiriya ${allUsers.length} babonetse muri database.`;
  } catch (error) {
    $('#clientRows').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    $('#clientStatus').textContent = '';
  }
}
function renderClients() {
  const query = ($('#clientSearch').value || '').toLowerCase();
  const role = $('#clientRole').value;
  const rows = allUsers.filter(user =>
    (role === 'all' || user.role === role) &&
    `${user.fullName} ${user.contact} ${user.country}`.toLowerCase().includes(query)
  );
  $('#clientRows').innerHTML = rows.map(user => `
    <tr><td>${escapeHtml(user.fullName)}</td><td>${escapeHtml(user.contact)}</td>
    <td>${escapeHtml(user.country)}</td><td>${escapeHtml(user.role)}</td>
    <td><span class="pill ${user.isActive ? 'live' : 'pending'}">${user.isActive ? 'Active' : 'Disabled'}</span></td>
    <td><button class="mini ${user.isActive ? 'danger' : 'success'}" onclick="toggleClient('${user.id}',${!user.isActive})">${user.isActive ? 'Hagarika' : 'Fungura'}</button></td></tr>
  `).join('') || '<tr><td colspan="6">Nta mukiriya ubonetse.</td></tr>';
}
async function toggleClient(id, isActive) {
  try {
    await api(`/admin/users/${encodeURIComponent(id)}/active`, {
      method: 'PATCH', body: JSON.stringify({ isActive })
    });
    toast('Konti yahinduwe neza.');
    await loadClients();
  } catch (error) { toast(error.message); }
}
window.toggleClient = toggleClient;

async function loadCommissions() {
  $('#commissionRows').innerHTML = '<tr><td colspan="6">Tegereza...</td></tr>';
  try {
    const data = await api('/admin/commissions');
    allCommissions = data.commissions || [];
    const totals = { PENDING: { RWF: 0, KES: 0 }, PAID: { RWF: 0, KES: 0 } };
    allCommissions.forEach(item => {
      if (totals[item.status]?.[item.currency] !== undefined) {
        totals[item.status][item.currency] += Number(item.amount || 0);
      }
    });
    $('#commissionPendingRwf').textContent = money(totals.PENDING.RWF);
    $('#commissionPendingKes').textContent = money(totals.PENDING.KES);
    $('#commissionPaidRwf').textContent = money(totals.PAID.RWF);
    $('#commissionPaidKes').textContent = money(totals.PAID.KES);
    $('#commissionRows').innerHTML = allCommissions.map(item => `
      <tr><td>${escapeHtml(item.deal?.code)}</td><td>${escapeHtml(item.deal?.listing?.title)}</td>
      <td>${escapeHtml(item.deal?.seller?.fullName)}</td><td>${money(item.amount, item.currency)}</td>
      <td><span class="pill ${item.status === 'PAID' ? 'live' : 'pending'}">${escapeHtml(item.status === 'PENDING' ? 'Itegerejwe' : statusLabel(item.status))}</span></td>
      <td>${item.status === 'PENDING'
        ? `<button class="mini success" onclick="markCommissionPaid('${item.id}')">Emeza ko yishyuwe</button>`
        : escapeHtml(item.reference || '—')}</td></tr>
    `).join('') || '<tr><td colspan="6">Nta komisiyo iraboneka.</td></tr>';
  } catch (error) {
    $('#commissionRows').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
  }
}
async function markCommissionPaid(id) {
  const reference = prompt('Andika reference y’ubwishyu umaze kugenzura ko amafaranga yageze:');
  if (!reference?.trim()) return;
  try {
    await api(`/admin/commissions/${encodeURIComponent(id)}/paid`, {
      method: 'PATCH', body: JSON.stringify({ reference: reference.trim() })
    });
    toast('Komisiyo yanditswe ko yishyuwe.');
    await loadCommissions();
  } catch (error) { toast(error.message); }
}
window.markCommissionPaid = markCommissionPaid;

async function loadMessages() {
  $('#messageRows').textContent = 'Tegereza...';
  try {
    const data = await api('/messages');
    allMessages = data.messages || [];
    const grouped = new Map();
    allMessages.forEach(message => {
      const key = message.userId;
      if (!grouped.has(key)) grouped.set(key, { user: message.user, messages: [] });
      grouped.get(key).messages.push(message);
    });
    $('#messageRows').innerHTML = [...grouped.entries()].map(([userId, thread]) => `
      <article class="message-thread panel">
        <h3>${escapeHtml(thread.user?.fullName)} · ${escapeHtml(thread.user?.contact)}</h3>
        <small>${escapeHtml(thread.user?.country)}</small>
        <div class="chat-messages">${thread.messages.map(message => `
          <div class="bubble ${message.subject === 'Igisubizo cya TikTak Admin' ? 'admin' : ''}">
            ${escapeHtml(message.body)}<small>${escapeHtml(new Date(message.createdAt).toLocaleString())}</small>
          </div>`).join('')}</div>
        <form class="reply-form" onsubmit="replyToUser(event,'${userId}')">
          <input name="body" required minlength="2" maxlength="5000" placeholder="Andika igisubizo umukiriya azabona...">
          <button class="primary" type="submit">Ohereza</button>
        </form>
      </article>
    `).join('') || '<div class="empty-state">Nta butumwa bw’abakiriya buraboneka.</div>';
    $('#messageStatus').textContent = `Ubutumwa ${allMessages.length} bubitswe muri database.`;
  } catch (error) {
    $('#messageRows').textContent = error.message;
    $('#messageStatus').textContent = '';
  }
}
async function replyToUser(event, userId) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = new FormData(form).get('body');
  try {
    await api(`/messages/${encodeURIComponent(userId)}/reply`, {
      method: 'POST', body: JSON.stringify({ body })
    });
    toast('Igisubizo cyoherejwe muri konti y’umukiriya.');
    await loadMessages();
  } catch (error) { toast(error.message); }
}
window.replyToUser = replyToUser;

async function loadImages() {
  $('#imageRows').innerHTML = '<tr><td colspan="4">Tegereza...</td></tr>';
  try {
    const data = await api('/admin/images');
    allImages = data.images || [];
    $('#imageRows').innerHTML = allImages.map(image => `
      <tr><td><a href="${escapeHtml(image.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(image.url)}" alt="Listing" style="width:90px;height:65px;object-fit:cover;border-radius:8px"></a></td>
      <td>${escapeHtml(image.listing?.code)} · ${escapeHtml(image.listing?.title)}</td>
      <td>${escapeHtml(image.format || 'image')}</td>
      <td><button class="mini danger" onclick="deleteImage('${image.id}')">Siba ifoto</button></td></tr>
    `).join('') || '<tr><td colspan="4">Nta foto ibitswe.</td></tr>';
    $('#imageStatus').textContent = `Amafoto ${allImages.length} abitswe.`;
  } catch (error) {
    $('#imageRows').innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}
async function deleteImage(id) {
  if (!confirm('Uremeza ko ushaka gusiba iyi foto muri Cloudinary no muri database?')) return;
  try {
    await api(`/admin/images/${encodeURIComponent(id)}`, { method: 'DELETE' });
    toast('Ifoto yasibwe.');
    await loadImages();
  } catch (error) { toast(error.message); }
}
window.deleteImage = deleteImage;

async function loadReports() {
  $('#reportContent').textContent = 'Tegereza...';
  try {
    const [overview, users, listings, deals] = await Promise.all([
      api('/admin/overview'), api('/admin/users'), api('/admin/listings'), api('/deals')
    ]);
    const countries = {};
    (listings.listings || []).forEach(item => { countries[item.country] = (countries[item.country] || 0) + 1; });
    $('#reportContent').innerHTML = `
      <p><b>Abakiriya:</b> ${overview.users}</p>
      <p><b>Amatangazo:</b> ${overview.listings}</p>
      <p><b>Asuzumwa:</b> ${overview.pendingListings}</p>
      <p><b>Amasezerano:</b> ${(deals.deals || []).length}</p>
      <p><b>Abakiriya bakora:</b> ${(users.users || []).filter(user => user.isActive).length}</p>
      <p><b>Rwanda:</b> ${countries.Rwanda || 0} · <b>Kenya:</b> ${countries.Kenya || 0}</p>
    `;
  } catch (error) { $('#reportContent').textContent = error.message; }
}

$$('.nav[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$('#logoutButton')?.addEventListener('click', () => {
  TikTakAPI.clearSession();
  location.replace('account.html#login');
});
['listingSearch', 'listingFilter', 'listingCountry'].forEach(id => $(`#${id}`)?.addEventListener('input', renderListings));
['dealSearch', 'dealFilter'].forEach(id => $(`#${id}`)?.addEventListener('input', renderDeals));
['requestSearch', 'requestFilter'].forEach(id => $(`#${id}`)?.addEventListener('input', loadRequests));
['clientSearch', 'clientRole'].forEach(id => $(`#${id}`)?.addEventListener('input', renderClients));

(async () => {
  const allowed = await verifyAdmin();
  if (allowed) await loadOverview();
})();
