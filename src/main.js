import './style.css'
import './backend.css'
import './admin.css'
import './admin-extras.css'
import './modern.css'

let products = [
  { id: 1, name: 'iPhone 16 Pro', brand: 'Apple', color: 'Natural Titanium · 256GB', price: 999, oldPrice: 1099, badge: 'BEST SELLER', rating: '4.9', reviews: 128, category: 'Apple', image: 'photo-1695048133142-1a20484d2569', tone: 'warm', tag: 'Popular' },
  { id: 2, name: 'Galaxy S25 Ultra', brand: 'Samsung', color: 'Titanium Silver · 256GB', price: 1199, oldPrice: null, badge: 'JUST DROPPED', rating: '4.8', reviews: 86, category: 'Samsung', image: 'photo-1610945265064-0e34e5519bbf', tone: 'blue', tag: 'New' },
  { id: 3, name: 'Pixel 9 Pro', brand: 'Google', color: 'Porcelain · 128GB', price: 899, oldPrice: 999, badge: null, rating: '4.8', reviews: 92, category: 'Google', image: 'photo-1598327105666-5b89351aff97', tone: 'green', tag: 'Popular' },
  { id: 4, name: 'iPhone 15', brand: 'Apple', color: 'Soft Pink · 128GB', price: 699, oldPrice: 799, badge: 'SAVE $100', rating: '4.7', reviews: 214, category: 'Apple', image: 'photo-1592750475338-74b7b21085ab', tone: 'pink', tag: 'Sale' },
  { id: 5, name: 'Galaxy Z Flip6', brand: 'Samsung', color: 'Mint · 256GB', price: 899, oldPrice: 1099, badge: 'FRESH FIND', rating: '4.8', reviews: 73, category: 'Samsung', image: 'photo-1598327105666-5b89351aff97', tone: 'mint', tag: 'Sale' },
  { id: 6, name: 'Pixel 8a', brand: 'Google', color: 'Bay Blue · 128GB', price: 499, oldPrice: 549, badge: null, rating: '4.6', reviews: 168, category: 'Google', image: 'photo-1511707171634-5f897ff02aa9', tone: 'sky', tag: 'Popular' },
  { id: 7, name: 'iPhone 16', brand: 'Apple', color: 'Ultramarine · 128GB', price: 799, oldPrice: null, badge: 'NEW COLOR', rating: '4.9', reviews: 104, category: 'Apple', image: 'photo-1605236453806-6ff36851218e', tone: 'violet', tag: 'New' },
  { id: 8, name: 'Galaxy S24 FE', brand: 'Samsung', color: 'Graphite · 128GB', price: 599, oldPrice: 649, badge: null, rating: '4.6', reviews: 91, category: 'Samsung', image: 'photo-1598327106026-d9521da673d1', tone: 'gray', tag: 'Popular' },
]

const icons = {
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none"><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7"/></svg>',
}

let selectedCategory = 'All phones'
let selectedProductId = location.hash.startsWith('#product/') ? location.hash.slice('#product/'.length) : ''
let selectedOrderId = location.hash.startsWith('#track/') ? decodeURIComponent(location.hash.slice('#track/'.length)) : ''
let sortBy = 'featured'
let query = ''
let favorites = new Set()
let cart = []
let pendingCartProductId = ''
let cartOpen = false
let openCartAfterSignIn = false
let accountOpen = false
let checkoutOpen = false
let accountMode = 'login'
let currentUser = null
let orderHistory = []
let productReviews = []
let myProductReview = null
let selectedRating = 0
let token = sessionStorage.getItem('pocket-token') || ''
let adminOpen = false
let adminTab = 'overview'
let adminProducts = []
let adminOrders = []
let adminUsers = []
let adminPayments = []
let adminSubscribers = []
let adminOverview = { products: 0, users: 0, orders: 0, openOrders: 0, revenue: 0, lowStock: 0, subscribers: 0 }
let adminSettings = { storeName: 'Pocket', announcement: 'A little upgrade, on us. Free shipping on every phone.', contactEmail: '', checkoutPaused: false }
let storeSettings = { storeName: 'Pocket', announcement: 'A little upgrade, on us. Free shipping on every phone.', contactEmail: '', checkoutPaused: false }
let paymentConfig = { razorpayEnabled: false, razorpayKeyId: '', currency: 'USD' }
let selectedPaymentMethod = 'cash_on_delivery'
let adminProductFormOpen = false

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`/api${path}`, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.')
  return payload
}

async function loadProductReviews(productId, shouldRender = true) {
  try {
    const reviews = await api(`/products/${encodeURIComponent(productId)}/reviews`)
    let ownReview = null
    if (token) {
      try { ownReview = (await api(`/products/${encodeURIComponent(productId)}/reviews/mine`)).review } catch {}
    }
    if (String(productId) !== String(selectedProductId)) return
    productReviews = reviews
    myProductReview = ownReview
    if (shouldRender) render()
  } catch {
    if (String(productId) !== String(selectedProductId)) return
    productReviews = []
    myProductReview = null
    if (shouldRender) render()
  }
}

async function syncCart() {
  if (!token) throw new Error('Sign in to save items to your bag.')
  await api('/cart', { method: 'PUT', body: JSON.stringify({ items: cart.map(item => ({ productId: String(item.id), quantity: item.qty })) }) })
  const savedCart = await api('/cart')
  cart = savedCart.items.map(item => ({ id: String(item.product.id), qty: item.qty }))
}

async function loadStore() {
  try {
    const [productData, storeData, paymentData] = await Promise.all([api('/products'), api('/store'), api('/payments/config')])
    products = productData
    storeSettings = storeData
    paymentConfig = paymentData
    if (token) {
      const [profile, savedCart, orders] = await Promise.all([api('/auth/me'), api('/cart'), api('/orders')])
      currentUser = profile.user
      favorites = new Set(profile.favorites)
      orderHistory = orders
      cart = savedCart.items.map(item => ({ id: String(item.product.id), qty: item.qty }))
    }
    if (selectedProductId) await loadProductReviews(selectedProductId, false)
    render()
  } catch (error) {
    if (token && error.message.toLowerCase().includes('session')) { token = ''; sessionStorage.removeItem('pocket-token') }
    toast(error.message)
  }
}

