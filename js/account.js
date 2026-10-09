(function () {
  'use strict';
  const App = window.KarameliaApp;
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];

  const authView = $('#authView');
  const customerView = $('#customerView');
  const adminView = $('#adminView');
  const authForm = $('#authForm');
  const authModeInput = $('#authMode');
  const authNameField = $('#authNameField');
  const authTitle = $('#authTitle');
  const authSubtitle = $('#authSubtitle');
  const authSubmit = $('#authSubmit');
  const authQuestion = $('#authQuestion');
  const authSwitchButtons = $$('.auth-switch button');
  const authMessage = $('#authMessage');
  const headerProfileLabel = $('#headerProfileLabel');
  const toast = $('#toast');
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function setAuthMessage(text, kind='error') {
    authMessage.textContent = text;
    authMessage.className = 'auth-error is-visible';
    authMessage.dataset.kind = kind;
    if (kind === 'success') authMessage.className = 'auth-success is-visible';
  }

  function switchMode(mode) {
    authModeInput.value = mode;
    authSwitchButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.mode === mode));
    const registration = mode === 'register';
    authNameField.hidden = !registration;
    authTitle.innerHTML = registration ? 'Присоединяйся <em>к нам.</em>' : 'Начни путешествие <em>во вкус.</em>';
    authSubtitle.textContent = registration
      ? 'Создайте личный кабинет, чтобы сохранять любимые десерты и оформлять заказы в несколько шагов.'
      : 'Войдите в личный кабинет, чтобы видеть заказы, избранные вкусы и быстро оформлять новые покупки.';
    authSubmit.textContent = registration ? 'Создать аккаунт' : 'Войти';
    authQuestion.innerHTML = registration ? 'Есть аккаунт? <button type="button" data-switch="login">Войти</button>' : 'Нет аккаунта? <button type="button" data-switch="register">Зарегистрироваться</button>';
    authMessage.className = 'auth-error';
  }

  function renderAvatar(user) {
    const avatar = $('#customerAvatar');
    if (!avatar) return;
    avatar.src = user.avatar || 'assets/hero/hero-icon-cakes.png';
  }

  function renderCustomer(user) {
    $('#customerName').textContent = user.fio || 'Клиент';
    $('#customerRole').textContent = 'Клиент';
    $('#infoName').value = user.fio || '';
    $('#infoEmail').value = user.email || '';
    $('#infoPhone').value = user.phone || '';
    $('#infoAddress').value = user.address || '';
    $('#infoCity').value = user.city || '';
    $('#infoBirth').value = user.birthDate || '';
    $('#infoPreferences').value = user.preferences || '';
    $('#settingsEmail').textContent = user.email || '—';
    renderAvatar(user);

    const state = App.read();
    const mine = (state.orders || []).filter(o => o.userId === user.id);
    const favorites = (state.favorites || []).filter(id => (state.products || []).some(p => p.id === id));
    $('#statOrders').textContent = mine.length;
    $('#statFavorites').textContent = favorites.length;
    $('#statPaid').textContent = mine.filter(o => o.paymentStatus === 'Оплачено').length;
    $('#statReviews').textContent = (state.reviews || []).filter(r => r.userId === user.id).length;
    renderOrders(user, mine);
    renderFavorites(state, favorites);
    renderReviews(state, user);
  }

