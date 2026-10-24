(function () {
  'use strict';

  const KEY = 'karameliyaApp';

    const seedProducts = [
    { id:'pastry-01', category:'Пирожные', name:'Клубничные тарталетки', price:850, description:'Миниатюрные пирожные с воздушным белым кремом и свежей клубникой. Песочная основа и лёгкая ванильная нота делают вкус по-настоящему нежным. Идеально для фуршета или сладкого стола на празднике.', image:'assets/products/pastries/pastry-01.jpg' },
    { id:'limited-05', category:'Лимитированные вкусности', name:'Молочный коктейль', price:1250, description:'Густой молочный коктейль в стиле классических американских дайнеров. Подаётся с щедрой шапкой взбитых сливок и трубочкой. Ностальгический вкус детства в современной подаче.', image:'assets/products/limited/limited-05.jpg' },
    { id:'bakery-03', category:'Выпечка', name:'Пончики по-русски', price:290, description:'Пончики по-русски с нежной сахарной пудрой и заварным кремом внутри. Мягкое воздушное тесто и щедрая кремовая начинка в каждом кусочке. Знакомый с детства вкус, поданный с современным акцентом.', image:'assets/products/bakery/bakery-03.jpg' },
    { id:'limited-02', category:'Лимитированные вкусности', name:'Макаруны фисташка-вишня', price:720, description:'Пара макарунов: фисташковый и вишнёвый — в одном наборе. Хрустящая скорлупа и нежный крем с натуральными орехами и ягодами. Изысканный десерт для тех, кто ценит французскую классику.', image:'assets/products/limited/limited-02.jpeg' },
    { id:'cake-01', category:'Торты', name:'Белоснежный с вишней', price:4800, description:'Классический бисквитный торт с нежным ванильным кремом и свежими вишенками. Белоснежная поверхность украшена ягодами и лёгкими кремовыми завитками. Идеальный выбор для семейного праздника или тихого вечера с чаем.', image:'assets/products/cakes/cake-01.jpeg' },
    { id:'bakery-05', category:'Выпечка', name:'Вафли на палочке', price:330, description:'Вафли на палочке в белом креме с яркой кондитерской посыпкой. Хрустящая основа и сливочный вкус — любимое лакомство детей и взрослых. Удобный формат для прогулок и праздников на открытом воздухе.', image:'assets/products/bakery/bakery-05.jpg' },
    { id:'pastry-03', category:'Пирожные', name:'Шоколадное с орехами', price:420, description:'Плотное шоколадное пирожное с хрустящими орехами и бархатистым ганашем. Насыщенный какао-вкус дополнен тонкой карамельной прослойкой. Для тех, кто любит глубокие шоколадные десерты.', image:'assets/products/pastries/pastry-03.jpeg' },
    { id:'limited-04', category:'Лимитированные вкусности', name:'Мороженое-роза', price:1650, description:'Мороженое, собранное в форме розы из тонких лепестков пломбира. Изящный вид и нежный сливочный вкус — настоящее произведение кондитерского искусства. Идеальный финал романтического вечера.', image:'assets/products/limited/limited-04.jpg' },
    { id:'cake-04', category:'Торты', name:'Капучино в сердце', price:5100, description:'Торт в форме сердца с кофейными мотивами капучино и щедрым слоем сливочного крема. Декоративные бантики и кофейные зёрна придают десерту особый шарм. Для тех, кто ценит глубокий вкус и эстетику в каждой детали.', image:'assets/products/cakes/cake-04.jpg' },
    { id:'bakery-02', category:'Выпечка', name:'Большой круассан', price:390, description:'Большой слоёный круассан с золотистой хрустящей корочкой. Внутри — мягкое масляное тесто с лёгким ванильным ароматом. Идеально к утреннему кофе или как самостоятельный перекус.', image:'assets/products/bakery/bakery-02.jpeg' },
    { id:'limited-01', category:'Лимитированные вкусности', name:'Ванильное с вишенкой', price:5900, description:'Ванильное мороженое в кремовой текстуре с коктейльной вишенкой сверху. Мягкий сливочный вкус и лёгкая ванильная нота оставляют приятное послевкусие. Летний десерт, который хочется есть медленно.', image:'assets/products/limited/limited-01.jpeg' },
    { id:'pastry-05', category:'Пирожные', name:'Двойной шоколад', price:480, description:'Двойное шоколадное пирожное с контрастом тёмного и светлого мусса. Сверху — крошка из песочного печенья и кусочки шоколада. Плотный, насыщенный десерт для настоящих шокоголиков.', image:'assets/products/pastries/pastry-05.jpg' },
    { id:'cake-03', category:'Торты', name:'Шоколадное сердце', price:4950, description:'Насыщенный шоколадный торт в форме сердца с декором из кремовых бантиков. Плотные коржи сочетаются с бархатистым ганашем и лёгкой ягодной прослойкой. Прекрасный подарок для тех, кого хочется особенно порадовать.', image:'assets/products/cakes/cake-03.jpg' },
    { id:'bakery-04', category:'Выпечка', name:'Ватрушки с ягодами', price:320, description:'Румяные ватрушки с сезонными ягодами и нежным творожным кремом. Дрожжевое тесто получается мягким, а ягоды добавляют свежести и кислинки. Тёплый домашний десерт, который хочется съесть сразу.', image:'assets/products/bakery/bakery-04.jpg' },
    { id:'limited-03', category:'Лимитированные вкусности', name:'Тайяки с мороженым', price:980, description:'Японское мороженое в вафельном рожке в форме рыбки — тайяки. Хрустящее тесто и холодная сливочная начинка создают необычный контраст. Десерт, который удивляет и радует своим видом.', image:'assets/products/limited/limited-03.jpg' },
    { id:'pastry-02', category:'Пирожные', name:'Абрикосовое с крошкой', price:390, description:'Пирожное с сочными абрикосами, крошкой из песочного печенья и ароматным сиропом. Сладкая фруктовая кислинка отлично оттеняет сливочный крем. Простой, но очень аппетитный десерт для любого времени дня.', image:'assets/products/pastries/pastry-02.jpg' },
    { id:'cake-06', category:'Торты', name:'Розовые лилии', price:4700, description:'Нежный торт с розовым кремом и сахарными лилиями ручной работы. Ягодная начинка и лёгкий мусс создают свежий, изысканный вкус. Такой десерт станет центром праздничного стола и запомнится надолго.', image:'assets/products/cakes/cake-06.jpeg' },
     { id:'cake-05', category:'Торты', name:'Меч и плющ', price:5600, description:'Белый кремовый торт с необычным декором — шоколадным мечом и веточками плюща. Минималистичный дизайн с выразительными акцентами подойдёт для тематического праздника. Внутри — воздушные коржи и крем с тонкой ванильной нотой.', image:'assets/products/cakes/cake-05.jpg' },
    { id:'bakery-01', category:'Выпечка', name:'Сет выпечки', price:420, description:'Ассорти из свежей выпечки: кекс, круассан и нежная ватрушка. Каждый элемент приготовлен вручную и покрыт хрустящей корочкой. Отличный выбор для завтрака или семейного чаепития.', image:'assets/products/bakery/bakery-01.jpg' },
    { id:'pastry-04', category:'Пирожные', name:'Панкейки Oreo', price:560, description:'Пышные панкейки с кремом из печенья Oreo и шоколадной крошкой. Мягкая текстура и сливочный вкус с лёгкой ванильной нотой. Отличный вариант для завтрака или уютного чаепития.', image:'assets/products/pastries/pastry-04.jpg' },
    { id:'cake-02', category:'Торты', name:'Шоколад и роза', price:5200, description:'Элегантное сочетание тёмного шоколада и нежно-розового крема с вишнёвым акцентом. Коржи пропитаны вишнёвым сиропом и дополнены сливочным муссом. Такой торт станет украшением любого торжества — от дня рождения до свадьбы.', image:'assets/products/cakes/cake-02.jpg' },
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function write(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }

  function init() {
    const state = read();
    if (!Array.isArray(state.users)) state.users = [];
    if (!Array.isArray(state.products)) state.products = seedProducts;
    if (!Array.isArray(state.cart)) state.cart = [];
    if (!Array.isArray(state.orders)) state.orders = [];
    if (!Array.isArray(state.reviews)) state.reviews = [];
    if (!Array.isArray(state.favorites)) state.favorites = [];
    if (!Array.isArray(state.adminReviews)) state.adminReviews = [];
    if (!state.users.some(u => u.email === 'adminofkaramelia')) {
      state.users.push({ id:'admin', fio:'Карамелия — администратор', email:'adminofkaramelia', password:'adminkaramelia08', role:'admin', phone:'+7 961 549-56-14', address:'Кондитерская «Карамелия»' });
    }
    write(state);
  }

  function currentUser() {
    const state = read();
    return state.currentUserId ? state.users.find(u => u.id === state.currentUserId) || null : null;
  }

  function setCurrentUser(userId) {
    const state = read();
    state.currentUserId = userId;
    write(state);
  }

  function logout() {
    const state = read();
    delete state.currentUserId;
    write(state);
  }

  function register({ fio, email, password }) {
    const state = read();
    const cleanEmail = email.trim().toLowerCase();
    if (state.users.some(u => u.email.toLowerCase() === cleanEmail)) return { ok:false, message:'Пользователь с таким e-mail уже зарегистрирован.' };
    if (password.length < 6) return { ok:false, message:'Пароль должен содержать минимум 6 символов.' };
    if (!fio.trim()) return { ok:false, message:'Укажите ФИО.' };
    const user = { id:'user_' + Date.now(), fio:fio.trim(), email:cleanEmail, password, role:'customer', phone:'', address:'', city:'', birthDate:'', preferences:'', avatar:'', createdAt:new Date().toISOString() };
    state.users.push(user);
    state.currentUserId = user.id;
    write(state);
    return { ok:true, user };
  }

  function login({ email, password }) {
    const state = read();
    const user = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!user) return { ok:false, message:'Неверный e-mail или пароль.' };
    state.currentUserId = user.id;
    write(state);
    return { ok:true, user };
  }

  function updateUser(id, patch) {
    const state = read();
    const idx = state.users.findIndex(u => u.id === id);
    if (idx < 0) return null;
    state.users[idx] = { ...state.users[idx], ...patch };
    write(state);
    return state.users[idx];
  }

  function products() { return read().products || []; }
  function addProduct(product) {
    const state = read();
    const item = { ...product, id:'custom_' + Date.now() };
    state.products.push(item);
    write(state);
    return item;
  }
function removeProduct(id) {
  const state = read();
  const cleanId = String(id || '').trim();
  if (!cleanId) return;
  state.products = (state.products || []).filter(p => String(p.id) !== cleanId);
  write(state);
}
    /* ===== Корзина ===== */
  function getCart(userId) {
    const state = read();
    return (state.cart || []).filter(i => i.userId === userId);
  }

  function addToCart(userId, productId, quantity = 1) {
    const state = read();
    state.cart = state.cart || [];
    const existing = state.cart.find(i => i.userId === userId && i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.cart.push({ userId, productId, quantity });
    }
    write(state);
  }

  function removeFromCart(userId, productId) {
    const state = read();
    state.cart = (state.cart || []).filter(i => !(i.userId === userId && i.productId === productId));
    write(state);
  }

  function clearCart(userId) {
    const state = read();
    state.cart = (state.cart || []).filter(i => i.userId !== userId);
    write(state);
  }
  /* ===== Дополнительные методы корзины ===== */

  // Подробности: массив { productId, quantity, product }
  function cartDetails(userId) {
    const state = read();
    const cart = (state.cart || []).filter(i => i.userId === userId);
    const products = state.products || [];
    return cart
      .map(i => {
        const product = products.find(p => p.id === i.productId);
        return product ? { productId: i.productId, quantity: i.quantity, product } : null;
      })
      .filter(Boolean);
  }

  // Сумма корзины. Если ids передан — только по этим позициям
  function cartTotal(userId, ids = null) {
    const rows = cartDetails(userId);
    const filtered = ids && ids.length ? rows.filter(r => ids.includes(r.productId)) : rows;
    return filtered.reduce((sum, r) => sum + r.product.price * r.quantity, 0);
  }

  // Меняем количество. Если <= 0 — удаляем позицию
  function updateCartQuantity(userId, productId, quantity) {
    const state = read();
    state.cart = state.cart || [];
    const item = state.cart.find(i => i.userId === userId && i.productId === productId);
    if (!item) return;
    if (quantity <= 0) {
      state.cart = state.cart.filter(i => !(i.userId === userId && i.productId === productId));
    } else {
      item.quantity = quantity;
    }
    write(state);
  }

  // Очистить конкретные позиции (после оплаты)
  function clearCartItems(userId, productIds) {
    const state = read();
    state.cart = (state.cart || []).filter(
      i => !(i.userId === userId && productIds.includes(i.productId))
    );
    write(state);
  }
  /* ===== Избранное ===== */
  function isFavorite(productId) {
    const state = read();
    return (state.favorites || []).includes(productId);
  }

  function toggleFavorite(productId) {
    const state = read();
    state.favorites = state.favorites || [];
    const i = state.favorites.indexOf(productId);
    if (i >= 0) {
      state.favorites.splice(i, 1);
      write(state);
      return false;
    }
    state.favorites.push(productId);
    write(state);
    return true;
  }

  /* ===== Заказы ===== */
  function createOrder(payload) {
    const state = read();
    state.orders = state.orders || [];
    const order = {
      id: 'order_' + Date.now(),
      createdAt: new Date().toISOString(),
      status: 'Готовится',
      paymentStatus: 'Не оплачено',
      ...payload
    };
    state.orders.push(order);
    write(state);
    return order;
  }

    /* ===== Отзывы ===== */
  function addReview({ userId, orderId, productName, rating, text }) {
    const state = read();
    state.reviews = state.reviews || [];

    // один отзыв на заказ
    const existing = state.reviews.find(r => r.userId === userId && r.orderId === orderId);
    if (existing) return { ok: false, message: 'Отзыв на этот заказ уже оставлен.' };

    const review = {
      id: 'rev_' + Date.now(),
      userId,
      orderId,
      productName: String(productName || 'Заказ'),
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      text: String(text || '').trim(),
      adminReply: null,
      createdAt: new Date().toISOString()
    };
    state.reviews.push(review);
    write(state);
    return { ok: true, review };
  }

  function reviewsByOrder(userId, orderId) {
    const state = read();
    return (state.reviews || []).find(r => r.userId === userId && r.orderId === orderId) || null;
  }
      window.KarameliaApp = {
    init, read, write, currentUser, setCurrentUser, logout,
    register, login, updateUser,
    products, addProduct, removeProduct,
    getCart, addToCart, removeFromCart, clearCart,
    cartDetails, cartTotal, updateCartQuantity, clearCartItems,
    isFavorite, toggleFavorite,
    createOrder,
    addReview, reviewsByOrder
  };
  init();
})();