const app = document.querySelector('#app')
const money = n => new Intl.NumberFormat(paymentConfig.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: paymentConfig.currency || 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0)
const imageUrl = (id, w = 660) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`

function productCard(p) {
  return `<article class="product-card">
    <div class="product-visual tone-${p.tone}" data-view-product="${p.id}" role="link" tabindex="0" aria-label="View ${escapeHtml(p.name)} details">
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      <button class="favorite-button ${favorites.has(p.id) ? 'is-favorite' : ''}" data-favorite="${p.id}" aria-label="${favorites.has(p.id) ? 'Remove from' : 'Add to'} favorites">${icons.heart}</button>
      <img src="${imageUrl(p.image)}" alt="${p.brand} ${p.name}" loading="lazy" />
      <button class="quick-add" data-add="${p.id}">Add to bag <span>${icons.plus}</span></button>
    </div>
    <div class="product-info">
      <div class="product-brand">${p.brand}<span class="rating">★ ${p.rating} <i>(${p.reviews})</i></span></div>
      <h3><a href="#product/${encodeURIComponent(p.id)}" data-view-product="${p.id}">${escapeHtml(p.name)}</a></h3><p class="product-color">${escapeHtml(p.color)}</p>
      <div class="product-price"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}</div>
    </div>
  </article>`
}

function getVisibleProducts() {
  let list = products.filter(p => (selectedCategory === 'All phones' || selectedCategory === 'Favorites' ? true : p.category === selectedCategory))
  if (selectedCategory === 'Favorites') list = list.filter(p => favorites.has(p.id))
  if (query.trim()) list = list.filter(p => `${p.name} ${p.brand} ${p.color}`.toLowerCase().includes(query.toLowerCase()))
  if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price)
  if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price)
  if (sortBy === 'rating') list.sort((a, b) => Number(b.rating) - Number(a.rating))
  return list
}

function renderProductPage() {
  const product = products.find(p => String(p.id) === String(selectedProductId))
  if (!product) { selectedProductId = ''; location.hash = 'phones'; render(); return }
  const related = products.filter(p => String(p.id) !== String(product.id) && p.category === product.category).slice(0, 4)
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  app.innerHTML = `<div class="announcement"><span class="sparkle">✳</span> ${escapeHtml(storeSettings.announcement)} <a href="#phones">Find yours ${icons.arrow}</a></div>
    <header class="site-header"><a class="logo" href="#top"><span class="logo-mark">p.</span> ${escapeHtml(storeSettings.storeName.toLowerCase())}<span class="logo-dot">.</span></a><nav class="main-nav"><a href="#phones">Phones</a><a href="#phones" data-quick-filter="Apple">Apple</a><a href="#phones" data-quick-filter="Samsung">Samsung</a><a href="#phones" data-quick-filter="Google">Google</a></nav><div class="header-actions"><button class="icon-button favorites-nav" data-favorites aria-label="Show favorites">${icons.heart}</button>${currentUser?.role === 'admin' ? '<button class="account-button" data-open-admin>Admin</button>' : ''}<button class="account-button" data-account>${currentUser ? `Hi, ${escapeHtml(currentUser.name.split(' ')[0])}` : 'Sign in'}</button><button class="icon-button cart-button" data-cart aria-label="Open shopping bag">${icons.bag}<span class="cart-count ${count ? '' : 'empty'}">${count}</span></button></div></header>
    <main class="product-page" id="top"><a class="product-back-link" href="#phones">← Back to all phones</a><section class="product-detail"><div class="product-detail-visual tone-${escapeHtml(product.tone)}">${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}<img src="${imageUrl(product.image, 1100)}" alt="${escapeHtml(`${product.brand} ${product.name}`)}"/><span class="product-detail-stamp">✳ GOOD TECH, GOOD FEELING</span></div><div class="product-detail-copy"><div class="eyebrow"><span></span> ${escapeHtml(product.brand.toUpperCase())} · ${escapeHtml(product.category.toUpperCase())}</div><h1>${escapeHtml(product.name)}</h1><div class="product-detail-rating">★ ${escapeHtml(product.rating)} <span>(${escapeHtml(product.reviews)} happy reviews)</span></div><div class="product-detail-price"><strong>${money(product.price)}</strong>${product.oldPrice ? `<del>${money(product.oldPrice)}</del><span class="product-saving">Save ${money(product.oldPrice - product.price)}</span>` : ''}</div><p class="product-detail-description">Meet your next everyday favorite. Thoughtfully selected, carefully checked, and ready to make the little things feel a little better.</p><div class="product-detail-option"><span>COLOR & STORAGE</span><strong>${escapeHtml(product.color)}</strong></div><div class="product-detail-stock">${product.stock > 0 ? '<span class="stock-dot"></span> In stock and ready to ship' : '<span class="stock-dot out"></span> Currently out of stock'}</div><button class="button button-dark product-buy-button" data-add="${escapeHtml(product.id)}" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock > 0 ? `Add to bag · ${money(product.price)}` : 'Out of stock'} ${icons.arrow}</button><button class="product-save-button ${favorites.has(product.id) ? 'is-favorite' : ''}" data-favorite="${escapeHtml(product.id)}">${icons.heart} ${favorites.has(product.id) ? 'Saved to your favorites' : 'Save to favorites'}</button><div class="product-detail-perks"><span>${icons.check} Free shipping</span><span>${icons.check} 30-day returns</span><span>${icons.check} Authentic, checked phones</span></div></div></section><section class="product-specs"><div><span>01</span><strong>A phone you can feel good about</strong><p>Every Pocket pick is checked for quality and ready for its next chapter.</p></div><div><span>02</span><strong>Easy, thoughtful delivery</strong><p>Free shipping comes with every order, packed with care.</p></div><div><span>03</span><strong>Room to make it yours</strong><p>Try it for 30 days. If it isn’t right, send it back.</p></div></section>${renderProductReviews(product)}${related.length ? `<section class="product-related"><div class="eyebrow"><span></span> MORE GOOD FINDS</div><h2>More from ${escapeHtml(product.category)}.</h2><div class="product-grid">${related.map(productCard).join('')}</div></section>` : ''}</main><footer><a class="logo" href="#top"><span class="logo-mark">p.</span> pocket<span class="logo-dot">.</span></a><span>Good phones. Good humans. Good feeling.</span><span>© 2025 Pocket Mobile Co.</span></footer><div class="toast" id="toast" role="status"></div>${cartOpen ? cartDrawer(count) : ''}${accountOpen ? accountModal() : ''}${checkoutOpen ? checkoutModal() : ''}`
  attachEvents()
}

function renderOrderPage() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  const order = currentUser ? orderHistory.find(item => String(item.id) === selectedOrderId) : null
  const content = !currentUser
    ? `<section class="order-track-card"><div class="eyebrow"><span></span> YOUR POCKET ACCOUNT</div><h1>Sign in to track your order.</h1><p class="modal-intro">Order tracking is available from the account that placed the order.</p><button class="button button-dark modal-submit" data-account>Sign in ${icons.arrow}</button></section>`
    : !order
      ? `<section class="order-track-card"><div class="eyebrow"><span></span> ORDER NOT FOUND</div><h1>We couldn’t find that order.</h1><p class="modal-intro">Check that you’re signed in to the account that placed it.</p><button class="button button-dark modal-submit" data-back-to-orders>Back to your orders ${icons.arrow}</button></section>`
      : `<section class="order-track-card"><div class="eyebrow"><span></span> ORDER ${escapeHtml(String(order.id).slice(-7).toUpperCase())}</div><h1>Track your order.</h1><p class="modal-intro">Placed ${new Date(order.createdAt).toLocaleDateString()} · ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'} · ${money(order.subtotal)}</p>${renderOrderTracking(order)}<div class="order-track-items"><h2>In this order</h2>${order.items.map(item => `<div><span>${escapeHtml(item.name)} <small>× ${item.quantity}</small></span><strong>${money(item.unitPrice * item.quantity)}</strong></div>`).join('')}<div class="order-track-payment"><span>Payment · ${escapeHtml(String(order.paymentMethod || '').replaceAll('_', ' '))}</span><strong>${escapeHtml(order.paymentStatus || 'pending')}</strong></div></div><button class="button button-dark modal-submit" data-back-to-orders>Back to your orders ${icons.arrow}</button></section>`
  app.innerHTML = `<div class="announcement"><span class="sparkle">✳</span> ${escapeHtml(storeSettings.announcement)} <a href="#phones">Find yours ${icons.arrow}</a></div><header class="site-header"><a class="logo" href="#top" aria-label="${escapeHtml(storeSettings.storeName)} home"><span class="logo-mark">p.</span> ${escapeHtml(storeSettings.storeName.toLowerCase())}<span class="logo-dot">.</span></a><nav class="main-nav"><a href="#phones">Phones</a><a href="#phones" data-quick-filter="Apple">Apple</a><a href="#phones" data-quick-filter="Samsung">Samsung</a><a href="#phones" data-quick-filter="Google">Google</a></nav><div class="header-actions">${currentUser?.role === 'admin' ? '<button class="account-button" data-open-admin>Admin</button>' : ''}<button class="account-button" data-account>${currentUser ? `Hi, ${escapeHtml(currentUser.name.split(' ')[0])}` : 'Sign in'}</button><button class="icon-button cart-button" data-cart aria-label="Open shopping bag">${icons.bag}<span class="cart-count ${count ? '' : 'empty'}">${count}</span></button></div></header><main class="order-track-page"><button class="product-back-link" data-back-to-orders>← Back to your orders</button>${content}</main><footer><a class="logo" href="#top"><span class="logo-mark">p.</span> pocket<span class="logo-dot">.</span></a><span>Good phones. Good humans. Good feeling.</span><span>© 2025 Pocket Mobile Co.</span></footer><div class="toast" id="toast" role="status"></div>${cartOpen ? cartDrawer(count) : ''}${accountOpen ? accountModal() : ''}`
  attachEvents()
}