function renderOrders(user, orders) {
  const list = $('#ordersList');
  if (!orders.length) {
    list.innerHTML = '<div class="settings-card"><h3>Пока без заказов</h3><p>Здесь появятся ваши оформленные заказы и их текущий статус.</p><a class="btn-dark" href="catalog.html">Перейти в каталог</a></div>';
    return;
  }

  list.innerHTML = orders.slice().reverse().map(o => {
    const delivered = o.status === 'Доставлен';
    // безопасно: если reviewsByOrder нет — просто считаем, что отзыва нет
    const existing = delivered && typeof App.reviewsByOrder === 'function'
      ? App.reviewsByOrder(user.id, o.id)
      : null;

    const reviewBtn = delivered
      ? existing
        ? `<button class="review-btn is-done" type="button" disabled>Отзыв оставлен ★ ${existing.rating}</button>`
        : `<button class="review-btn" type="button" data-write-review="${escapeHtml(o.id)}">Оставить отзыв</button>`
      : '';

    return `
      <div class="order-row">
        <strong>${escapeHtml(o.title || 'Заказ')}</strong>
        <span>${new Date(o.createdAt).toLocaleDateString('ru-RU')} · ${escapeHtml(o.total)} ₽</span>
        <span>${escapeHtml(o.paymentStatus || 'Не оплачено')}</span>
        <span class="status-pill">${escapeHtml(o.status || 'Готовится')}</span>
        ${reviewBtn}
      </div>
    `;
  }).join('');
}
 function renderFavorites(state, ids) {
  const grid = $('#favoritesGrid');
  const items = (state.products || []).filter(p => ids.includes(p.id)).slice(0, 6);
  if (!items.length) {
    grid.innerHTML = '<div class="settings-card"><h3>Избранное пока пусто</h3><p>Добавляйте десерты сердечком в каталоге, чтобы собирать собственную подборку.</p><a class="btn-dark" href="catalog.html">Открыть вкусности</a></div>';
    return;
  }
  grid.innerHTML = items.map(p => `
    <article class="favorite-card">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.src='assets/hero/hero-cake.png'">
      <div class="favorite-card__body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.price)} ₽</p>
      </div>
    </article>
  `).join('');
}
  function renderReviews(state, user) {
    const list = $('#reviewsList');
    const rows = (state.reviews || []).filter(r => r.userId === user.id);
    if (!rows.length) {
      list.innerHTML = '<div class="settings-card"><h3>Ваших отзывов пока нет</h3><p>После оплаты товара здесь появится возможность поделиться впечатлениями. Если администратор ответит, ответ Карамелии будет показан прямо под вашим отзывом.</p></div>';
      return;
    }
    list.innerHTML = rows.map(r => `<article class="review-card"><div class="review-top"><strong>${escapeHtml(r.productName)}</strong><span class="review-stars">${'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}</span></div><p>${escapeHtml(r.text)}</p>${r.adminReply ? `<div class="review-response"><strong>Ответ Карамелии:</strong> ${escapeHtml(r.adminReply)}</div>` : ''}</article>`).join('');
  }

  function activateCustomerPanel(panel) {
    $$('.dashboard-nav button').forEach(b => b.classList.toggle('is-active', b.dataset.panel === panel));
    $$('.view-panel', customerView).forEach(v => v.classList.toggle('is-active', v.id === `panel-${panel}`));
    $$('.profile-links button').forEach(b => b.classList.toggle('is-active', b.dataset.panel === panel));
    const titles = {
      personal: 'Личная информация',
      orders: 'Мои заказы',
      favorites: 'Избранные вкусности',
      reviews: 'Мои отзывы',
      settings: 'Настройки'
    };
    $('#customerPanelTitle').textContent = titles[panel] || titles.personal;
  }

  function showAuth() {
    authView.hidden = false;
    customerView.hidden = true;
    adminView.hidden = true;
    document.body.classList.remove('admin-page');
    if (headerProfileLabel) headerProfileLabel.textContent = 'Профиль';
  }

  function showCustomer(user) {
    authView.hidden = true;
    customerView.hidden = false;
    adminView.hidden = true;
    document.body.classList.remove('admin-page');
    if (headerProfileLabel) headerProfileLabel.textContent = user.fio.split(' ')[0] || 'Профиль';
    renderCustomer(user);
    activateCustomerPanel('personal');
  }

  function showAdmin(user) {
    authView.hidden = true;
    customerView.hidden = true;
    adminView.hidden = false;
    document.body.classList.add('admin-page');
    if (headerProfileLabel) headerProfileLabel.textContent = 'Администратор';
    $('#adminName').textContent = user.fio;
    renderAdminProducts();
    renderAdminOrders();
    renderAdminReviews();
    renderAdminUsers();
    activateAdminTab('products');
  }

