(function(){
  'use strict';
  const App = window.KarameliaApp;
  const $ = (s,p=document)=>p.querySelector(s);
  const $$ = (s,p=document)=>[...p.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = v => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  let category = new URLSearchParams(location.search).get('category') || 'Все вкусности';
  let pendingDeleteId = null;
  let pendingCheckout = null;
  let toastTimer;

  function toast(message){ const t=$('#shopToast'); t.textContent=message; t.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('is-visible'),3000); }
  function open(id){ const m=$('#'+id); if(m)m.hidden=false; }
  function close(id){ const m=$('#'+id); if(m)m.hidden=true; }
  function user(){ return App.currentUser(); }
  function isAdmin(){ return user()?.role==='admin'; }
  function cartCount(){ const u=user(); return u ? App.getCart(u.id).reduce((s,i)=>s+i.quantity,0) : 0; }
function updateHeader() {
  const badge = $('#headerCartCount');
  if (!badge) return;
  const u = user();
  if (!u) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  const count = App.getCart(u.id).reduce((s, i) => s + i.quantity, 0);
  badge.textContent = count;
}

  function renderFilters(){ $$('.catalog-filter').forEach(b=>b.classList.toggle('is-active',b.dataset.category===category)); }
  function getVisibleProducts(){ const all=App.products(); return category==='Все вкусности' ? all : all.filter(p=>p.category===category); }
  function cardHtml(p){
    const fav = App.isFavorite(p.id);
    return `<article class="catalog-card" data-product-id="${esc(p.id)}">
      <div class="card-image-wrap" data-detail="${esc(p.id)}"><img class="card-image" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='assets/hero/hero-cake.png'"></div>
      <button class="card-fav ${fav?'is-active':''}" type="button" aria-label="${fav?'Убрать из избранного':'Добавить в избранное'}" data-fav="${esc(p.id)}"><svg viewBox="0 0 24 24"><path d="M12 20S4 15.4 4 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.4C20 15.4 12 20 12 20Z"/></svg></button>
      ${isAdmin()?`<button class="card-delete" type="button" data-delete="${esc(p.id)}">Удалить</button>`:''}
      <div class="card-body"><div class="card-topline"><h2 class="card-title" data-detail="${esc(p.id)}" style="cursor:pointer">${esc(p.name)}</h2><div class="card-price">${money(p.price)}</div></div><p class="card-description">${esc(p.description)}</p><div class="card-actions"><button class="catalog-btn outline" type="button" data-cart="${esc(p.id)}">В корзину</button><button class="catalog-btn filled" type="button" data-order="${esc(p.id)}">Заказать</button></div></div>
    </article>`;
  }
  function render(){
    renderFilters();
    $('#adminTools').hidden=!isAdmin();
    const grid=$('#catalogGrid'); const list=getVisibleProducts();
    grid.innerHTML=list.length ? list.map(cardHtml).join('') : '<div class="catalog-empty"><h2>Здесь пока тихо.</h2><p>В этой категории ещё нет десертов. Выберите другую вкусность или возвращайтесь чуть позже.</p></div>';
    updateHeader();
  }

  function requireAuth(){ if(!user()){ open('guestModal'); return false; } return true; }
  function openDetails(id){
    const p=App.products().find(x=>x.id===id); if(!p)return;
    $('#detailTitle').textContent=p.name;
    $('#productDetailContent').innerHTML=`<div class="shop-product-detail"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.src='assets/hero/hero-cake.png'"><div><div class="detail-price">${money(p.price)}</div><p class="detail-description">${esc(p.description)}</p><p class="detail-description">Категория: ${esc(p.category)}</p><div class="modal-actions"><button class="modal-btn outline" type="button" data-detail-cart="${esc(p.id)}">В корзину</button><button class="modal-btn dark" type="button" data-detail-order="${esc(p.id)}">Заказать</button></div></div></div>`;
    open('detailModal');
  }
  function addCart(id){ if(!requireAuth())return; const u=user(); App.addToCart(u.id,id,1); updateHeader(); toast('Десерт добавлен в корзину.'); }
  function startOrder(id){
    if(!requireAuth())return;
    const p=App.products().find(x=>x.id===id); if(!p)return;
    pendingCheckout={source:'direct', productIds:[p.id], items:[{productId:p.id,name:p.name,price:p.price,quantity:1}], total:p.price};
    fillCheckout();
  }
  function fillCheckout(){
    const u=user(); if(!u||!pendingCheckout)return;
    $('#checkoutFio').value=u.fio||''; $('#checkoutEmail').value=u.email||''; $('#checkoutPhone').value=u.phone||''; $('#checkoutAddress').value=u.address||'';
    $('#checkoutSummary').innerHTML=pendingCheckout.items.map(i=>`<div><span>${esc(i.name)} × ${i.quantity}</span><strong>${money(i.price*i.quantity)}</strong></div>`).join('')+`<div class="checkout-total"><span>Итого</span><strong>${money(pendingCheckout.total)}</strong></div>`;
    close('detailModal'); open('checkoutModal');
  }
  function openCheckoutFromCard(id){ startOrder(id); }

  // фильтр
  $$('.catalog-filter').forEach(btn=>btn.addEventListener('click',()=>{category=btn.dataset.category; history.replaceState(null,'',category==='Все вкусности'?'catalog.html':'catalog.html?category='+encodeURIComponent(category)); render();}));
  // URL фильтр
  if(!['Все вкусности','Торты','Пирожные','Выпечка','Лимитированные вкусности'].includes(category)) category='Все вкусности';

  document.addEventListener('click',e=>{
    const fav=e.target.closest('[data-fav]'); if(fav){ if(!requireAuth())return; const active=App.toggleFavorite(fav.dataset.fav); fav.classList.toggle('is-active',active); fav.setAttribute('aria-label',active?'Убрать из избранного':'Добавить в избранное'); toast(active?'Десерт добавлен в избранное.':'Десерт убран из избранного.'); return; }
    const cart=e.target.closest('[data-cart]'); if(cart){ addCart(cart.dataset.cart); return; }
    const order=e.target.closest('[data-order]'); if(order){ startOrder(order.dataset.order); return; }
    const detail=e.target.closest('[data-detail]'); if(detail){ openDetails(detail.dataset.detail); return; }
    const del=e.target.closest('[data-delete]'); if(del){ if(!isAdmin())return; pendingDeleteId=del.dataset.delete; const p=App.products().find(x=>x.id===pendingDeleteId); $('#deleteProductText').textContent=`«${p?.name||'Позиция'}» будет удалён из каталога. Это действие нельзя отменить.`; open('deleteProductModal'); return; }
    const dcart=e.target.closest('[data-detail-cart]'); if(dcart){ addCart(dcart.dataset.detailCart); close('detailModal'); return; }
    const dorder=e.target.closest('[data-detail-order]'); if(dorder){ startOrder(dorder.dataset.detailOrder); return; }
  });

  $('#openAddProduct').addEventListener('click',()=>{ if(isAdmin())open('productModal'); });
  $('#productForm').addEventListener('submit',e=>{
    e.preventDefault(); if(!isAdmin())return;
    const data=new FormData(e.currentTarget); const file=data.get('image');
    const save=image=>{ App.addProduct({category:String(data.get('category')||''),name:String(data.get('name')||'').trim(),description:String(data.get('description')||'').trim(),price:Number(data.get('price')||0),image:image||'assets/hero/hero-cake.png'}); e.currentTarget.reset(); close('productModal'); render(); toast('Новая позиция добавлена в каталог.'); };
    if(file&&file.size){ const reader=new FileReader(); reader.onload=()=>save(reader.result); reader.readAsDataURL(file); } else save('assets/hero/hero-cake.png');
  });
  $('#confirmDeleteProduct').addEventListener('click',()=>{ if(!isAdmin()||!pendingDeleteId)return; App.removeProduct(pendingDeleteId); pendingDeleteId=null; close('deleteProductModal'); render(); toast('Товар удалён из каталога.'); });

  $('#checkoutForm').addEventListener('submit',e=>{
    e.preventDefault(); if(!user()||!pendingCheckout)return;
    const d=new FormData(e.currentTarget); const data={fio:String(d.get('fio')||''),email:String(d.get('email')||''),phone:String(d.get('phone')||''),address:String(d.get('address')||'')};
    pendingCheckout.customer=data;
    $('#paymentSummary').innerHTML=`<div><span>Покупатель</span><strong>${esc(data.fio)}</strong></div><div><span>E-mail</span><strong>${esc(data.email)}</strong></div><div><span>Телефон</span><strong>${esc(data.phone)}</strong></div><div><span>Адрес</span><strong>${esc(data.address)}</strong></div><div class="checkout-total"><span>К оплате</span><strong>${money(pendingCheckout.total)}</strong></div>`;
    close('checkoutModal'); open('paymentModal');
  });
  $('#cardNumber').addEventListener('input',e=>{ const digits=e.target.value.replace(/\D/g,'').slice(0,16); e.target.value=digits.replace(/(.{4})/g,'$1 ').trim(); });
  $('#paymentForm').addEventListener('submit',e=>{
    e.preventDefault(); if(!user()||!pendingCheckout)return;
    const d=new FormData(e.currentTarget); const digits=String(d.get('cardNumber')||'').replace(/\s/g,''); const expiry=String(d.get('expiry')||'').trim(); const cvv=String(d.get('cvv')||'').trim();
    if(digits.length!==16){toast('Введите 16 цифр номера карты.');return;} if(!/^\d{2}\/\d{2}$/.test(expiry)){toast('Укажите срок действия в формате ММ/ГГ.');return;} if(!/^\d{3,4}$/.test(cvv)){toast('Проверьте код CVV.');return;}
    const u=user(), c=pendingCheckout.customer;
    App.createOrder({userId:u.id,fio:c.fio,email:c.email,phone:c.phone,address:c.address,items:pendingCheckout.items,total:pendingCheckout.total,status:'В пути',paymentStatus:'Оплачено'});
    e.currentTarget.reset(); close('paymentModal'); $('#successText').textContent=`Заказ на сумму ${money(pendingCheckout.total)} успешно оплачен. Курьер в пути. Статус и детали заказа доступны в личном кабинете.`; pendingCheckout=null; render(); open('successModal');
  });

       // модалки — поддерживаем и .shop-modal, и .account-modal
    $$('.shop-modal, .account-modal').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) close(m.id); });
      // старый способ — data-close="modalId"
      m.querySelectorAll('[data-close]').forEach(b => {
        b.addEventListener('click', () => close(b.dataset.close));
      });
      // новый способ (как в account.js) — data-close-modal внутри своей модалки
      m.querySelectorAll('[data-close-modal]').forEach(b => {
        b.addEventListener('click', () => close(m.id));
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        $$('.shop-modal:not([hidden]), .account-modal:not([hidden])').forEach(m => close(m.id));
      }
    });

    const queryMode = new URLSearchParams(location.search).get('mode');
    render();
    if (queryMode) { /* ссылка ведёт на общий экран аккаунта; query остаётся без вмешательства */ }
        // Показываем имя выбранного файла в модалке добавления товара
    const fileInput = document.querySelector('#productForm input[type="file"]');
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