function render() {
  if (adminOpen) { renderAdmin(); return }
  if (selectedOrderId) { renderOrderPage(); return }
  if (selectedProductId) { renderProductPage(); return }
  const visible = getVisibleProducts()
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  app.innerHTML = `
    <div class="announcement"><span class="sparkle">✳</span> ${escapeHtml(storeSettings.announcement)} <a href="#phones">Find yours ${icons.arrow}</a></div>
    <header class="site-header"><a class="logo" href="#top" aria-label="${escapeHtml(storeSettings.storeName)} home"><span class="logo-mark">p.</span> ${escapeHtml(storeSettings.storeName.toLowerCase())}<span class="logo-dot">.</span></a>
      <nav class="main-nav"><a class="active" href="#phones">Phones</a><a href="#phones" data-quick-filter="Apple">Apple</a><a href="#phones" data-quick-filter="Samsung">Samsung</a><a href="#phones" data-quick-filter="Google">Google</a><a href="#why-pocket">Why Pocket</a></nav>
      <div class="header-actions"><label class="search-box">${icons.search}<input id="search" type="search" placeholder="Find your phone" value="${query}" aria-label="Search phones" /><kbd>⌘ K</kbd></label><button class="icon-button favorites-nav ${selectedCategory === 'Favorites' ? 'active' : ''}" data-favorites aria-label="Show favorites">${icons.heart}</button>${currentUser?.role === 'admin' ? '<button class="account-button admin-nav-button" data-open-admin>Admin</button>' : ''}<button class="account-button" data-account>${currentUser ? `Hi, ${currentUser.name.split(' ')[0]}` : 'Sign in'}</button><button class="icon-button cart-button" data-cart aria-label="Open shopping bag">${icons.bag}<span class="cart-count ${count ? '' : 'empty'}">${count}</span></button></div>
    </header>
    <main id="top">
      <section class="hero"><div class="hero-copy"><div class="eyebrow"><span></span> GOOD TECH, GOOD FEELING</div><h1>Your next phone<br/>feels like <em>you.</em></h1><p>Thoughtful tech. Fair prices. A little something extra. Meet the phones worth falling for.</p><div class="hero-actions"><a class="button button-dark" href="#phones">Shop all phones ${icons.arrow}</a><span class="hero-social"><span class="avatar-stack"><b>J</b><b>M</b><b>A</b></span> <span>Loved by <strong>12,000+</strong> happy humans</span></span></div><div class="hero-trust"><span>${icons.check} Free shipping</span><span>${icons.check} 30-day returns</span><span>${icons.check} Good human support</span></div></div>
       <div class="hero-art"><div class="art-sticker sticker-top">YOUR NEXT<br/>FAVORITE THING <b>↗</b></div><div class="hero-phone phone-back"><div class="camera-stack"><i></i><i></i><i></i></div><span class="phone-logo">◉</span></div><div class="hero-phone phone-front"><div class="screen-island"></div><div class="screen-glow"><span>9:41</span><i>✳</i><b>better days<br/>start here.</b></div></div><div class="art-sticker sticker-bottom"><span>✦</span> GOOD TECH,<br/>GOOD KARMA</div><div class="art-scribble">made for<br/>your pocket</div><div class="hero-sparkle">✳</div></div>
      </section>
      <section class="promise-strip"><div><span class="promise-icon">✦</span><span><strong>Free shipping</strong><small>On every single order</small></span></div><div><span class="promise-icon">↺</span><span><strong>30-day returns</strong><small>Love it or send it back</small></span></div><div><span class="promise-icon">♡</span><span><strong>Always authentic</strong><small>Only the real deal, ever</small></span></div><div><span class="promise-icon">☻</span><span><strong>Humans who help</strong><small>Real support, right here</small></span></div></section>
      <section class="catalog" id="phones"><div class="section-heading"><div><div class="eyebrow"><span></span> THE GOOD STUFF</div><h2>Find your <em>forever phone.</em></h2><p>Big on the things that matter. Easy on the things that don’t.</p></div><label class="sort-select">Sort by <select id="sort"><option value="featured" ${sortBy === 'featured' ? 'selected' : ''}>Featured</option><option value="price-low" ${sortBy === 'price-low' ? 'selected' : ''}>Price: low to high</option><option value="price-high" ${sortBy === 'price-high' ? 'selected' : ''}>Price: high to low</option><option value="rating" ${sortBy === 'rating' ? 'selected' : ''}>Top rated</option></select></label></div>
        <div class="filter-row"><div class="filter-chips">${['All phones', 'Apple', 'Samsung', 'Google'].map(c => `<button class="filter-chip ${selectedCategory === c ? 'selected' : ''}" data-category="${c}">${c}${c === 'All phones' ? `<span>${products.length}</span>` : ''}</button>`).join('')}</div><span class="result-count">Showing ${visible.length} lovely ${visible.length === 1 ? 'phone' : 'phones'}</span></div>
        ${visible.length ? `<div class="product-grid">${visible.map(productCard).join('')}</div>` : `<div class="empty-state"><span>☁</span><h3>${selectedCategory === 'Favorites' ? 'Your wishlist is waiting.' : 'No phones found just yet.'}</h3><p>${selectedCategory === 'Favorites' ? 'Tap the little heart on a phone to save it here.' : 'Try a different search and let’s find your match.'}</p><button class="button button-dark" data-reset>See all phones ${icons.arrow}</button></div>`}
      </section>
      <section class="good-choice" id="why-pocket"><div class="good-choice-art"><div class="good-choice-circle"><div class="tiny-phone"><span></span></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit-copy">a phone that<br/>feels right <b>♡</b></div><div class="orbit-star">✳</div></div><span class="art-caption">Good tech is a little thing that makes a big difference.</span></div><div class="good-choice-copy"><div class="eyebrow"><span></span> A LITTLE MORE THOUGHTFUL</div><h2>Good for your<br/>pocket. <em>Good for<br/>the planet.</em></h2><p>Every phone we sell is carefully chosen, fully checked, and ready for its next chapter. Better tech, less waste, zero guesswork.</p><a href="#phones" class="text-link">A little more about us ${icons.arrow}</a><div class="impact-stats"><div><strong>100%</strong><small>authentic phones</small></div><div><strong>30 days</strong><small>to make it yours</small></div><div><strong>12k+</strong><small>happy humans</small></div></div></div></section>
      <section class="newsletter"><div class="newsletter-flower">✳</div><div class="eyebrow"><span></span> THE GOOD STUFF, OCCASIONALLY</div><h2>A little note from us<br/><em>to your inbox.</em></h2><p>New finds, small perks, zero weird spam. Pinky promise.</p><form id="newsletter-form"><input type="email" required placeholder="Your email address" aria-label="Your email address"/><button class="button button-dark" type="submit">Count me in ${icons.arrow}</button></form><span class="newsletter-note">By joining, you agree to receive the occasional good thing. Unsubscribe anytime.</span></section>
    </main><footer><a class="logo" href="#top"><span class="logo-mark">p.</span> pocket<span class="logo-dot">.</span></a><span>Good phones. Good humans. Good feeling.</span><span>© 2025 Pocket Mobile Co.</span></footer>
    <div class="toast" id="toast" role="status"></div>${cartOpen ? cartDrawer(count) : ''}${accountOpen ? accountModal() : ''}${checkoutOpen ? checkoutModal() : ''}`
  attachEvents()
}

function cartDrawer(count) {
  const items = cart.map(item => ({ item, product: products.find(product => String(product.id) === String(item.id)) })).filter(entry => entry.product)
  const subtotal = items.reduce((sum, { item, product }) => sum + product.price * item.qty, 0)
  return `<div class="drawer-backdrop" data-close-cart></div><aside class="cart-drawer" aria-label="Shopping bag"><div class="drawer-header"><div><span class="eyebrow"><span></span> YOUR GOOD FINDS</span><h2>Your bag <small>(${count})</small></h2></div><button class="icon-button" data-close-cart aria-label="Close bag">${icons.close}</button></div>${items.length ? `<div class="cart-items">${items.map(({ item, product: p }) => `<div class="cart-item"><img src="${imageUrl(p.image, 180)}" alt="${escapeHtml(p.name)}"/><div class="cart-item-detail"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.color)}</small><div class="qty-controls"><button data-qty="${escapeHtml(p.id)}" data-delta="-1" aria-label="Decrease quantity">${icons.minus}</button><span>${item.qty}</span><button data-qty="${escapeHtml(p.id)}" data-delta="1" aria-label="Increase quantity">${icons.plus}</button><button class="remove-item" data-remove="${escapeHtml(p.id)}">Remove</button></div></div><strong class="cart-item-price">${money(p.price * item.qty)}</strong></div>`).join('')}</div><div class="drawer-footer"><div class="shipping-note">✦ You’ve got <strong>free shipping!</strong> That was easy.</div><div class="subtotal"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><small class="tax-note">Taxes calculated at checkout. Shipping is on us.</small>${storeSettings.checkoutPaused ? '<p class="checkout-paused-note">Checkout is temporarily paused. Please check back soon.</p>' : ''}<button class="button button-dark checkout-button" data-checkout ${storeSettings.checkoutPaused ? 'disabled' : ''}>${storeSettings.checkoutPaused ? 'Checkout paused' : `Continue to checkout ${icons.arrow}`}</button><button class="continue-shopping" data-close-cart>Keep looking around</button></div>` : `<div class="empty-bag"><div class="empty-bag-icon">${icons.bag}</div><h3>Your bag’s taking a little nap.</h3><p>Wake it up with a phone you’ll love.</p><button class="button button-dark" data-close-cart>Find your phone ${icons.arrow}</button></div>`}</aside>`
}