function renderAdminProducts() {
  // перечитываем из localStorage каждый раз — не полагаемся на кэш
  const products = App.products();
  const counter = document.getElementById('adminProductCount');
  if (counter) counter.textContent = products.length;

  const grid = document.getElementById('adminProductsGrid');
  if (!grid) return;

  grid.innerHTML = products.map(p => `
    <article class="admin-product">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
      <div class="admin-product__body">
        <div class="admin-product__top">
          <div>
            <span class="admin-product__category">${escapeHtml(p.category)}</span>
            <h3>${escapeHtml(p.name)}</h3>
          </div>
          <strong>${escapeHtml(p.price)} ₽</strong>
        </div>
        <p>${escapeHtml(p.description)}</p>
        <div class="admin-product__actions">
          <button class="btn-outline" type="button" data-delete-product="${escapeHtml(p.id)}">Удалить</button>
        </div>
      </div>
    </article>
  `).join('');
}

  function renderAdminOrders() {
    const state = App.read();
    const rows = state.orders || [];
    $('#adminOrdersBody').innerHTML = rows.length ? rows.slice().reverse().map(o => {
      const customer = (state.users || []).find(u => u.id === o.userId);
      return `<tr><td>${escapeHtml(customer?.fio || 'Пользователь')}</td><td>${escapeHtml(o.title || 'Заказ')}</td><td>${escapeHtml(o.total)} ₽</td><td>${new Date(o.createdAt).toLocaleDateString('ru-RU')}</td><td><select data-order-status="${escapeHtml(o.id)}"><option ${o.status==='Готовится'?'selected':''}>Готовится</option><option ${o.status==='В пути'?'selected':''}>В пути</option><option ${o.status==='Доставлен'?'selected':''}>Доставлен</option></select></td><td>${escapeHtml(o.paymentStatus || 'Не оплачено')}</td></tr>`;
    }).join('') : '<tr><td colspan="6">Заказов пока нет.</td></tr>';
  }

  function renderAdminReviews() {
    const state = App.read();
    $('#adminReviewsBody').innerHTML = (state.reviews || []).length ? state.reviews.slice().reverse().map(r => {
      const user = (state.users || []).find(u => u.id === r.userId);
      return `<tr><td>${escapeHtml(user?.fio || 'Пользователь')}</td><td>${escapeHtml(r.productName)}</td><td>${escapeHtml(r.text)}</td><td><button class="btn-outline" type="button" data-reply-review="${escapeHtml(r.id)}">${r.adminReply ? 'Изменить ответ' : 'Ответить'}</button></td></tr>`;
    }).join('') : '<tr><td colspan="4">Отзывы пока не оставляли.</td></tr>';
  }

  function renderAdminUsers() {
    const state = App.read();
    const users = state.users || [];
    $('#adminUsersBody').innerHTML = users.map(u => `<tr><td>${escapeHtml(u.fio)}</td><td>${escapeHtml(u.email)}</td><td>${u.role === 'admin' ? 'Администратор' : 'Клиент'}</td><td>${escapeHtml(u.phone || '—')}</td></tr>`).join('');
  }

  function activateAdminTab(tab) {
    $$('.admin-tabs button').forEach(b => b.classList.toggle('is-active', b.dataset.adminTab === tab));
    $$('.admin-tab-panel').forEach(v => v.hidden = v.id !== `admin-panel-${tab}`);
  }

  function fillLoggedIn() {
    const user = App.currentUser();
    if (!user) return showAuth();
    if (user.role === 'admin') return showAdmin(user);
    showCustomer(user);
  }

  // auth
  authSwitchButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
  document.addEventListener('click', e => {
    const switcher = e.target.closest('[data-switch]');
    if (switcher) { e.preventDefault(); switchMode(switcher.dataset.switch); }
  });

  $('#passwordToggle').addEventListener('click', () => {
    const input = $('#authPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  authForm.addEventListener('submit', e => {
    e.preventDefault();
    const mode = authModeInput.value;
    const formData = new FormData(authForm);
    const result = mode === 'register'
      ? App.register({ fio:String(formData.get('fio') || ''), email:String(formData.get('email') || ''), password:String(formData.get('password') || '') })
      : App.login({ email:String(formData.get('email') || ''), password:String(formData.get('password') || '') });
    if (!result.ok) return setAuthMessage(result.message);
    authForm.reset();
    showToast(mode === 'register' ? 'Аккаунт создан. Добро пожаловать в Карамелию.' : (result.user.role === 'admin' ? 'Вы вошли в панель администратора.' : 'Вы вошли в личный кабинет.'));
    fillLoggedIn();
  });

  // customer navigation
  $$('.dashboard-nav button, .profile-links button').forEach(btn => {
    btn.addEventListener('click', () => {
      // выход
      if (btn.dataset.action === 'logout') {
        App.logout();
        showToast('Вы вышли из аккаунта.');
        showAuth();
        switchMode('login');
        return;
      }
      // аватар
      if (btn.dataset.action === 'avatar') {
        $('#avatarInput').click();
        return;
      }
      // админский раздел (кнопки в dashboard-nav с data-admin-tab)
      if (btn.dataset.adminTab) {
        activateAdminTab(btn.dataset.adminTab);
        return;
      }
      // клиентский раздел
      activateCustomerPanel(btn.dataset.panel || 'personal');
    });
  });

  $('#infoForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = App.currentUser();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const updated = App.updateUser(user.id, {
      fio:String(form.get('fio') || ''), phone:String(form.get('phone') || ''), address:String(form.get('address') || ''), city:String(form.get('city') || ''), birthDate:String(form.get('birthDate') || ''), preferences:String(form.get('preferences') || '')
    });
    renderCustomer(updated);
    $('#settingsEmail').textContent = updated.email || '—';
    showToast('Личные данные сохранены.');
  });

  $('#infoReset').addEventListener('click', () => { const user = App.currentUser(); if (user) renderCustomer(user); });

  $('.avatar-edit').addEventListener('click', () => $('#avatarInput').click());

  $('#avatarInput').addEventListener('change', e => {
    const file = e.target.files?.[0];
    const user = App.currentUser();
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const updated = App.updateUser(user.id, { avatar:reader.result });
      renderCustomer(updated);
      showToast('Аватар обновлён.');
    };
    reader.readAsDataURL(file);
  });

  // admin navigation
  $$('.admin-tabs button').forEach(btn => btn.addEventListener('click', () => activateAdminTab(btn.dataset.adminTab)));

  $('#openAddProduct').addEventListener('click', () => openModal('productModal'));
  $('#productForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get('image');
    const save = image => {
      App.addProduct({ category:String(data.get('category')||''), name:String(data.get('name')||''), description:String(data.get('description')||''), price:Number(data.get('price')||0), image:image || 'assets/hero/hero-cake.png' });
      form.reset(); closeModal('productModal'); renderAdminProducts(); showToast('Новая позиция добавлена в каталог.');
    };
    if (file && file instanceof File && file.size) {
      const reader = new FileReader();
      reader.onload = () => save(reader.result);
      reader.readAsDataURL(file);
    } else save('assets/hero/hero-cake.png');
  });

  document.addEventListener('click', e => {
    const del = e.target.closest('[data-delete-product]');
    if (del) {
      $('#deleteProductId').value = del.dataset.deleteProduct;
      openModal('deleteModal');
      return;
    }
    const reply = e.target.closest('[data-reply-review]');
    if (reply) {
      $('#replyReviewId').value = reply.dataset.replyReview;
      const state = App.read();
      const review = (state.reviews || []).find(r => r.id === reply.dataset.replyReview);
      $('#replyText').value = review?.adminReply || '';
      openModal('reviewModal');
      return;
    }
  });

