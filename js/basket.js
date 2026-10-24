(function(){
  'use strict';
  const App=window.KarameliaApp;
  const $=(s,p=document)=>p.querySelector(s);
  const $$=(s,p=document)=>[...p.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>new Intl.NumberFormat('ru-RU').format(v)+' ₽';
  let pendingCheckout=null, toastTimer;
  function toast(message){const t=$('#shopToast');t.textContent=message;t.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('is-visible'),3000);}
  function open(id){const m=$('#'+id);if(m)m.hidden=false;}
  function close(id){const m=$('#'+id);if(m)m.hidden=true;}
  function user(){return App.currentUser();}
  function details(){const u=user();return u?App.cartDetails(u.id):[];}
  function total(ids=null){const u=user();return u?App.cartTotal(u.id,ids):0;}
  function updateHeader(){
  const badge = $('#headerCartCount');
  if (!badge) return;
  const u = user();
  if (!u) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.textContent = App.getCart(u.id).reduce((s, x) => s + x.quantity, 0);
}

  function renderGuest(){
    $('#basketRoot').innerHTML=`<div class="guest-cart"><h2>Корзина для <em>зарегистрированных.</em></h2><p>Добавлять десерты в корзину, менять количество и оформлять оплату могут только зарегистрированные пользователи.</p><div class="guest-cart__links"><a href="account.html?mode=register">Зарегистрироваться</a><a href="account.html?mode=login">Войти</a></div></div>`;
  }
  function render(){
    updateHeader();
    const u=user(); if(!u){renderGuest();return;}
    const items=details();
    if(!items.length){$('#basketRoot').innerHTML=`<div class="empty-basket"><h2>Корзина <em>пустая.</em></h2><p>Здесь появятся выбранные десерты. Перейдите в каталог, добавляйте любимые вкусы и собирайте заказ.</p><a class="modal-btn caramel" href="catalog.html">Перейти в каталог</a></div>`;return;}
    $('#basketRoot').innerHTML=`<div class="basket-shell"><div class="basket-list">${items.map(rowHtml).join('')}</div><div class="basket-totalbar"><div><p class="total-note">Стоимость выбранных товаров</p><h2 class="total-value" id="basketTotal">${money(total(items.map(x=>x.productId)))}</h2></div><div class="basket-actions"><button class="basket-action light" id="paySelected" type="button">Оплатить выбранные</button><button class="basket-action caramel" id="payAll" type="button">Оплатить всё</button></div></div></div>`;
    updateSelectedTotal();
  }
  function rowHtml(row){
    const p=row.product;
    return `<article class="basket-row" data-row="${esc(p.id)}"><input class="basket-check" type="checkbox" checked data-check="${esc(p.id)}" aria-label="Выбрать ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.src='assets/hero/hero-cake.png'"><div class="basket-info"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><button class="single-pay" type="button" data-single-pay="${esc(p.id)}">Оплатить эту позицию</button></div><div class="basket-unit">${money(p.price)}</div><div class="qty-control"><button type="button" data-minus="${esc(p.id)}">−</button><span>${row.quantity}</span><button type="button" data-plus="${esc(p.id)}">+</button></div><button class="basket-remove" type="button" data-remove="${esc(p.id)}">Удалить</button></article>`;
  }
  function selectedIds(){return $$('.basket-check:checked').map(x=>x.dataset.check);}
  function updateSelectedTotal(){const value=total(selectedIds());$('#basketTotal').textContent=money(value);$('#paySelected').disabled=!selectedIds().length;}

  function startCheckout(productIds){
    const u=user(); if(!u)return;
    const ids=productIds&&productIds.length?productIds:[];const rows=details().filter(r=>ids.includes(r.productId));if(!rows.length)return;
    pendingCheckout={source:'cart',productIds:rows.map(r=>r.productId),items:rows.map(r=>({productId:r.productId,name:r.product.name,price:r.product.price,quantity:r.quantity})),total:rows.reduce((s,r)=>s+r.product.price*r.quantity,0)};
    $('#checkoutFio').value=u.fio||'';$('#checkoutEmail').value=u.email||'';$('#checkoutPhone').value=u.phone||'';$('#checkoutAddress').value=u.address||'';
    $('#checkoutSummary').innerHTML=pendingCheckout.items.map(i=>`<div><span>${esc(i.name)} × ${i.quantity}</span><strong>${money(i.price*i.quantity)}</strong></div>`).join('')+`<div class="checkout-total"><span>Итого</span><strong>${money(pendingCheckout.total)}</strong></div>`;
    open('checkoutModal');
  }

  document.addEventListener('click',e=>{
    const plus=e.target.closest('[data-plus]');if(plus){const u=user();const row=details().find(r=>r.productId===plus.dataset.plus);if(u&&row)App.updateCartQuantity(u.id,row.productId,row.quantity+1);render();return;}
    const minus=e.target.closest('[data-minus]');if(minus){const u=user();const row=details().find(r=>r.productId===minus.dataset.minus);if(u&&row)App.updateCartQuantity(u.id,row.productId,row.quantity-1);render();return;}
    const rem=e.target.closest('[data-remove]');if(rem){const u=user();if(u)App.removeFromCart(u.id,rem.dataset.remove);toast('Товар удалён из корзины.');render();return;}
    const pay=e.target.closest('[data-single-pay]');if(pay){startCheckout([pay.dataset.singlePay]);return;}
    if(e.target.id==='paySelected'){startCheckout(selectedIds());return;}
    if(e.target.id==='payAll'){const ids=details().map(x=>x.productId);startCheckout(ids);return;}
  });
  document.addEventListener('change',e=>{if(e.target.matches('[data-check]'))updateSelectedTotal();});

  $('#checkoutForm').addEventListener('submit',e=>{
    e.preventDefault();if(!user()||!pendingCheckout)return;const d=new FormData(e.currentTarget);const c={fio:String(d.get('fio')||''),email:String(d.get('email')||''),phone:String(d.get('phone')||''),address:String(d.get('address')||'')};pendingCheckout.customer=c;$('#paymentSummary').innerHTML=`<div><span>Покупатель</span><strong>${esc(c.fio)}</strong></div><div><span>E-mail</span><strong>${esc(c.email)}</strong></div><div><span>Телефон</span><strong>${esc(c.phone)}</strong></div><div><span>Адрес</span><strong>${esc(c.address)}</strong></div><div class="checkout-total"><span>К оплате</span><strong>${money(pendingCheckout.total)}</strong></div>`;close('checkoutModal');open('paymentModal');
  });
  $('#cardNumber').addEventListener('input',e=>{const d=e.target.value.replace(/\D/g,'').slice(0,16);e.target.value=d.replace(/(.{4})/g,'$1 ').trim();});
  $('#paymentForm').addEventListener('submit',e=>{
    e.preventDefault();if(!user()||!pendingCheckout)return;const d=new FormData(e.currentTarget);const num=String(d.get('cardNumber')||'').replace(/\s/g,'');const exp=String(d.get('expiry')||'').trim();const cvv=String(d.get('cvv')||'').trim();if(num.length!==16){toast('Введите 16 цифр номера карты.');return;}if(!/^\d{2}\/\d{2}$/.test(exp)){toast('Укажите срок действия в формате ММ/ГГ.');return;}if(!/^\d{3,4}$/.test(cvv)){toast('Проверьте код CVV.');return;}
    const u=user(),c=pendingCheckout.customer;App.createOrder({userId:u.id,fio:c.fio,email:c.email,phone:c.phone,address:c.address,items:pendingCheckout.items,total:pendingCheckout.total,status:'В пути',paymentStatus:'Оплачено'});if(pendingCheckout.source==='cart')App.clearCartItems(u.id,pendingCheckout.productIds);pendingCheckout=null;e.currentTarget.reset();close('paymentModal');$('#successText').textContent='Заказ успешно оплачен. Курьер в пути. Статус заказа можно посмотреть в личном кабинете.';render();open('successModal');
  });

  $$('.shop-modal').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)close(m.id)});m.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>close(b.dataset.close)));});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.shop-modal:not([hidden])').forEach(m=>close(m.id));});
  render();
})();