let toastTimer
function toast(message) {
  const el = document.querySelector('#toast')
  if (!el) return
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2300)
}

async function addToCart(id) {
  if (!token) {
    pendingCartProductId = String(id)
    cartOpen = false
    accountOpen = true
    accountMode = 'login'
    render()
    toast('Sign in or create an account to save this phone to your bag.')
    return
  }
  const existing = cart.find(x => String(x.id) === String(id))
  const previousQuantity = existing?.qty || 0
  existing ? existing.qty++ : cart.push({ id: String(id), qty: 1 })
  try {
    await syncCart()
    render()
    toast(`${products.find(p => String(p.id) === String(id)).name} added to your bag ✨`)
  } catch (error) {
    cart = cart.filter(x => String(x.id) !== String(id))
    if (previousQuantity) cart.push({ id: String(id), qty: previousQuantity })
    render()
    toast(error.message)
  }
}

function attachEvents() {
  document.querySelectorAll('[data-view-product]').forEach(el => {
    const open = e => { if (e.target.closest('[data-add], [data-favorite]')) return; if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return; if (e.type === 'keydown') e.preventDefault(); e.stopPropagation(); location.hash = `product/${encodeURIComponent(el.dataset.viewProduct)}` }
    el.addEventListener('click', open)
    if (el.tagName !== 'A') el.addEventListener('keydown', open)
  })
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addToCart(String(b.dataset.add))))
  document.querySelectorAll('[data-rating-value]').forEach(button => button.addEventListener('click', () => {
    selectedRating = Number(button.dataset.ratingValue)
    document.querySelectorAll('[data-rating-value]').forEach(star => {
      star.classList.toggle('is-selected', Number(star.dataset.ratingValue) <= selectedRating)
      star.setAttribute('aria-pressed', String(Number(star.dataset.ratingValue) === selectedRating))
    })
  }))
  document.querySelector('#product-review-form')?.addEventListener('submit', submitProductReview)
  document.querySelectorAll('[data-favorite]').forEach(b => b.addEventListener('click', async () => { const id = String(b.dataset.favorite); try { if (token) { const result = await api(`/auth/favorites/${id}`, { method: 'PUT' }); favorites = new Set(result.favorites) } else favorites.has(id) ? favorites.delete(id) : favorites.add(id); render(); toast(favorites.has(id) ? 'Saved to your favorites ♡' : 'Removed from your favorites') } catch (error) { toast(error.message) } }))
  document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => { selectedCategory = b.dataset.category; render() }))
  document.querySelectorAll('[data-quick-filter]').forEach(b => b.addEventListener('click', () => { selectedCategory = b.dataset.quickFilter; render() }))
  document.querySelectorAll('[data-favorites]').forEach(b => b.addEventListener('click', () => { selectedCategory = selectedCategory === 'Favorites' ? 'All phones' : 'Favorites'; render(); document.querySelector('#phones').scrollIntoView({ behavior: 'smooth' }) }))
  document.querySelectorAll('[data-cart]').forEach(b => b.addEventListener('click', async () => {
    if (!token) {
      openCartAfterSignIn = true
      accountMode = 'login'
      accountOpen = true
      cartOpen = false
      render()
      toast('Sign in to view your saved bag.')
      return
    }
    try {
      const savedCart = await api('/cart')
      cart = savedCart.items.map(item => ({ id: String(item.product.id), qty: item.qty }))
      cartOpen = true
      render()
    } catch (error) {
      if (error.message.toLowerCase().includes('session') || error.message.toLowerCase().includes('sign in')) {
        token = ''
        currentUser = null
        sessionStorage.removeItem('pocket-token')
        openCartAfterSignIn = true
        accountMode = 'login'
        accountOpen = true
        render()
      }
      toast(error.message)
    }
  }))
  document.querySelector('[data-account]')?.addEventListener('click', () => { accountOpen = true; accountMode = 'login'; render() })
  document.querySelectorAll('[data-back-to-orders]').forEach(button => button.addEventListener('click', () => { accountOpen = true; selectedOrderId = ''; location.hash = 'top'; render() }))
  document.querySelector('[data-open-admin]')?.addEventListener('click', openAdmin)
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', e => { if (b.classList.contains('modal-backdrop') && e.target !== b) return; accountOpen = false; checkoutOpen = false; render() }))
  document.querySelectorAll('[data-account-mode]').forEach(b => b.addEventListener('click', () => { accountMode = b.dataset.accountMode; render() }))
  document.querySelector('[data-logout]')?.addEventListener('click', () => { token = ''; currentUser = null; orderHistory = []; favorites = new Set(); cart = []; sessionStorage.removeItem('pocket-token'); accountOpen = false; render(); toast('You’re signed out.') })
  document.querySelector('#account-form')?.addEventListener('submit', submitAccount)
  document.querySelector('#checkout-form')?.addEventListener('change', e => {
    if (e.target.name !== 'paymentMethod') return
    selectedPaymentMethod = e.target.value
    const button = e.currentTarget.querySelector('[type="submit"]')
    const subtotal = cart.reduce((sum, item) => sum + (products.find(product => String(product.id) === String(item.id))?.price || 0) * item.qty, 0)
    if (button) button.innerHTML = `${selectedPaymentMethod === 'razorpay' ? `Pay securely · ${money(subtotal)}` : `Place order · ${money(subtotal)}`} ${icons.arrow}`
  })
  document.querySelector('#checkout-form')?.addEventListener('submit', submitCheckout)
  document.querySelectorAll('[data-checkout]').forEach(b => b.addEventListener('click', () => { if (!token) { cartOpen = false; accountOpen = true; accountMode = 'login'; render(); toast('Sign in or create an account to place your order.') } else { cartOpen = false; checkoutOpen = true; render() } }))
  document.querySelectorAll('[data-close-cart]').forEach(b => b.addEventListener('click', () => { cartOpen = false; render() }))
  document.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', async () => { const item = cart.find(x => String(x.id) === String(b.dataset.qty)); item.qty += Number(b.dataset.delta); if (item.qty <= 0) cart = cart.filter(x => x.id !== item.id); try { await syncCart(); render() } catch (error) { toast(error.message) } }))
  document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', async () => { cart = cart.filter(x => String(x.id) !== String(b.dataset.remove)); try { await syncCart(); render() } catch (error) { toast(error.message) } }))
  document.querySelector('#sort')?.addEventListener('change', e => { sortBy = e.target.value; render() })
  document.querySelector('#search')?.addEventListener('input', e => { query = e.target.value; const start = e.target.selectionStart; render(); const input = document.querySelector('#search'); input.focus(); input.setSelectionRange(start, start) })
  document.querySelector('[data-reset]')?.addEventListener('click', () => { selectedCategory = 'All phones'; query = ''; render() })
  document.querySelector('#newsletter-form')?.addEventListener('submit', async e => { e.preventDefault(); try { const form = new FormData(e.target); await api('/newsletter', { method: 'POST', body: JSON.stringify({ email: form.get('email') }) }); e.target.reset(); toast('You’re on the list. Good things are coming ✨') } catch (error) { toast(error.message) } })
}

window.addEventListener('hashchange', () => {
  selectedProductId = location.hash.startsWith('#product/') ? decodeURIComponent(location.hash.slice('#product/'.length)) : ''
  selectedOrderId = location.hash.startsWith('#track/') ? decodeURIComponent(location.hash.slice('#track/'.length)) : ''
  if (selectedProductId) {
    productReviews = []
    myProductReview = null
    selectedRating = 0
    loadProductReviews(selectedProductId)
  }
  render()
})

async function openAdmin() {
  if (currentUser?.role !== 'admin') return toast('Admin access is required.')
  adminOpen = true
  adminProductFormOpen = false
  renderAdmin()
  await loadAdminData()
}

async function loadAdminData() {
  try {
    const [overview, productsData, ordersData, users, payments, subscribers, settings] = await Promise.all([
      api('/admin/overview'), api('/admin/products'), api('/admin/orders'), api('/admin/users'), api('/admin/payments'), api('/admin/newsletter'), api('/store'),
    ])
    adminOverview = overview
    adminProducts = productsData
    adminOrders = ordersData
    adminUsers = users
    adminPayments = payments
    adminSubscribers = subscribers
    adminSettings = settings
    renderAdmin()
  } catch (error) {
    adminOpen = false
    render()
    toast(error.message)
  }
}