$('#deleteForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('#deleteProductId').value;
  console.log('[delete] id =', id);
  App.removeProduct(id);
  const after = App.products();
  console.log('[delete] products after =', after.length);
  closeModal('deleteModal');
  renderAdminProducts();
  showToast('Товар удалён из каталога.');
});

$('#reviewForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('#replyReviewId').value;
  const text = $('#replyText').value.trim();
  if (!text) return;

  const state = App.read();
  state.reviews = (state.reviews || []).map(r =>
    r.id === id ? { ...r, adminReply: text } : r
  );
  App.write(state);
  closeModal('reviewModal');
  renderAdminReviews();
  showToast('Ответ на отзыв сохранён.');
});

  document.addEventListener('change', e => {
    const select = e.target.closest('[data-order-status]');
    if (!select) return;
    const state = App.read();
    const order = (state.orders || []).find(o => o.id === select.dataset.orderStatus);
    if (!order) return;
    order.status = select.value;
    App.write(state);
    showToast('Статус заказа обновлён.');
  });

  $('#settingsNotice').addEventListener('click', () => openModal('passwordModal'));
  $('#passwordForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = App.currentUser();
    if (!user) return;
    const data = new FormData(e.currentTarget);
    const current = String(data.get('current') || '');
    const next = String(data.get('next') || '');
    const repeat = String(data.get('repeat') || '');
    const message = $('#passwordMessage');
    if (current !== user.password) { message.textContent = 'Текущий пароль указан неверно.'; message.className='auth-error is-visible'; return; }
    if (next.length < 6) { message.textContent = 'Новый пароль должен содержать минимум 6 символов.'; message.className='auth-error is-visible'; return; }
    if (next !== repeat) { message.textContent = 'Новые пароли не совпадают.'; message.className='auth-error is-visible'; return; }
    App.updateUser(user.id, { password: next });
    e.currentTarget.reset();
    message.className='auth-error';
    closeModal('passwordModal');
    showToast('Пароль успешно изменён.');
  });

  // modal behavior
  function openModal(id) { const m = document.getElementById(id); if (m) m.hidden = false; }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.hidden = true; }
  window.openAccountModal = openModal;
  window.closeAccountModal = closeModal;
  $$('.account-modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
    modal.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(modal.id)));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.account-modal:not([hidden])').forEach(m => closeModal(m.id));
  });

  // ===== Отзывы: открыть модалку =====
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-write-review]');
    if (!btn) return;
    const user = App.currentUser();
    if (!user) return;
    const orderId = btn.dataset.writeReview;
    const state = App.read();
    const order = (state.orders || []).find(o => o.id === orderId && o.userId === user.id);
    if (!order) return;

    $('#reviewOrderId').value = orderId;
    $('#writeReviewProduct').textContent = order.title || 'Заказ';
    $('#reviewRating').value = '5';
    $('#reviewText').value = '';
    $('#writeReviewMessage').textContent = '';
    $('#writeReviewMessage').className = 'auth-error';
    updateStars(5);
    openModal('writeReviewModal');
  });

