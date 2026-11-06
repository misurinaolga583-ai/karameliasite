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


  // ===== Экспорт актуальных данных администратора в настоящий XLSX =====
  // Книга собирается на клиенте без внешних библиотек: поэтому экспорт работает
  // и на GitHub Pages, и без подключения к CDN. В XLSX создаётся Excel-таблица
  // с фильтрами, стилем строк и закреплённой строкой заголовков.
  function excelXml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  }

  function excelColumnName(index) {
    let name = '';
    while (index > 0) {
      const remainder = (index - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      index = Math.floor((index - 1) / 26);
    }
    return name;
  }

  function excelDisplayDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ru-RU');
  }

  function reportRows(type, state) {
    const users = Array.isArray(state.users) ? state.users : [];
    const userById = new Map(users.map(user => [String(user.id), user]));
    const products = Array.isArray(state.products) ? state.products : [];
    const orders = Array.isArray(state.orders) ? state.orders : [];
    const reviews = Array.isArray(state.reviews) ? state.reviews : [];

    if (type === 'products') return {
      sheet: 'Товары', file: 'products', table: 'KarameliaProducts',
      headers: ['ID позиции', 'Название', 'Описание', 'Категория', 'Цена, ₽'],
      rows: products.map(p => [p.id, p.name, p.description, p.category, Number(p.price) || 0])
    };

    if (type === 'orders') return {
      sheet: 'Заказы', file: 'orders', table: 'KarameliaOrders',
      headers: ['ID заказа', 'Дата создания', 'ID пользователя', 'Покупатель', 'E-mail', 'Телефон', 'Адрес доставки', 'Состав заказа', 'Сумма, ₽', 'Статус заказа', 'Статус оплаты'],
      rows: orders.map(o => {
        const user = userById.get(String(o.userId));
        const items = Array.isArray(o.items) && o.items.length
          ? o.items.map(item => `${item.name || item.productName || item.productId || 'Товар'} × ${Number(item.quantity) || 1} (${Number(item.price) || 0} ₽)`).join('; ')
          : (o.title || '');
        return [o.id, excelDisplayDate(o.createdAt), o.userId, o.fio || user?.fio || '', o.email || user?.email || '', o.phone || user?.phone || '', o.address || user?.address || '', items, Number(o.total) || 0, o.status || '', o.paymentStatus || ''];
      })
    };

    if (type === 'reviews') return {
      sheet: 'Отзывы', file: 'reviews', table: 'KarameliaReviews',
      headers: ['ID отзыва', 'Дата публикации', 'ID пользователя', 'Покупатель', 'E-mail', 'ID заказа', 'Товар', 'Оценка', 'Текст отзыва', 'Ответ администратора'],
      rows: reviews.map(r => {
        const user = userById.get(String(r.userId));
        return [r.id, excelDisplayDate(r.createdAt), r.userId, user?.fio || '', user?.email || '', r.orderId, r.productName, Number(r.rating) || 0, r.text, r.adminReply || ''];
      })
    };

    if (type === 'users') return {
      sheet: 'Пользователи', file: 'users', table: 'KarameliaUsers',
      headers: ['ID пользователя', 'ФИО', 'E-mail', 'Роль', 'Телефон', 'Адрес', 'Город', 'Дата рождения', 'Предпочтения', 'Дата регистрации'],
      // Пароли намеренно не экспортируются.
      rows: users.map(u => [u.id, u.fio, u.email, u.role === 'admin' ? 'Администратор' : 'Клиент', u.phone, u.address, u.city, u.birthDate, u.preferences, excelDisplayDate(u.createdAt)])
    };
    return null;
  }

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStored(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const u16 = (view, at, value) => view.setUint16(at, value, true);
    const u32 = (view, at, value) => view.setUint32(at, value >>> 0, true);

    files.forEach(file => {
      const name = encoder.encode(file.name);
      const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034B50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, 0); u16(lv, 12, 0x0021); u32(lv, 14, crc); u32(lv, 18, data.length);
      u32(lv, 22, data.length); u16(lv, 26, name.length); u16(lv, 28, 0); local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014B50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0);
      u16(cv, 12, 0); u16(cv, 14, 0x0021); u32(cv, 16, crc); u32(cv, 20, data.length);
      u32(cv, 24, data.length); u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0);
      u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset); central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054B50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, files.length);
    u16(ev, 10, files.length); u32(ev, 12, centralSize); u32(ev, 16, offset); u16(ev, 20, 0);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function buildExcelWorkbook(report) {
    const allRows = [report.headers, ...report.rows];
    const columnCount = report.headers.length;
    const lastColumn = excelColumnName(columnCount);
    const lastRow = allRows.length;
    const range = `A1:${lastColumn}${lastRow}`;
    const xmlRows = allRows.map((row, rowIndex) => {
      const cells = report.headers.map((_, colIndex) => {
        const value = row[colIndex] ?? '';
        const ref = `${excelColumnName(colIndex + 1)}${rowIndex + 1}`;
        if (typeof value === 'number' && Number.isFinite(value)) {
          const style = colIndex === 4 && report.file === 'products' ? 3 : (report.file === 'orders' && colIndex === 8 ? 3 : 2);
          return `<c r="${ref}" s="${rowIndex === 0 ? 1 : style}"><v>${value}</v></c>`;
        }
        return `<c r="${ref}" s="${rowIndex === 0 ? 1 : 2}" t="inlineStr"><is><t xml:space="preserve">${excelXml(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="30" customHeight="1"' : ''}>${cells}</row>`;
    }).join('');

    const widths = report.headers.map((header, index) => {
      const maxContent = Math.max(String(header).length, ...report.rows.slice(0, 150).map(row => String(row[index] ?? '').length));
      const preferred = /описание|текст отзыва|ответ администратора|состав заказа|адрес/i.test(header) ? 42 : 18;
      return Math.max(12, Math.min(preferred, Math.max(14, maxContent + 2)));
    });
    const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${excelXml(report.sheet)}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF422B25"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE7DED2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${xmlRows}</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`;
    const sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>`;
    const tableColumns = report.headers.map((header, index) => `<tableColumn id="${index + 1}" name="${excelXml(header)}"/>`).join('');
    const table = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="${report.table}" displayName="${report.table}" ref="${range}" totalsRowShown="0"><autoFilter ref="${range}"/><tableColumns count="${columnCount}">${tableColumns}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;

    return zipStored([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: styles },
      { name: 'xl/worksheets/sheet1.xml', data: worksheet },
      { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: sheetRels },
      { name: 'xl/tables/table1.xml', data: table }
    ]);
  }

  function downloadAdminReport(type) {
    if (App.currentUser()?.role !== 'admin') {
      showToast('Экспорт доступен только администратору.');
      return;
    }
    // Считываем localStorage прямо при клике — выгрузка всегда содержит последние изменения.
    const state = App.read();
    const report = reportRows(type, state);
    if (!report) return;
    const blob = buildExcelWorkbook(report);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `karamelia-${report.file}-${date}.xlsx`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`Отчёт «${report.sheet}» сформирован: ${report.rows.length} записей.`);
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
    const count = document.getElementById('adminOrderCount');
    if (count) count.textContent = rows.length;
    $('#adminOrdersBody').innerHTML = rows.length ? rows.slice().reverse().map(o => {
      const customer = (state.users || []).find(u => u.id === o.userId);
      return `<tr><td>${escapeHtml(customer?.fio || 'Пользователь')}</td><td>${escapeHtml(o.title || 'Заказ')}</td><td>${escapeHtml(o.total)} ₽</td><td>${new Date(o.createdAt).toLocaleDateString('ru-RU')}</td><td><select data-order-status="${escapeHtml(o.id)}"><option ${o.status==='Готовится'?'selected':''}>Готовится</option><option ${o.status==='В пути'?'selected':''}>В пути</option><option ${o.status==='Доставлен'?'selected':''}>Доставлен</option></select></td><td>${escapeHtml(o.paymentStatus || 'Не оплачено')}</td></tr>`;
    }).join('') : '<tr><td colspan="6">Заказов пока нет.</td></tr>';
  }

  function renderAdminReviews() {
    const state = App.read();
    const reviewRows = state.reviews || [];
    const count = document.getElementById('adminReviewCount');
    if (count) count.textContent = reviewRows.length;
    $('#adminReviewsBody').innerHTML = reviewRows.length ? state.reviews.slice().reverse().map(r => {
      const user = (state.users || []).find(u => u.id === r.userId);
      return `<tr><td>${escapeHtml(user?.fio || 'Пользователь')}</td><td>${escapeHtml(r.productName)}</td><td>${escapeHtml(r.text)}<br><small>${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}</small></td><td><button class="btn-outline" type="button" data-reply-review="${escapeHtml(r.id)}">${r.adminReply ? 'Изменить ответ' : 'Ответить'}</button> <button class="btn-outline" type="button" data-delete-review="${escapeHtml(r.id)}">Удалить</button></td></tr>`;
    }).join('') : '<tr><td colspan="4">Отзывы пока не оставляли.</td></tr>';
  }

  function renderAdminUsers() {
    const state = App.read();
    const users = state.users || [];
    const count = document.getElementById('adminUserCount');
    if (count) count.textContent = users.length;
    $('#adminUsersBody').innerHTML = `<tr><td colspan="5" style="text-align:right"><button class="btn-outline" type="button" data-add-user>+ Добавить пользователя</button></td></tr>` + users.map(u => `<tr><td>${escapeHtml(u.fio)}</td><td>${escapeHtml(u.email)}</td><td>${u.role === 'admin' ? 'Администратор' : 'Клиент'}</td><td>${escapeHtml(u.phone || '—')}</td><td><button class="btn-outline" type="button" data-edit-user="${escapeHtml(u.id)}">Изменить</button> ${u.role !== 'admin' ? `<button class="btn-outline" type="button" data-delete-user="${escapeHtml(u.id)}">Удалить</button>` : ''}</td></tr>`).join('');
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
    const reportButton = e.target.closest('[data-download-report]');
    if (reportButton) {
      downloadAdminReport(reportButton.dataset.downloadReport);
      return;
    }
    const del = e.target.closest('[data-delete-product]');
    if (del) {
      $('#deleteProductId').value = del.dataset.deleteProduct;
      openModal('deleteModal');
      return;
    }
    const delReview = e.target.closest('[data-delete-review]');
    if (delReview) {
      if (App.currentUser()?.role !== 'admin') return;
      if (!confirm('Удалить этот отзыв? Действие нельзя отменить.')) return;
      const state = App.read(); state.reviews = (state.reviews || []).filter(r => r.id !== delReview.dataset.deleteReview); App.write(state);
      renderAdminReviews(); showToast('Отзыв удалён.');
      return;
    }
    const addUser = e.target.closest('[data-add-user]');
    if (addUser) {
      if (App.currentUser()?.role !== 'admin') return;
      const fio=prompt('ФИО нового пользователя:'); if(!fio || !fio.trim()) return;
      const email=prompt('E-mail пользователя:'); if(!email || !email.trim()) return;
      const password=prompt('Временный пароль (не менее 6 символов):'); if(!password || password.length<6) { alert('Пароль должен содержать минимум 6 символов.'); return; }
      const state=App.read(); const clean=email.trim().toLowerCase();
      if((state.users||[]).some(u=>String(u.email).toLowerCase()===clean)){alert('Такой e-mail уже существует.');return;}
      state.users.push({id:'user_'+Date.now(),fio:fio.trim(),email:clean,password,role:'customer',phone:'',address:'',city:'',birthDate:'',preferences:'',createdAt:new Date().toISOString()});
      App.write(state); renderAdminUsers(); showToast('Пользователь добавлен.'); return;
    }
    const editUser = e.target.closest('[data-edit-user]');
    if (editUser) {
      if (App.currentUser()?.role !== 'admin') return;
      const state=App.read(); const u=(state.users||[]).find(x=>x.id===editUser.dataset.editUser); if(!u)return;
      const fio=prompt('ФИО:',u.fio||''); if(fio===null)return;
      const email=prompt('E-mail:',u.email||''); if(email===null)return;
      const phone=prompt('Телефон:',u.phone||''); if(phone===null)return;
      const address=prompt('Адрес:',u.address||''); if(address===null)return;
      const clean=email.trim().toLowerCase();
      if(!fio.trim()||!clean){alert('ФИО и e-mail обязательны.');return;}
      if((state.users||[]).some(x=>x.id!==u.id&&String(x.email).toLowerCase()===clean)){alert('Такой e-mail уже используется.');return;}
      Object.assign(u,{fio:fio.trim(),email:clean,phone:phone.trim(),address:address.trim()}); App.write(state); renderAdminUsers(); showToast('Данные пользователя обновлены.'); return;
    }
    const delUser = e.target.closest('[data-delete-user]');
    if (delUser) {
      if (App.currentUser()?.role !== 'admin') return;
      const id=delUser.dataset.deleteUser; const state=App.read(); const target=(state.users||[]).find(u=>u.id===id);
      if(!target || target.role==='admin')return;
      if(!confirm('Удалить пользователя '+(target.fio||target.email)+'? Его корзина, избранное и отзывы также будут удалены.'))return;
      state.users=(state.users||[]).filter(u=>u.id!==id); state.cart=(state.cart||[]).filter(x=>x.userId!==id); state.favorites=(state.favorites||[]).filter(x=>x.userId!==id); state.reviews=(state.reviews||[]).filter(x=>x.userId!==id); state.orders=(state.orders||[]).filter(x=>x.userId!==id);
      App.write(state); renderAdminUsers(); renderAdminReviews(); renderAdminOrders(); showToast('Пользователь удалён.'); return;
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