function renderAdmin() {
  const activeCount = adminOverview.products
  const lowStock = adminOverview.lowStock
  const pendingCount = adminOverview.openOrders
  const revenue = adminOverview.revenue
  const tabs = [['overview','Overview','⌂', ''], ['users','Users','♙',adminUsers.length], ['products','Products','▦',adminProducts.length], ['orders','Orders','□',pendingCount], ['payments','Payments','$',adminPayments.length], ['subscribers','Subscribers','✉',adminOverview.subscribers], ['settings','Store settings','⚙','']]
  const titles = { overview: 'Overview', users: 'Customers', products: 'Product catalog', orders: 'Orders', payments: 'Payments', subscribers: 'Subscribers', settings: 'Store settings' }
  const contents = { overview: adminOverviewContent(), users: adminUsersContent(), products: adminProductContent(), orders: adminOrderContent(), payments: adminPaymentsContent(), subscribers: adminSubscribersContent(), settings: adminSettingsContent() }
  app.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar"><a class="logo" href="#" data-admin-home><span class="logo-mark">p.</span> pocket<span class="logo-dot">.</span></a><div class="admin-side-label">WORKSPACE</div>${tabs.map(([id,label,icon,count]) => `<button class="admin-side-link ${adminTab === id ? 'selected' : ''}" data-admin-tab="${id}"><span>${icon}</span> ${label}${count !== '' ? `<i>${count}</i>` : ''}</button>`).join('')}<div class="admin-sidebar-bottom"><div class="admin-user-avatar">${escapeHtml(currentUser?.name?.[0] || 'A').toUpperCase()}</div><div><strong>${escapeHtml(currentUser?.name || 'Admin')}</strong><small>Store admin</small></div><button data-admin-logout title="Sign out">↗</button></div></aside>
    <main class="admin-main"><header class="admin-topbar"><div><span class="admin-breadcrumb">Pocket <b>/</b> ${titles[adminTab]}</span><h1>${titles[adminTab]}</h1></div><div class="admin-top-actions"><span class="admin-live"><i></i> ${adminSettings.checkoutPaused ? 'Checkout paused' : 'Live database data'}</span><button class="admin-store-link" data-admin-refresh>↻ Refresh data</button><button class="admin-store-link" data-admin-home>← Back to store</button></div></header>
      ${adminTab !== 'settings' ? `<section class="admin-stats"><article><span>ACTIVE PRODUCTS</span><strong>${activeCount}</strong><small>${lowStock ? `${lowStock} need a restock` : 'Everything in good shape'}</small><b>▦</b></article><article><span>ORDERS TO FULFILL</span><strong>${pendingCount}</strong><small>Placed or processing</small><b>□</b></article><article><span>GROSS ORDER VALUE</span><strong>${money(revenue)}</strong><small>Across ${adminOverview.orders} orders</small><b>↗</b></article><article><span>REGISTERED USERS</span><strong>${adminOverview.users}</strong><small>${adminOverview.subscribers} newsletter subscribers</small><b>♙</b></article></section>` : ''}
      ${contents[adminTab]}
    </main>${adminProductFormOpen ? adminProductModal() : ''}<div id="toast" class="toast" role="status"></div></div>`
  document.querySelectorAll('[data-admin-home]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); adminOpen = false; render() }))
  document.querySelector('[data-admin-refresh]')?.addEventListener('click', async e => { e.currentTarget.disabled = true; e.currentTarget.textContent = 'Refreshing…'; await loadAdminData() })
  document.querySelector('[data-admin-logout]')?.addEventListener('click', () => { token = ''; currentUser = null; adminOpen = false; sessionStorage.removeItem('pocket-token'); render(); toast('You’re signed out.') })
  document.querySelectorAll('[data-admin-tab]').forEach(b => b.addEventListener('click', () => { adminTab = b.dataset.adminTab; renderAdmin() }))
  document.querySelector('[data-admin-add]')?.addEventListener('click', () => { adminProductFormOpen = true; renderAdmin() })
  document.querySelectorAll('[data-admin-close-form]').forEach(b => b.addEventListener('click', e => { if (b.classList.contains('admin-modal-backdrop') && e.target !== b) return; adminProductFormOpen = false; renderAdmin() }))
  document.querySelector('#admin-product-form')?.addEventListener('submit', submitAdminProduct)
  document.querySelectorAll('[data-save-product]').forEach(b => b.addEventListener('click', () => saveAdminProduct(b.dataset.saveProduct)))
  document.querySelectorAll('[data-toggle-product]').forEach(b => b.addEventListener('click', () => {
    const current = b.dataset.nextActive === undefined ? b.textContent.trim() === 'Active' : b.dataset.nextActive === 'true'
    const next = !current
    b.dataset.nextActive = String(next)
    b.textContent = next ? 'Active' : 'Hidden'
    b.classList.toggle('is-active', next)
    b.classList.toggle('is-inactive', !next)
  }))
  document.querySelectorAll('[data-save-order]').forEach(b => b.addEventListener('click', () => saveAdminOrder(b.dataset.saveOrder)))
  document.querySelectorAll('[data-save-user]').forEach(b => b.addEventListener('click', () => saveAdminUser(b.dataset.saveUser)))
  document.querySelectorAll('[data-user-active]').forEach(b => b.addEventListener('click', () => {
    const active = b.dataset.nextActive === undefined ? b.dataset.active === 'true' : b.dataset.nextActive === 'true'
    b.dataset.nextActive = String(!active)
    b.textContent = active ? 'Disabled' : 'Active'
    b.classList.toggle('is-active', !active)
    b.classList.toggle('is-inactive', active)
  }))
  document.querySelectorAll('[data-save-payment]').forEach(b => b.addEventListener('click', () => saveAdminPayment(b.dataset.savePayment)))
  document.querySelectorAll('[data-newsletter-toggle]').forEach(b => b.addEventListener('click', () => saveAdminSubscriber(b.dataset.newsletterToggle, b.dataset.subscribed !== 'true')))
  document.querySelector('#admin-settings-form')?.addEventListener('submit', saveAdminSettings)
}

function adminOverviewContent() {
  const recent = adminOrders.slice(0, 5).map(order => `<tr><td><strong class="admin-order-id">#${escapeHtml(String(order.id).slice(-7).toUpperCase())}</strong></td><td>${escapeHtml(order.customer?.name || 'Customer')}</td><td>${money(order.subtotal)}</td><td><span class="admin-status ${order.status === 'delivered' ? 'is-active' : ''}">${escapeHtml(order.status)}</span></td><td><span class="admin-payment-pill">${escapeHtml(order.paymentStatus)}</span></td></tr>`).join('')
  return `<section class="admin-overview-grid"><div class="admin-content-card"><div class="admin-content-heading"><div><h2>Recent orders</h2><p>Latest activity from your store.</p></div><button class="admin-text-action" data-admin-tab="orders">All orders →</button></div><div class="admin-table-wrap"><table class="admin-table overview-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>TOTAL</th><th>ORDER STATUS</th><th>PAYMENT</th></tr></thead><tbody>${recent || '<tr><td class="admin-empty" colspan="5">No customer orders yet.</td></tr>'}</tbody></table></div></div><div class="admin-quick-card"><span>QUICK LINKS</span><button data-admin-tab="products">Manage products <b>→</b></button><button data-admin-tab="users">Manage customers <b>→</b></button><button data-admin-tab="payments">Review payments <b>→</b></button><button data-admin-tab="settings">Edit storefront <b>→</b></button></div></section>`
}

function adminProductContent() {
  const rows = adminProducts.map(p => `<tr><td><div class="admin-product-cell"><img src="${imageUrl(p.image, 120)}" alt=""/><span><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.brand)} · ${escapeHtml(p.color)}</small></span></div></td><td><span class="admin-category">${escapeHtml(p.category)}</span></td><td><label class="admin-inline-input"><span>${paymentConfig.currency === 'INR' ? '₹' : '$'}</span><input aria-label="${escapeHtml(p.name)} price" type="number" min="0" step="1" value="${p.price}" data-product-field="price" data-product-id="${escapeHtml(p.id)}" /></label></td><td><input class="admin-stock-input" aria-label="${escapeHtml(p.name)} stock" type="number" min="0" step="1" value="${p.stock}" data-product-field="stock" data-product-id="${escapeHtml(p.id)}" /></td><td><button class="admin-status ${p.active ? 'is-active' : 'is-inactive'}" data-toggle-product="${escapeHtml(p.id)}">${p.active ? 'Active' : 'Hidden'}</button></td><td><button class="admin-save-row" data-save-product="${escapeHtml(p.id)}">Save</button></td></tr>`).join('')
  return `<section class="admin-content-card"><div class="admin-content-heading"><div><h2>Your phones</h2><p>Keep product details and stock up to date.</p></div><button class="admin-add-button" data-admin-add>＋ Add a product</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>PRODUCT</th><th>BRAND</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="admin-empty">No products yet.</td></tr>'}</tbody></table></div><div class="admin-table-foot">${activeCountText(adminProducts.length)} · Product changes appear on the storefront.</div></section>`
}