function updateStars(value) {
  $$('#ratingInput button').forEach(b => {
    b.classList.toggle('is-active', Number(b.dataset.rating) <= value);
  });
  $('#reviewRating').value = String(value);
}

// Ховер-превью: наводишь — до этой звезды всё подсвечено
function previewStars(value) {
  $$('#ratingInput button').forEach(b => {
    const n = Number(b.dataset.rating);
    b.classList.toggle('is-hover', n <= value);
  });
}

function clearPreview() {
  $$('#ratingInput button').forEach(b => b.classList.remove('is-hover'));
}
  // Клик — фиксируем оценку
  document.addEventListener('click', e => {
    const star = e.target.closest('#ratingInput button');
    if (!star) return;
    updateStars(Number(star.dataset.rating));
  });

  // Наведение — превью
  document.addEventListener('mouseover', e => {
    const star = e.target.closest('#ratingInput button');
    if (!star) return;
    previewStars(Number(star.dataset.rating));
  });

  // Уход с блока — сбрасываем превью
  const ratingBlock = document.getElementById('ratingInput');
  if (ratingBlock) {
    ratingBlock.addEventListener('mouseleave', clearPreview);
  }

  document.addEventListener('click', e => {
    const star = e.target.closest('#ratingInput button');
    if (!star) return;
    updateStars(Number(star.dataset.rating));
  });

    // ===== Отзывы: отправка (через делегирование) =====
  document.addEventListener('submit', e => {
    const form = e.target.closest('#writeReviewForm');
    if (!form) return;
    e.preventDefault();

    const user = App.currentUser();
    if (!user) return;

    const orderId = $('#reviewOrderId').value;
    const rating = Number($('#reviewRating').value) || 5;
    const text = $('#reviewText').value.trim();
    const messageEl = $('#writeReviewMessage');

    messageEl.textContent = '';
    messageEl.className = 'auth-error';

    if (text.length < 5) {
      messageEl.textContent = 'Напишите хотя бы пару слов о заказе.';
      messageEl.className = 'auth-error is-visible';
      return;
    }

    if (typeof App.addReview !== 'function') {
      messageEl.textContent = 'Метод addReview не найден в app.js.';
      messageEl.className = 'auth-error is-visible';
      return;
    }

    const state = App.read();
    const order = (state.orders || []).find(o => o.id === orderId);
    const productName = order?.title || 'Заказ';

    const res = App.addReview({
      userId: user.id,
      orderId,
      productName,
      rating,
      text
    });

    if (!res.ok) {
      messageEl.textContent = res.message;
      messageEl.className = 'auth-error is-visible';
      return;
    }

    closeModal('writeReviewModal');
    showToast('Спасибо за отзыв!');
    renderCustomer(user);
    activateCustomerPanel('orders');
  });


  switchMode('login');
  fillLoggedIn();
    // Показываем имя выбранного файла
  const fileInput = document.getElementById('productImage');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const label = fileInput.closest('.file-upload');
      const textEl = label?.querySelector('[data-file-name]');
      if (!textEl) return;
      if (fileInput.files && fileInput.files.length) {
        const name = fileInput.files[0].name;
        textEl.textContent = name.length > 28 ? name.slice(0, 25) + '…' : name;
        label.classList.add('has-file');
      } else {
        textEl.textContent = 'Выбрать файл';
        label.classList.remove('has-file');
      }
    });
  }
})();
