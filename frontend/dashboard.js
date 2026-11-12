const buttons = [...document.querySelectorAll('.tabs button')];
const panes = [...document.querySelectorAll('.pane')];
buttons.forEach(button => button.addEventListener('click', () => {
  buttons.forEach(item => item.classList.toggle('active', item === button));
  panes.forEach(pane => pane.classList.toggle('active', pane.id === button.dataset.tab));
}));
document.getElementById('theme')?.addEventListener('click', () => document.body.classList.toggle('dark'));

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const readFavorites = () => { try { const data = JSON.parse(localStorage.getItem('tiktak-favorites') || '[]'); return Array.isArray(data) ? data.map(String) : []; } catch { return []; } };
const api = (path, options) => TikTakAPI.request(path, options);
function showMessage(text) {
  const box = document.getElementById('dashboardNotice');
  if (box) { box.textContent = text; box.hidden = false; }
}
(async () => {
  if (!TikTakAPI.token) {
    location.replace('account.html#login');
    return;
  }
  try {
    const [me, listings, deals, messages, publicData] = await Promise.all([
      api('/auth/me'), api('/listings/mine'), api('/deals'), api('/messages/mine'), api('/listings')
    ]);
    const mine = listings.listings || [];
    const offers = deals.deals || [];
    const inbox = messages.messages || [];
    const savedIds = readFavorites();
    const savedListings = (publicData.listings || []).filter(item => savedIds.includes(String(item.id)));
    document.getElementById('favCount').textContent = savedListings.length;
    document.getElementById('saved').innerHTML = `<h2>Amatangazo wabitse</h2>${savedListings.map(item => `<article class="account-item saved-item">${item.images?.[0]?.url ? `<img src="${esc(item.images[0].url)}" alt="${esc(item.title)}">` : ''}<div><b>${esc(item.title)}</b><span>${esc(item.code)} · ${esc(item.country)} · ${esc(item.currency)} ${Number(item.price).toLocaleString()}</span><button type="button" class="remove-saved" data-remove-saved="${esc(item.id)}">Kuramo mu byo nabitse</button></div></article>`).join('') || '<div class="empty"><b>Nta tangazo urabika</b><span>Subira ku matangazo uyabike kugira ngo uyasange hano.</span><a href="index.html#listings">Reba amatangazo →</a></div>'}`;
    document.getElementById('saved').addEventListener('click', event => { const button = event.target.closest('[data-remove-saved]'); if (!button) return; const next = readFavorites().filter(id => id !== button.dataset.removeSaved); localStorage.setItem('tiktak-favorites', JSON.stringify(next)); button.closest('.account-item').remove(); document.getElementById('favCount').textContent = next.length; if (!next.length) document.getElementById('saved').innerHTML = '<div class="empty"><b>Nta tangazo urabika</b><a href="index.html#listings">Reba amatangazo →</a></div>'; });
    document.getElementById('myListingCount').textContent = mine.length;
    document.getElementById('myOfferCount').textContent = offers.length;
    document.getElementById('myMessageCount').textContent = inbox.length;
    document.getElementById('myads').innerHTML = `<h2>Amatangazo nashyizeho</h2>${
      mine.map(item => `<article class="account-item"><b>${esc(item.title)}</b><span>${esc(item.code)} · ${esc(item.country)} · ${esc(item.currency)} ${Number(item.price).toLocaleString()}</span><small>Imiterere: ${esc(item.status)}</small></article>`).join('')
      || '<div class="empty">Nta tangazo urashyiraho. <a href="account.html">Shyiraho itangazo →</a></div>'}`;
    document.getElementById('requests').innerHTML = `<h2>Ubusabe bwanjye</h2>${
      offers.map(item => `<article class="account-item"><b>${esc(item.listing?.title)}</b><span>${esc(item.code)} · ${esc(item.currency)} ${Number(item.price).toLocaleString()}</span><small>Imiterere: ${esc(item.status)}</small></article>`).join('')
      || '<div class="empty">Nta busabe bwo kugura urafungura.</div>'}`;
    document.getElementById('messages').innerHTML = `<h2>Ubutumwa bwa TikTak</h2>
      <form id="customerMessageForm"><label>Ubutumwa<textarea name="body" required minlength="2" maxlength="5000" rows="4" placeholder="Andikira TikTak Admin..."></textarea></label><button class="primary" type="submit">Ohereza ubutumwa</button></form>
      <div id="customerMessageList">${inbox.map(message => `<article class="account-item"><b>${esc(message.subject || 'Ubutumwa')}</b><p>${esc(message.body)}</p><small>${new Date(message.createdAt).toLocaleString()}</small></article>`).join('') || '<p>Nta butumwa urabona.</p>'}</div>`;
    const contactListing = sessionStorage.getItem('tiktak-contact-listing');
    if (contactListing) {
      const messageBox = document.querySelector('#customerMessageForm textarea[name="body"]');
      if (messageBox && !messageBox.value) messageBox.value = `Muraho TikTak, ndifuza kumenya amakuru arambuye no kuganira ku giciro cy'itangazo: ${contactListing}.`;
      sessionStorage.removeItem('tiktak-contact-listing');
    }
    if (location.hash === '#messages') {
      document.querySelector('[data-tab="messages"]')?.click();
      document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.getElementById('customerMessageForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const body = new FormData(form).get('body');
      try {
        await api('/messages', { method: 'POST', body: JSON.stringify({ body }) });
        form.reset();
        showMessage('Ubutumwa bwoherejwe kuri TikTak Admin.');
        const updated = await api('/messages/mine');
        document.getElementById('myMessageCount').textContent = updated.messages.length;
        document.getElementById('customerMessageList').innerHTML = updated.messages.map(message =>
          `<article class="account-item"><b>${esc(message.subject || 'Ubutumwa')}</b><p>${esc(message.body)}</p><small>${new Date(message.createdAt).toLocaleString()}</small></article>`
        ).join('');
      } catch (error) { showMessage(error.message); }
    });
    document.querySelector('.hero p').textContent = `Murakaza neza, ${me.user.fullName}. Hano ucungira ibikorwa byawe kuri TikTak.`;
  } catch (error) {
    showMessage(error.message);
  }
})();