function activeCountText(count) { return `${count} ${count === 1 ? 'product' : 'products'} in your catalog` }

function adminOrderContent() {
  const rows = adminOrders.map(order => `<tr><td><strong class="admin-order-id">#${escapeHtml(String(order.id).slice(-7).toUpperCase())}</strong><small class="admin-cell-sub">${new Date(order.createdAt).toLocaleDateString()}</small></td><td><strong>${escapeHtml(order.customer?.name || 'Customer')}</strong><small class="admin-cell-sub">${escapeHtml(order.customer?.email || '')}</small></td><td>${order.items.map(item => `<div class="admin-order-item">${escapeHtml(item.name)} <span>× ${item.quantity}</span></div>`).join('')}</td><td><strong>${money(order.subtotal)}</strong><small class="admin-cell-sub">${escapeHtml(order.paymentMethod.replaceAll('_', ' '))}</small></td><td><select class="admin-select" data-order-field="status" data-order-id="${escapeHtml(order.id)}">${['placed','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select><select class="admin-select payment-select" data-order-field="paymentStatus" data-order-id="${escapeHtml(order.id)}">${['pending','paid','refunded'].map(s => `<option value="${s}" ${order.paymentStatus === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></td><td><button class="admin-save-row" data-save-order="${escapeHtml(order.id)}">Update</button></td></tr>`).join('')
  return `<section class="admin-content-card"><div class="admin-content-heading"><div><h2>Customer orders</h2><p>Review orders and update their fulfillment status.</p></div><span class="admin-order-total">${adminOrders.length} total</span></div><div class="admin-table-wrap"><table class="admin-table orders-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="admin-empty">No orders yet. New orders will appear here.</td></tr>'}</tbody></table></div><div class="admin-table-foot">Status changes are saved immediately to MongoDB.</div></section>`
}

function adminUsersContent() {
  const rows = adminUsers.map(user => `<tr><td><div class="admin-customer-cell"><span class="admin-customer-avatar">${escapeHtml(user.name?.[0] || '?').toUpperCase()}</span><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div></div></td><td>${new Date(user.createdAt).toLocaleDateString()}</td><td>${user.orderCount}</td><td><select class="admin-select user-role-select" data-user-role="${escapeHtml(user.id)}"><option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option></select></td><td><button class="admin-status ${user.active ? 'is-active' : 'is-inactive'}" data-user-active="${escapeHtml(user.id)}" data-active="${user.active}">${user.active ? 'Active' : 'Disabled'}</button></td><td><button class="admin-save-row" data-save-user="${escapeHtml(user.id)}">Save</button></td></tr>`).join('')
  return `<section class="admin-content-card"><div class="admin-content-heading"><div><h2>Customer accounts</h2><p>Manage account access and admin roles.</p></div><span class="admin-order-total">${adminUsers.length} accounts</span></div><div class="admin-table-wrap"><table class="admin-table user-table"><thead><tr><th>USER</th><th>JOINED</th><th>ORDERS</th><th>ROLE</th><th>ACCESS</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="admin-empty">No users found.</td></tr>'}</tbody></table></div><div class="admin-table-foot">You can’t disable or demote your own admin account.</div></section>`
}

function adminPaymentsContent() {
  const rows = adminPayments.map(payment => {
    const statusOptions = payment.paymentMethod === 'razorpay' ? (payment.paymentStatus === 'paid' ? ['paid', 'refunded'] : [payment.paymentStatus]) : ['pending', 'paid', 'refunded']
    const paymentStatus = payment.isPaymentAttempt
      ? '<span class="admin-payment-pill">Checkout started</span>'
      : `<select class="admin-select" data-payment-status="${escapeHtml(payment.id)}">${statusOptions.map(status => `<option value="${status}" ${payment.paymentStatus === status ? 'selected' : ''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select>`
    const action = payment.isPaymentAttempt ? '<span class="admin-cell-sub">Awaiting customer</span>' : `<button class="admin-save-row" data-save-payment="${escapeHtml(payment.id)}">Update</button>`
    return `<tr><td><strong class="admin-order-id">#${escapeHtml(String(payment.id).slice(-7).toUpperCase())}</strong><small class="admin-cell-sub">${new Date(payment.createdAt).toLocaleDateString()}</small></td><td><strong>${escapeHtml(payment.customer?.name || 'Customer')}</strong><small class="admin-cell-sub">${escapeHtml(payment.customer?.email || '')}</small></td><td>${escapeHtml(payment.paymentMethod.replaceAll('_', ' '))}</td><td><strong>${money(payment.total)}</strong></td><td>${paymentStatus}</td><td>${action}</td></tr>`
  }).join('')
  return `<section class="admin-content-card"><div class="admin-content-heading"><div><h2>Payment records</h2><p>Live payment attempts and order payments from MongoDB.</p></div><span class="admin-order-total">${adminPayments.length} records</span></div><div class="admin-payment-note">Razorpay payments are marked paid only after server-side verification and capture. Refund updates are sent to Razorpay.</div><div class="admin-table-wrap"><table class="admin-table payments-table"><thead><tr><th>ORDER / ATTEMPT</th><th>CUSTOMER</th><th>METHOD</th><th>AMOUNT</th><th>PAYMENT STATUS</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="admin-empty">No payment records yet.</td></tr>'}</tbody></table></div><div class="admin-table-foot">Payment records are saved with their MongoDB order or checkout attempt.</div></section>`
}

function adminSubscribersContent() {
  const rows = adminSubscribers.map(item => `<tr><td><strong>${escapeHtml(item.email)}</strong></td><td>${new Date(item.createdAt).toLocaleDateString()}</td><td><span class="admin-status ${item.subscribed ? 'is-active' : 'is-inactive'}">${item.subscribed ? 'Subscribed' : 'Paused'}</span></td><td><button class="admin-save-row" data-newsletter-toggle="${escapeHtml(item.id)}" data-subscribed="${item.subscribed}">${item.subscribed ? 'Pause' : 'Resume'}</button></td></tr>`).join('')
  return `<section class="admin-content-card"><div class="admin-content-heading"><div><h2>Newsletter subscribers</h2><p>Manage contacts who signed up for Pocket updates.</p></div><span class="admin-order-total">${adminOverview.subscribers} active</span></div><div class="admin-table-wrap"><table class="admin-table subscriber-table"><thead><tr><th>EMAIL</th><th>JOINED</th><th>STATUS</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="admin-empty">No subscribers yet.</td></tr>'}</tbody></table></div><div class="admin-table-foot">Email delivery isn’t connected; this list is stored in MongoDB.</div></section>`
}

function adminSettingsContent() {
  return `<section class="admin-content-card admin-settings-card"><div class="admin-content-heading"><div><h2>Storefront settings</h2><p>Control the public store announcement and checkout availability.</p></div></div><form id="admin-settings-form" class="admin-settings-form"><label>Store name<input name="storeName" maxlength="80" required value="${escapeHtml(adminSettings.storeName || 'Pocket')}" /></label><label>Support email<input name="contactEmail" type="email" value="${escapeHtml(adminSettings.contactEmail || '')}" placeholder="hello@example.com" /></label><label class="admin-setting-wide">Announcement bar<input name="announcement" maxlength="180" value="${escapeHtml(adminSettings.announcement || '')}" /></label><label class="admin-pause-toggle"><input name="checkoutPaused" type="checkbox" ${adminSettings.checkoutPaused ? 'checked' : ''} /> Pause checkout temporarily</label><button class="admin-add-button" type="submit">Save store settings</button></form></section>`
}

function adminProductModal() {
  return `<div class="admin-modal-backdrop" data-admin-close-form><section class="admin-product-modal" role="dialog" aria-modal="true"><button class="admin-modal-x" data-admin-close-form aria-label="Close">×</button><span class="admin-modal-kicker">ADD TO YOUR CATALOG</span><h2>A new good find.</h2><p>Add a phone to the Pocket store. Set a unique numeric product ID.</p><form id="admin-product-form"><label>Product ID<input name="id" type="number" min="1" required placeholder="9" /></label><label>Product name<input name="name" required placeholder="iPhone 16 Plus" /></label><label>Brand<input name="brand" required placeholder="Apple" /></label><label>Category<input name="category" required placeholder="Apple" /></label><label>Color & storage<input name="color" required placeholder="Blue · 128GB" /></label><label>Price ($)<input name="price" type="number" min="0" step="1" required placeholder="799" /></label><label>Was price ($)<input name="oldPrice" type="number" min="0" step="1" placeholder="Optional" /></label><label>Stock quantity<input name="stock" type="number" min="0" step="1" required value="10" /></label><label class="admin-form-wide">Unsplash photo ID<input name="image" required placeholder="photo-1605236453806-6ff36851218e" /></label><label>Image tone<input name="tone" value="gray" /></label><label>Tag<input name="tag" value="Popular" /></label><button class="admin-add-button admin-submit-wide" type="submit">Add product to store →</button></form></section></div>`
}

async function saveAdminProduct(id) {
  const fields = [...document.querySelectorAll(`[data-product-id="${CSS.escape(id)}"]`)]
  const update = Object.fromEntries(fields.map(input => [input.dataset.productField, Number(input.value)]))
  const statusButton = document.querySelector(`[data-toggle-product="${CSS.escape(id)}"]`)
  if (statusButton?.dataset.nextActive !== undefined) update.active = statusButton.dataset.nextActive === 'true'
  try { await api(`/admin/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(update) }); await loadAdminData(); toast('Product updated.') } catch (error) { toast(error.message) }
}

async function saveAdminOrder(id) {
  const fields = [...document.querySelectorAll(`[data-order-id="${CSS.escape(id)}"]`)]
  const update = Object.fromEntries(fields.map(input => [input.dataset.orderField, input.value]))
  try { await api(`/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(update) }); await loadAdminData(); toast('Order status updated.') } catch (error) { toast(error.message) }
}

async function saveAdminUser(id) {
  const role = document.querySelector(`[data-user-role="${CSS.escape(id)}"]`)?.value
  const statusButton = document.querySelector(`[data-user-active="${CSS.escape(id)}"]`)
  const active = statusButton?.dataset.nextActive === undefined ? statusButton?.dataset.active === 'true' : statusButton.dataset.nextActive === 'true'
  try { await api(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ role, active }) }); await loadAdminData(); toast('Customer account updated.') } catch (error) { toast(error.message) }
}

async function saveAdminPayment(id) {
  const paymentStatus = document.querySelector(`[data-payment-status="${CSS.escape(id)}"]`)?.value
  try { await api(`/admin/payments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) }); await loadAdminData(); toast('Payment record updated.') } catch (error) { toast(error.message) }
}

async function saveAdminSubscriber(id, subscribed) {
  try { await api(`/admin/newsletter/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ subscribed }) }); await loadAdminData(); toast(subscribed ? 'Subscriber resumed.' : 'Subscriber paused.') } catch (error) { toast(error.message) }
}

async function saveAdminSettings(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const settings = { storeName: form.get('storeName'), contactEmail: form.get('contactEmail'), announcement: form.get('announcement'), checkoutPaused: form.get('checkoutPaused') === 'on' }
  try { adminSettings = await api('/admin/store', { method: 'PATCH', body: JSON.stringify(settings) }); storeSettings = adminSettings; await loadAdminData(); render(); toast('Store settings saved.') } catch (error) { toast(error.message) }
}

async function submitAdminProduct(event) {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.currentTarget).entries())
  data.id = String(data.id); data.price = Number(data.price); data.stock = Number(data.stock); data.oldPrice = data.oldPrice ? Number(data.oldPrice) : null
  try { await api('/admin/products', { method: 'POST', body: JSON.stringify(data) }); adminProductFormOpen = false; await loadAdminData(); toast('New phone added to the store.') } catch (error) { toast(error.message) }
}

function accountModal() {
  return `<div class="modal-backdrop" data-close-modal><section class="store-modal" role="dialog" aria-modal="true" aria-labelledby="account-title"><button class="modal-close" data-close-modal aria-label="Close">${icons.close}</button>${currentUser ? `<div class="eyebrow"><span></span> YOUR POCKET ACCOUNT</div><h2 id="account-title">Hey, ${escapeHtml(currentUser.name)}.</h2><p class="modal-intro">Your orders and favorite phones, all in one place.</p><div class="order-history">${orderHistory.length ? orderHistory.map(order => {
    const orderId = String(order.id)
    return `<article class="account-order"><div class="account-order-summary"><div><strong>Order ${escapeHtml(orderId.slice(-7).toUpperCase())}</strong><small>${new Date(order.createdAt).toLocaleDateString()} · ${order.items.length} item(s)</small></div><span>${money(order.subtotal)}<small>${escapeHtml(order.status)}</small></span></div><a class="order-track-toggle" href="#track/${encodeURIComponent(orderId)}">Track order <span>→</span></a></article>`
  }).join('') : '<p class="no-orders">No orders yet. Your first good find is waiting.</p>'}</div><button class="button button-dark modal-submit" data-close-modal>Keep shopping ${icons.arrow}</button><button class="modal-text-button" data-logout>Sign out</button>` : `<div class="eyebrow"><span></span> YOUR POCKET ACCOUNT</div><h2 id="account-title">${accountMode === 'register' ? 'Make yourself at home.' : 'Welcome back.'}</h2><p class="modal-intro">${accountMode === 'register' ? 'Create an account to save your favorites and check out.' : 'Sign in to find your favorites and pick up where you left off.'}</p><form id="account-form" class="modal-form">${accountMode === 'register' ? '<label>Your name<input name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Jamie Parker" /></label>' : ''}<label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" autocomplete="${accountMode === 'register' ? 'new-password' : 'current-password'}" required minlength="8" placeholder="At least 8 characters" /></label><button class="button button-dark modal-submit" type="submit">${accountMode === 'register' ? 'Create account' : 'Sign in'} ${icons.arrow}</button></form><p class="modal-switch">${accountMode === 'register' ? 'Already have an account?' : 'New to Pocket?'} <button data-account-mode="${accountMode === 'register' ? 'login' : 'register'}">${accountMode === 'register' ? 'Sign in' : 'Create an account'}</button></p>`}</section></div>`
}

function renderOrderTracking(order) {
  const status = String(order.status || 'placed')
  const steps = ['placed', 'processing', 'shipped', 'delivered']
  const currentIndex = steps.indexOf(status)
  const orderDate = new Date(order.createdAt).toLocaleDateString()
  if (status === 'cancelled') return `<div class="order-tracking is-cancelled"><strong>Order cancelled</strong><p>This order will not move through delivery.</p></div>`
  const visibleIndex = currentIndex < 0 ? 0 : currentIndex
  return `<div class="order-tracking"><div class="tracking-heading"><strong>Order progress</strong><span>${escapeHtml(status.replaceAll('_', ' '))}</span></div><ol class="tracking-steps">${steps.map((step, index) => `<li class="${index < visibleIndex ? 'is-complete' : index === visibleIndex ? 'is-current' : ''}"><span class="tracking-marker"></span><strong>${step[0].toUpperCase() + step.slice(1)}</strong>${index === 0 ? `<small>${orderDate}</small>` : ''}</li>`).join('')}</ol><p>We’ll update this tracker as your order moves.</p></div>`
}

function renderProductReviews(product) {
  const reviewForm = currentUser
    ? myProductReview
      ? `<div class="review-thanks"><strong>Your rating</strong><span class="review-stars" aria-label="${myProductReview.rating} out of 5 stars">${'★'.repeat(myProductReview.rating)}${'☆'.repeat(5 - myProductReview.rating)}</span><p>${escapeHtml(myProductReview.comment || 'Thanks for sharing your rating.')}</p></div>`
      : `<form id="product-review-form" class="product-review-form"><fieldset><legend>Your rating</legend><div class="review-star-picker" role="group" aria-label="Choose a rating from one to five stars">${[1, 2, 3, 4, 5].map(value => `<button type="button" class="review-star ${selectedRating >= value ? 'is-selected' : ''}" data-rating-value="${value}" aria-label="${value} ${value === 1 ? 'star' : 'stars'}" aria-pressed="${selectedRating === value}">★</button>`).join('')}</div></fieldset><label for="review-comment">Your review <span>optional</span></label><textarea id="review-comment" name="comment" maxlength="500" rows="4" placeholder="What do you love about this phone?"></textarea><button class="button button-dark" type="submit">Share your rating ${icons.arrow}</button></form>`
    : `<div class="review-signin"><p>Sign in to share a rating for this phone.</p><button class="button button-dark" type="button" data-account>Sign in ${icons.arrow}</button></div>`
  const reviewList = productReviews.length
    ? productReviews.map(review => `<article class="customer-review"><div class="customer-review-head"><strong>${escapeHtml(review.userName)}</strong><span class="review-stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><small>${new Date(review.createdAt).toLocaleDateString()}</small><p>${escapeHtml(review.comment || 'Rated this phone.')}</p></article>`).join('')
    : '<p class="no-product-reviews">No written reviews yet. Be the first to share a note.</p>'
  return `<section class="product-reviews" id="reviews"><div class="eyebrow"><span></span> CUSTOMER NOTES</div><div class="product-reviews-heading"><div><h2>Ratings &amp; reviews.</h2><p>Real thoughts from Pocket customers.</p></div><div class="product-review-average"><strong>★ ${escapeHtml(product.rating)}</strong><span>${product.reviews} ratings</span></div></div><div class="product-review-columns"><div class="product-review-compose"><h3>Rate this phone</h3>${reviewForm}</div><div class="product-review-list">${reviewList}</div></div></section>`
}

async function submitProductReview(event) {
  event.preventDefault()
  if (!selectedRating) return toast('Choose a star rating first.')
  const comment = new FormData(event.currentTarget).get('comment')
  try {
    const result = await api(`/products/${encodeURIComponent(selectedProductId)}/reviews`, {
      method: 'POST', body: JSON.stringify({ rating: selectedRating, comment }),
    })
    products = products.map(product => String(product.id) === String(result.product.id) ? result.product : product)
    productReviews = [result.review, ...productReviews]
    myProductReview = result.review
    selectedRating = 0
    render()
    toast('Thanks for sharing your rating ✨')
  } catch (error) { toast(error.message) }
}

function checkoutModal() {
  const subtotal = cart.reduce((sum, item) => sum + (products.find(p => String(p.id) === String(item.id))?.price || 0) * item.qty, 0)
  return `<div class="modal-backdrop" data-close-modal><section class="store-modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button class="modal-close" data-close-modal aria-label="Close">${icons.close}</button><div class="eyebrow"><span></span> DELIVERY DETAILS</div><h2 id="checkout-title">One last little thing.</h2><p class="modal-intro">Your total is <strong>${money(subtotal)}</strong>.</p><form id="checkout-form" class="modal-form address-form"><label>Full name<input name="fullName" autocomplete="name" required maxlength="100" value="${escapeHtml(currentUser?.name || '')}" /></label><label>Phone<input name="phone" type="tel" autocomplete="tel" required maxlength="24" /></label><label class="full-field">Street address<input name="address" autocomplete="street-address" required maxlength="200" /></label><label>City<input name="city" autocomplete="address-level2" required maxlength="80" /></label><label>Postal code<input name="postalCode" autocomplete="postal-code" required maxlength="20" /></label><label class="full-field">Country<input name="country" autocomplete="country-name" required maxlength="80" /></label><fieldset class="payment-methods full-field"><legend>PAYMENT METHOD</legend><label><input type="radio" name="paymentMethod" value="cash_on_delivery" ${selectedPaymentMethod === 'cash_on_delivery' ? 'checked' : ''}/> <span><strong>Cash on delivery</strong><small>Pay when your phone arrives</small></span></label><label class="${paymentConfig.razorpayEnabled ? '' : 'payment-method-disabled'}"><input type="radio" name="paymentMethod" value="razorpay" ${selectedPaymentMethod === 'razorpay' ? 'checked' : ''} ${paymentConfig.razorpayEnabled ? '' : 'disabled'}/> <span><strong>Pay online with Razorpay</strong><small>${paymentConfig.razorpayEnabled ? `${paymentConfig.currency === 'INR' ? 'Cards, UPI and more' : 'Cards · International payments'} · ${escapeHtml(paymentConfig.currency)}` : 'Razorpay keys are not configured yet'}</small></span></label></fieldset><button class="button button-dark modal-submit full-field" type="submit">${selectedPaymentMethod === 'razorpay' ? `Pay securely · ${money(subtotal)}` : `Place order · ${money(subtotal)}`} ${icons.arrow}</button></form><p class="payment-note">Online payments are securely processed by Razorpay. Your order is saved after payment is verified.</p></section></div>`
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) }

async function submitAccount(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = Object.fromEntries(form.entries())
  try {
    const result = await api(accountMode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(payload) })
    token = result.token
    sessionStorage.setItem('pocket-token', token)
    currentUser = result.user
    const [profile, savedCart, orders] = await Promise.all([api('/auth/me'), api('/cart'), api('/orders')])
    const merged = new Map(savedCart.items.map(item => [String(item.product.id), item.qty]))
    for (const item of cart) merged.set(String(item.id), Math.min(20, (merged.get(String(item.id)) || 0) + item.qty))
    if (pendingCartProductId) {
      const product = products.find(item => String(item.id) === pendingCartProductId)
      if (product) merged.set(pendingCartProductId, (merged.get(pendingCartProductId) || 0) + 1)
    }
    cart = [...merged].map(([id, qty]) => ({ id, qty }))
    if (cart.length) await syncCart()
    const persistedCart = await api('/cart')
    cart = persistedCart.items.map(item => ({ id: String(item.product.id), qty: item.qty }))
    const addedAfterSignIn = Boolean(pendingCartProductId)
    pendingCartProductId = ''
    favorites = new Set(profile.favorites)
    orderHistory = orders
    accountOpen = false
    cartOpen = openCartAfterSignIn
    openCartAfterSignIn = false
    if (selectedProductId) await loadProductReviews(selectedProductId, false)
    render()
    toast(addedAfterSignIn ? 'Signed in. Your phone is saved to your bag.' : `Welcome${currentUser.name ? `, ${currentUser.name.split(' ')[0]}` : ''}! You’re signed in.`)
  } catch (error) { toast(error.message) }
}

async function submitCheckout(event) {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.currentTarget).entries())
  const submitButton = event.currentTarget.querySelector('[type="submit"]')
  if (submitButton) submitButton.disabled = true
  try {
    if (data.paymentMethod === 'razorpay') {
      if (!paymentConfig.razorpayEnabled) throw new Error('Razorpay is not configured yet. Add your Razorpay test keys to the server environment.')
      await loadRazorpayScript()
      const checkoutOrder = await api('/payments/razorpay/orders', { method: 'POST', body: JSON.stringify({ shippingAddress: data }) })
      const checkout = new window.Razorpay({
        key: checkoutOrder.keyId,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        name: checkoutOrder.storeName,
        description: 'Pocket mobile order',
        order_id: checkoutOrder.razorpayOrderId,
        prefill: { name: checkoutOrder.customer.name, email: checkoutOrder.customer.email, contact: data.phone },
        theme: { color: '#29352b' },
        handler: async response => {
          try {
            const result = await api('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify({ attemptId: checkoutOrder.attemptId, ...response }) })
            const [savedCart, orders] = await Promise.all([api('/cart'), api('/orders')])
            cart = savedCart.items.map(item => ({ id: String(item.product.id), qty: item.qty }))
            orderHistory = orders
            checkoutOpen = false
            selectedPaymentMethod = 'cash_on_delivery'
            render()
            toast(`Payment verified. Order ${String(result.order.id).slice(-7).toUpperCase()} placed ✨`)
          } catch (error) {
            if (submitButton) submitButton.disabled = false
            toast(error.message)
          }
        },
        modal: { ondismiss: () => { if (submitButton) submitButton.disabled = false; toast('Payment not completed. Your saved bag is unchanged.') } },
      })
      checkout.on('payment.failed', response => { if (submitButton) submitButton.disabled = false; toast(response.error?.description || 'Payment failed. Your bag is still saved.') })
      checkout.open()
      return
    }
    const result = await api('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress: data }) })
    cart = []
    orderHistory = [result.order, ...orderHistory]
    checkoutOpen = false
    selectedPaymentMethod = 'cash_on_delivery'
    render()
    toast(`Order ${String(result.order.id).slice(-7).toUpperCase()} placed! Pay cash on delivery ✨`)
  } catch (error) { if (submitButton) submitButton.disabled = false; toast(error.message) }
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded. Check your connection and try again.'))
    document.head.appendChild(script)
  })
}

loadStore()
render()
