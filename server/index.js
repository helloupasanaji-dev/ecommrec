import 'dotenv/config'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const credentialsFile = resolve(root, 'atlas-credentials (5).env')
if (existsSync(credentialsFile)) dotenv.config({ path: credentialsFile })
dotenv.config({ path: resolve(root, '.env.local'), override: false })
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map(server => server.trim()).filter(Boolean))

const app = express()
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET is required. Add a long random value to .env.local.')

app.disable('x-powered-by')
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], baseUri: ["'self'"], formAction: ["'self'", 'https://api.razorpay.com'], frameAncestors: ["'self'"],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
    scriptSrc: ["'self'", 'https://checkout.razorpay.com'], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
    connectSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'], objectSrc: ["'none'"],
  } },
}))
app.use(express.json({ limit: '32kb' }))
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait a little and try again.' } })

const productSchema = new mongoose.Schema({
  _id: { type: String }, name: { type: String, required: true }, brand: { type: String, required: true },
  color: { type: String, required: true }, price: { type: Number, min: 0, required: true },
  oldPrice: { type: Number, min: 0, default: null }, badge: { type: String, default: null },
  rating: { type: String, default: '0.0' }, reviews: { type: Number, default: 0 },
  category: { type: String, required: true }, image: { type: String, required: true },
  tone: { type: String, default: 'gray' }, tag: { type: String, default: 'Popular' },
  stock: { type: Number, min: 0, default: 10 }, active: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false })

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  favorites: { type: [String], default: [] },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  active: { type: Boolean, default: true },
}, { timestamps: true })

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  items: [{ productId: String, quantity: { type: Number, min: 1, max: 20 } }],
}, { timestamps: true })

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ productId: String, name: String, quantity: Number, unitPrice: Number }],
  subtotal: { type: Number, required: true },
  currency: { type: String, default: 'USD', maxlength: 3 },
  shippingAddress: {
    fullName: { type: String, required: true, maxlength: 100 }, phone: { type: String, required: true, maxlength: 24 },
    address: { type: String, required: true, maxlength: 200 }, city: { type: String, required: true, maxlength: 80 },
    postalCode: { type: String, required: true, maxlength: 20 }, country: { type: String, required: true, maxlength: 80 },
  },
  paymentMethod: { type: String, enum: ['cash_on_delivery', 'razorpay'], default: 'cash_on_delivery' },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)
const productReviewSchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true, trim: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })
productReviewSchema.index({ productId: 1, userId: 1 }, { unique: true })
const ProductReview = mongoose.model('ProductReview', productReviewSchema)
const User = mongoose.model('User', userSchema)
const Cart = mongoose.model('Cart', cartSchema)
const Order = mongoose.model('Order', orderSchema)
const paymentAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  subtotal: { type: Number, required: true },
  items: [{ productId: String, name: String, quantity: Number, unitPrice: Number }],
  shippingAddress: { fullName: String, phone: String, address: String, city: String, postalCode: String, country: String },
  status: { type: String, enum: ['created', 'paid', 'refunded'], default: 'created' },
  razorpayPaymentId: { type: String, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
}, { timestamps: true })
const PaymentAttempt = mongoose.model('PaymentAttempt', paymentAttemptSchema)
const Newsletter = mongoose.model('Newsletter', new mongoose.Schema({ email: { type: String, unique: true, required: true, lowercase: true, trim: true }, subscribed: { type: Boolean, default: true } }, { timestamps: true }))
const StoreSettings = mongoose.model('StoreSettings', new mongoose.Schema({
  _id: { type: String, default: 'store' }, storeName: { type: String, default: 'Pocket', maxlength: 80 },
  announcement: { type: String, default: 'A little upgrade, on us. Free shipping on every phone.', maxlength: 180 },
  contactEmail: { type: String, default: '', maxlength: 254 }, checkoutPaused: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false }))

const initialProducts = [
  { _id: '1', name: 'iPhone 16 Pro', brand: 'Apple', color: 'Natural Titanium · 256GB', price: 999, oldPrice: 1099, badge: 'BEST SELLER', rating: '4.9', reviews: 128, category: 'Apple', image: 'photo-1695048133142-1a20484d2569', tone: 'warm', tag: 'Popular' },
  { _id: '2', name: 'Galaxy S25 Ultra', brand: 'Samsung', color: 'Titanium Silver · 256GB', price: 1199, badge: 'JUST DROPPED', rating: '4.8', reviews: 86, category: 'Samsung', image: 'photo-1610945265064-0e34e5519bbf', tone: 'blue', tag: 'New' },
  { _id: '3', name: 'Pixel 9 Pro', brand: 'Google', color: 'Porcelain · 128GB', price: 899, oldPrice: 999, rating: '4.8', reviews: 92, category: 'Google', image: 'photo-1598327105666-5b89351aff97', tone: 'green', tag: 'Popular' },
  { _id: '4', name: 'iPhone 15', brand: 'Apple', color: 'Soft Pink · 128GB', price: 699, oldPrice: 799, badge: 'SAVE $100', rating: '4.7', reviews: 214, category: 'Apple', image: 'photo-1592750475338-74b7b21085ab', tone: 'pink', tag: 'Sale' },
  { _id: '5', name: 'Galaxy Z Flip6', brand: 'Samsung', color: 'Mint · 256GB', price: 899, oldPrice: 1099, badge: 'FRESH FIND', rating: '4.8', reviews: 73, category: 'Samsung', image: 'photo-1598327105666-5b89351aff97', tone: 'mint', tag: 'Sale' },
  { _id: '6', name: 'Pixel 8a', brand: 'Google', color: 'Bay Blue · 128GB', price: 499, oldPrice: 549, rating: '4.6', reviews: 168, category: 'Google', image: 'photo-1511707171634-5f897ff02aa9', tone: 'sky', tag: 'Popular' },
  { _id: '7', name: 'iPhone 16', brand: 'Apple', color: 'Ultramarine · 128GB', price: 799, badge: 'NEW COLOR', rating: '4.9', reviews: 104, category: 'Apple', image: 'photo-1605236453806-6ff36851218e', tone: 'violet', tag: 'New' },
  { _id: '8', name: 'Galaxy S24 FE', brand: 'Samsung', color: 'Graphite · 128GB', price: 599, oldPrice: 649, rating: '4.6', reviews: 91, category: 'Samsung', image: 'photo-1598327106026-d9521da673d1', tone: 'gray', tag: 'Popular' },
]

function getMongoUri() {
  let uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required in atlas-credentials (5).env or .env.local.')
  uri = uri.replace('<db_username>', encodeURIComponent(process.env.MONGODB_USERNAME || ''))
    .replace('<db_password>', encodeURIComponent(process.env.MONGODB_PASSWORD || ''))
  if (uri.includes('<db_username>') || uri.includes('<db_password>')) throw new Error('Set MONGODB_USERNAME and MONGODB_PASSWORD for the Atlas URI.')
  return uri
}

const razorpayCurrency = (process.env.RAZORPAY_CURRENCY || 'USD').trim().toUpperCase()
if (!['USD', 'INR'].includes(razorpayCurrency)) throw new Error('RAZORPAY_CURRENCY must be USD or INR so payment amounts match the store prices.')
function requireRazorpayKeys() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error('Online payments are not configured. Add Razorpay test keys to .env.local.'), { status: 503 })
  }
}

async function razorpayRequest(endpoint, method = 'GET', body) {
  requireRazorpayKeys()
  const authorization = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    method,
    headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error(`Razorpay request failed with status ${response.status}.`)
    throw Object.assign(new Error('Razorpay could not process this payment. Check the payment settings and try again.'), { status: 502 })
  }
  return payload
}

function razorpaySignature(orderId, paymentId) {
  return createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
}

function signaturesMatch(expectedHex, receivedHex) {
  if (typeof receivedHex !== 'string' || !/^[a-f\d]{64}$/i.test(receivedHex)) return false
  const expected = Buffer.from(expectedHex, 'hex')
  const received = Buffer.from(receivedHex, 'hex')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

function validateShippingAddress(address = {}) {
  const fields = ['fullName', 'phone', 'address', 'city', 'postalCode', 'country']
  const shippingAddress = {}
  for (const field of fields) {
    if (typeof address[field] !== 'string' || !address[field].trim() || address[field].trim().length > 200) {
      throw Object.assign(new Error(`Enter a valid ${field === 'fullName' ? 'name' : field}.`), { status: 400 })
    }
    shippingAddress[field] = address[field].trim()
  }
  return shippingAddress
}

const asProduct = doc => ({ ...doc.toObject(), id: doc._id })
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const makeToken = user => jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: '7d', issuer: 'pocket-store' })

const requireAuth = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' })
  try {
    const payload = jwt.verify(token, jwtSecret, { issuer: 'pocket-store' })
    req.user = await User.findById(payload.sub)
    if (!req.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    if (!req.user.active) return res.status(403).json({ error: 'This account has been disabled. Contact the store for help.' })
    next()
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
})

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }))
app.get('/api/payments/config', (req, res) => res.json({
  razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  currency: razorpayCurrency,
}))
app.get('/api/store', asyncRoute(async (req, res) => {
  const settings = await StoreSettings.findById('store').lean()
  res.json(settings || { storeName: 'Pocket', announcement: 'A little upgrade, on us. Free shipping on every phone.', contactEmail: '', checkoutPaused: false })
}))
app.get('/api/products', asyncRoute(async (req, res) => {
  const filter = { active: true }
  if (req.query.brand && ['Apple', 'Samsung', 'Google'].includes(req.query.brand)) filter.category = req.query.brand
  if (req.query.search) filter.$or = ['name', 'brand', 'color'].map(key => ({ [key]: { $regex: String(req.query.search).slice(0, 60), $options: 'i' } }))
  res.json((await Product.find(filter).sort({ createdAt: 1 })).map(asProduct))
}))
app.get('/api/products/:productId/reviews', asyncRoute(async (req, res) => {
  const product = await Product.findById(req.params.productId).select('_id active')
  if (!product || !product.active) return res.status(404).json({ error: 'Phone not found.' })
  const reviews = await ProductReview.find({ productId: product._id }).sort({ createdAt: -1 }).limit(50).select('userName rating comment createdAt').lean()
  res.json(reviews)
}))
app.get('/api/products/:productId/reviews/mine', requireAuth, asyncRoute(async (req, res) => {
  const review = await ProductReview.findOne({ productId: req.params.productId, userId: req.user._id }).select('userName rating comment createdAt').lean()
  res.json({ review })
}))
app.post('/api/products/:productId/reviews', requireAuth, asyncRoute(async (req, res) => {
  const rating = req.body?.rating
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Choose a rating from 1 to 5 stars.' })
  if (comment.length > 500) return res.status(400).json({ error: 'Keep your review under 500 characters.' })
  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(req.params.productId).session(session)
      if (!product || !product.active) throw Object.assign(new Error('Phone not found.'), { status: 404 })
      const existing = await ProductReview.findOne({ productId: product._id, userId: req.user._id }).session(session)
      if (existing) throw Object.assign(new Error('You have already rated this phone.'), { status: 409 })
      const [review] = await ProductReview.create([{
        productId: product._id, userId: req.user._id, userName: req.user.name, rating, comment,
      }], { session })
      const oldCount = Number(product.reviews) || 0
      const oldRating = Number(product.rating) || 0
      product.reviews = oldCount + 1
      product.rating = (((oldRating * oldCount) + rating) / product.reviews).toFixed(1)
      await product.save({ session })
      result = { review: { userName: review.userName, rating: review.rating, comment: review.comment, createdAt: review.createdAt }, product: asProduct(product) }
    })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'You have already rated this phone.' })
    throw error
  } finally {
    await session.endSession()
  }
  res.status(201).json(result)
}))

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const { name, email, password } = req.body || {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: 'Enter your name (2–80 characters).' })
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  const normalizedEmail = email.toLowerCase().trim()
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ error: 'An account with that email already exists.' })
  const role = process.env.ADMIN_EMAIL?.toLowerCase().trim() === normalizedEmail ? 'admin' : 'customer'
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role })
  res.status(201).json({ token: makeToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } })
}))

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
  if (!user.active) return res.status(403).json({ error: 'This account has been disabled. Contact the store for help.' })
  if (process.env.ADMIN_EMAIL?.toLowerCase().trim() === user.email && user.role !== 'admin') {
    user.role = 'admin'
    await user.save()
  }
  res.json({ token: makeToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } })
}))

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  if (process.env.ADMIN_EMAIL?.toLowerCase().trim() === req.user.email && req.user.role !== 'admin') {
    req.user.role = 'admin'
    await req.user.save()
  }
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }, favorites: req.user.favorites })
}))
app.put('/api/auth/favorites/:productId', requireAuth, asyncRoute(async (req, res) => {
  const id = String(req.params.productId)
  if (!(await Product.exists({ _id: id, active: true }))) return res.status(404).json({ error: 'Phone not found.' })
  req.user.favorites = req.user.favorites.includes(id) ? req.user.favorites.filter(x => x !== id) : [...req.user.favorites, id]
  await req.user.save()
  res.json({ favorites: req.user.favorites })
}))

app.get('/api/cart', requireAuth, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id }).lean()
  if (!cart) return res.json({ items: [] })
  const products = await Product.find({ _id: { $in: cart.items.map(item => item.productId) }, active: true }).lean()
  const byId = new Map(products.map(p => [p._id, p]))
  res.json({ items: cart.items.filter(item => byId.has(item.productId)).map(item => ({ product: { ...byId.get(item.productId), id: byId.get(item.productId)._id }, qty: item.quantity })) })
}))

app.put('/api/cart', requireAuth, asyncRoute(async (req, res) => {
  const entries = req.body?.items
  if (!Array.isArray(entries) || entries.length > 30) return res.status(400).json({ error: 'Cart must contain up to 30 items.' })
  const clean = []
  for (const entry of entries) {
    const productId = String(entry?.productId ?? '')
    const quantity = Number(entry?.quantity)
    if (!/^\d+$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: 'Cart item or quantity is invalid.' })
    const product = await Product.findOne({ _id: productId, active: true })
    if (!product) return res.status(400).json({ error: 'A phone in your cart is no longer available.' })
    if (quantity > product.stock) return res.status(409).json({ error: `Only ${product.stock} ${product.name} in stock.` })
    clean.push({ productId, quantity })
  }
  const cart = await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: clean }, $setOnInsert: { userId: req.user._id } }, { upsert: true, new: true, runValidators: true })
  res.json({ count: cart.items.reduce((n, x) => n + x.quantity, 0) })
}))

app.post('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const storeSettings = await StoreSettings.findById('store').lean()
  if (storeSettings?.checkoutPaused) return res.status(503).json({ error: 'Checkout is temporarily paused. Please try again soon.' })
  const address = req.body?.shippingAddress || {}
  const fields = ['fullName', 'phone', 'address', 'city', 'postalCode', 'country']
  const shippingAddress = {}
  for (const field of fields) {
    if (typeof address[field] !== 'string' || !address[field].trim() || address[field].trim().length > 200) return res.status(400).json({ error: `Enter a valid ${field === 'fullName' ? 'name' : field}.` })
    shippingAddress[field] = address[field].trim()
  }
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ userId: req.user._id }).session(session)
      if (!cart?.items.length) throw Object.assign(new Error('Your bag is empty.'), { status: 400 })
      const products = await Product.find({ _id: { $in: cart.items.map(item => item.productId) }, active: true }).session(session)
      const byId = new Map(products.map(p => [p._id, p]))
      if (cart.items.some(item => !byId.has(item.productId))) throw Object.assign(new Error('A phone in your bag is no longer available. Refresh your bag and try again.'), { status: 409 })
      const orderItems = cart.items.map(item => {
        const product = byId.get(item.productId)
        if (item.quantity > product.stock) throw Object.assign(new Error(`Only ${product.stock} ${product.name} in stock.`), { status: 409 })
        return { productId: product._id, name: product.name, quantity: item.quantity, unitPrice: product.price }
      })
      for (const item of cart.items) {
        const updated = await Product.updateOne({ _id: item.productId, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session })
        if (updated.modifiedCount !== 1) throw Object.assign(new Error('Stock changed while checking out. Please try again.'), { status: 409 })
      }
      const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      ;[order] = await Order.create([{ userId: req.user._id, items: orderItems, subtotal, shippingAddress }], { session })
      await Cart.updateOne({ userId: req.user._id }, { $set: { items: [] } }, { session })
    })
  } finally {
    await session.endSession()
  }
  res.status(201).json({ order: { id: order._id, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, subtotal: order.subtotal, items: order.items, createdAt: order.createdAt } })
}))

app.post('/api/payments/razorpay/orders', requireAuth, asyncRoute(async (req, res) => {
  requireRazorpayKeys()
  const storeSettings = await StoreSettings.findById('store').lean()
  if (storeSettings?.checkoutPaused) return res.status(503).json({ error: 'Checkout is temporarily paused. Please try again soon.' })
  const shippingAddress = validateShippingAddress(req.body?.shippingAddress)
  const cart = await Cart.findOne({ userId: req.user._id }).lean()
  if (!cart?.items.length) return res.status(400).json({ error: 'Your saved bag is empty. Add a phone before paying.' })
  const products = await Product.find({ _id: { $in: cart.items.map(item => item.productId) }, active: true }).lean()
  const byId = new Map(products.map(product => [product._id, product]))
  if (cart.items.some(item => !byId.has(item.productId))) return res.status(409).json({ error: 'A phone in your bag is no longer available. Refresh your bag and try again.' })
  const items = cart.items.map(item => {
    const product = byId.get(item.productId)
    if (item.quantity > product.stock) throw Object.assign(new Error(`Only ${product.stock} ${product.name} in stock.`), { status: 409 })
    return { productId: product._id, name: product.name, quantity: item.quantity, unitPrice: product.price }
  })
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const amount = Math.round(subtotal * 100)
  if (!Number.isSafeInteger(amount) || amount < 100) return res.status(400).json({ error: 'The payment total must be at least 1 currency unit.' })
  const attemptId = new mongoose.Types.ObjectId()
  const gatewayOrder = await razorpayRequest('/orders', 'POST', {
    amount,
    currency: razorpayCurrency,
    receipt: `pocket-${attemptId.toString()}`,
    notes: { pocketPaymentAttempt: attemptId.toString(), userId: req.user._id.toString() },
  })
  await PaymentAttempt.create({
    _id: attemptId, userId: req.user._id, razorpayOrderId: gatewayOrder.id, amount, currency: razorpayCurrency,
    subtotal, items, shippingAddress,
  })
  res.status(201).json({
    attemptId: attemptId.toString(), razorpayOrderId: gatewayOrder.id, amount: gatewayOrder.amount,
    currency: gatewayOrder.currency, keyId: process.env.RAZORPAY_KEY_ID,
    storeName: storeSettings?.storeName || 'Pocket', customer: { name: req.user.name, email: req.user.email },
  })
}))

app.post('/api/payments/razorpay/verify', requireAuth, asyncRoute(async (req, res) => {
  requireRazorpayKeys()
  const { attemptId, razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {}
  if (!/^[a-f\d]{24}$/i.test(String(attemptId || '')) || ![gatewayOrderId, paymentId].every(value => typeof value === 'string' && value.length <= 100)) {
    return res.status(400).json({ error: 'The Razorpay payment details are incomplete.' })
  }
  const attempt = await PaymentAttempt.findOne({ _id: attemptId, userId: req.user._id })
  if (!attempt || attempt.razorpayOrderId !== gatewayOrderId) return res.status(404).json({ error: 'Payment order not found for this account.' })
  if (!signaturesMatch(razorpaySignature(attempt.razorpayOrderId, paymentId), signature)) return res.status(400).json({ error: 'Razorpay signature verification failed.' })
  if (attempt.status === 'paid' && attempt.orderId) {
    const existingOrder = await Order.findById(attempt.orderId).lean()
    if (existingOrder) return res.json({ order: { id: existingOrder._id, status: existingOrder.status, paymentMethod: existingOrder.paymentMethod, paymentStatus: existingOrder.paymentStatus, subtotal: existingOrder.subtotal, items: existingOrder.items, createdAt: existingOrder.createdAt } })
  }
  if (attempt.status === 'refunded') return res.status(409).json({ error: 'This payment has already been refunded.' })

  let payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`)
  if (payment.order_id !== attempt.razorpayOrderId || payment.amount !== attempt.amount || payment.currency !== attempt.currency) {
    return res.status(400).json({ error: 'Payment details do not match this order.' })
  }
  if (payment.status === 'authorized') {
    payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, 'POST', { amount: attempt.amount, currency: attempt.currency })
  }
  if (payment.status !== 'captured') return res.status(409).json({ error: 'Razorpay has not captured this payment yet. Please wait and check your payment status.' })

  let order
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const savedAttempt = await PaymentAttempt.findOne({ _id: attempt._id, userId: req.user._id }).session(session)
      if (savedAttempt.status === 'paid' && savedAttempt.orderId) {
        order = await Order.findById(savedAttempt.orderId).session(session)
        return
      }
      const productIds = savedAttempt.items.map(item => item.productId)
      const currentProducts = await Product.find({ _id: { $in: productIds }, active: true }).session(session)
      const currentById = new Map(currentProducts.map(product => [product._id, product]))
      if (savedAttempt.items.some(item => !currentById.has(item.productId))) throw Object.assign(new Error('A phone is no longer available. Payment will be refunded.'), { status: 409 })
      for (const item of savedAttempt.items) {
        const product = currentById.get(item.productId)
        if (item.quantity > product.stock) throw Object.assign(new Error(`Only ${product.stock} ${product.name} in stock. Payment will be refunded.`), { status: 409 })
        const updated = await Product.updateOne({ _id: item.productId, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session })
        if (updated.modifiedCount !== 1) throw Object.assign(new Error('Stock changed during payment. Payment will be refunded.'), { status: 409 })
      }
      ;[order] = await Order.create([{
        userId: req.user._id, items: savedAttempt.items, subtotal: savedAttempt.subtotal, currency: savedAttempt.currency,
        shippingAddress: savedAttempt.shippingAddress, paymentMethod: 'razorpay', paymentStatus: 'paid',
        status: 'placed', razorpayOrderId: savedAttempt.razorpayOrderId, razorpayPaymentId: paymentId,
      }], { session })
      const savedCart = await Cart.findOne({ userId: req.user._id }).session(session)
      if (savedCart) {
        const purchased = new Map(savedAttempt.items.map(item => [item.productId, item.quantity]))
        savedCart.items = savedCart.items.map(item => ({ productId: item.productId, quantity: item.quantity - (purchased.get(item.productId) || 0) })).filter(item => item.quantity > 0)
        await savedCart.save({ session })
      }
      savedAttempt.status = 'paid'
      savedAttempt.razorpayPaymentId = paymentId
      savedAttempt.orderId = order._id
      await savedAttempt.save({ session })
    })
  } catch (error) {
    if (error.status === 409) {
      await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, 'POST', { amount: attempt.amount, notes: { reason: 'Pocket inventory changed before payment confirmation' } })
      await PaymentAttempt.updateOne({ _id: attempt._id }, { $set: { status: 'refunded', razorpayPaymentId: paymentId } })
      return res.status(409).json({ error: `${error.message} Razorpay has started a refund.` })
    }
    throw error
  } finally {
    await session.endSession()
  }
  res.status(201).json({ order: { id: order._id, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, subtotal: order.subtotal, items: order.items, createdAt: order.createdAt } })
}))

app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()
  res.json(orders.map(({ _id, userId, ...order }) => ({ id: _id, ...order })))
}))

app.post('/api/newsletter', asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' })
  await Newsletter.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true })
  res.status(202).json({ message: 'You’re on the list.' })
}))

const requireAdmin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' })
app.get('/api/admin/products', requireAuth, requireAdmin, asyncRoute(async (req, res) => res.json((await Product.find().sort({ createdAt: 1 })).map(asProduct))))
app.post('/api/admin/products', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { id, name, brand, color, price, oldPrice = null, badge = null, rating = '0.0', reviews = 0, category, image, tone = 'gray', tag = 'Popular', stock = 10 } = req.body || {}
  if (!/^\d{1,24}$/.test(String(id)) || ![name, brand, color, category, image].every(x => typeof x === 'string' && x.trim()) || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return res.status(400).json({ error: 'Product details are invalid.' })
  const product = await Product.create({ _id: String(id), name, brand, color, price: Number(price), oldPrice: oldPrice === null ? null : Number(oldPrice), badge, rating: String(rating), reviews: Number(reviews), category, image, tone, tag, stock })
  res.status(201).json(asProduct(product))
}))
app.patch('/api/admin/products/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const allowed = ['name', 'brand', 'color', 'price', 'oldPrice', 'badge', 'rating', 'reviews', 'category', 'image', 'tone', 'tag', 'stock', 'active']
  const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)))
  if (!Object.keys(update).length) return res.status(400).json({ error: 'No editable product fields supplied.' })
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
  if (!product) return res.status(404).json({ error: 'Phone not found.' })
  res.json(asProduct(product))
}))
app.get('/api/admin/orders', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'name email').lean()
  res.json(orders.map(({ _id, userId, ...order }) => ({ id: _id, customer: userId, ...order })))
}))
app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const update = {}
  if (['placed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(req.body?.status)) update.status = req.body.status
  if (['pending', 'paid', 'refunded'].includes(req.body?.paymentStatus)) update.paymentStatus = req.body.paymentStatus
  if (!Object.keys(update).length) return res.status(400).json({ error: 'Provide a valid order or payment status.' })
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      order = await Order.findById(req.params.id).session(session)
      if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 })
      if (order.status === 'cancelled' && update.status && update.status !== 'cancelled') throw Object.assign(new Error('A cancelled order cannot be reopened.'), { status: 409 })
      if (update.status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session })
      }
      Object.assign(order, update)
      await order.save({ session })
    })
  } finally {
    await session.endSession()
  }
  const { _id, userId, ...data } = order.toObject()
  res.json({ id: _id, ...data })
}))
app.get('/api/admin/overview', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [products, users, orders, subscribers] = await Promise.all([
    Product.find({ active: true }).select('stock').lean(), User.countDocuments(), Order.find().select('subtotal status paymentStatus').lean(), Newsletter.countDocuments({ subscribed: true }),
  ])
  res.json({ products: products.length, users, orders: orders.length, openOrders: orders.filter(o => ['placed', 'processing'].includes(o.status)).length, revenue: orders.reduce((sum, o) => sum + o.subtotal, 0), lowStock: products.filter(p => p.stock < 4).length, subscribers })
}))

app.get('/api/admin/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [users, orderCounts] = await Promise.all([
    User.find().sort({ createdAt: -1 }).select('name email role active favorites createdAt').lean(),
    Order.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]),
  ])
  const counts = new Map(orderCounts.map(item => [String(item._id), item.count]))
  res.json(users.map(({ _id, ...user }) => ({ id: _id, ...user, orderCount: counts.get(String(_id)) || 0 })))
}))

app.patch('/api/admin/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'User ID is invalid.' })
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found.' })
  const { role, active } = req.body || {}
  if (role !== undefined && !['customer', 'admin'].includes(role)) return res.status(400).json({ error: 'Choose customer or admin.' })
  if (active !== undefined && typeof active !== 'boolean') return res.status(400).json({ error: 'Account status must be active or disabled.' })
  if (String(user._id) === String(req.user._id) && (role === 'customer' || active === false)) return res.status(400).json({ error: 'You cannot disable or demote your own admin account.' })
  if (user.role === 'admin' && role === 'customer' && await User.countDocuments({ role: 'admin', active: true }) <= 1) return res.status(400).json({ error: 'The store must keep at least one active admin.' })
  if (role !== undefined) user.role = role
  if (active !== undefined) user.active = active
  await user.save()
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, active: user.active })
}))

app.get('/api/admin/payments', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const [orders, attempts] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).populate('userId', 'name email').lean(),
    PaymentAttempt.find({ status: 'created' }).sort({ createdAt: -1 }).populate('userId', 'name email').lean(),
  ])
  res.json([
    ...attempts.map(({ _id, userId, subtotal, currency, razorpayOrderId, createdAt }) => ({ id: _id, customer: userId, total: subtotal, currency, paymentMethod: 'razorpay', paymentStatus: 'pending', orderStatus: 'checkout started', razorpayOrderId, isPaymentAttempt: true, createdAt })),
    ...orders.map(({ _id, userId, subtotal, currency, paymentMethod, paymentStatus, status, createdAt }) => ({ id: _id, customer: userId, total: subtotal, currency: currency || 'USD', paymentMethod, paymentStatus, orderStatus: status, isPaymentAttempt: false, createdAt })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
}))

app.patch('/api/admin/payments/:orderId', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const paymentStatus = req.body?.paymentStatus
  if (!['pending', 'paid', 'refunded'].includes(paymentStatus)) return res.status(400).json({ error: 'Choose pending, paid, or refunded.' })
  const order = await Order.findById(req.params.orderId)
  if (!order) return res.status(404).json({ error: 'Payment record not found.' })
  if (order.paymentMethod === 'razorpay' && paymentStatus !== 'refunded' && paymentStatus !== order.paymentStatus) return res.status(400).json({ error: 'Razorpay payment status is managed from verified gateway events.' })
  if (order.paymentMethod === 'razorpay' && order.paymentStatus === 'refunded' && paymentStatus !== 'refunded') return res.status(400).json({ error: 'A refunded Razorpay payment cannot be changed back.' })
  if (order.paymentMethod === 'razorpay' && paymentStatus === 'refunded' && order.paymentStatus !== 'refunded') {
    if (!order.razorpayPaymentId || order.paymentStatus !== 'paid') return res.status(409).json({ error: 'Only a verified, captured Razorpay payment can be refunded.' })
    await razorpayRequest(`/payments/${encodeURIComponent(order.razorpayPaymentId)}/refund`, 'POST', { amount: Math.round(order.subtotal * 100), notes: { orderId: order._id.toString() } })
  }
  order.paymentStatus = paymentStatus
  await order.save()
  res.json({ id: order._id, paymentStatus: order.paymentStatus })
}))

app.get('/api/admin/newsletter', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const subscribers = await Newsletter.find().sort({ createdAt: -1 }).lean()
  res.json(subscribers.map(({ _id, ...item }) => ({ id: _id, ...item })))
}))

app.patch('/api/admin/newsletter/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  if (typeof req.body?.subscribed !== 'boolean') return res.status(400).json({ error: 'Subscription status must be active or paused.' })
  const item = await Newsletter.findByIdAndUpdate(req.params.id, { subscribed: req.body.subscribed }, { new: true, runValidators: true }).lean()
  if (!item) return res.status(404).json({ error: 'Subscriber not found.' })
  res.json({ id: item._id, email: item.email, subscribed: item.subscribed })
}))

app.patch('/api/admin/store', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const allowed = ['storeName', 'announcement', 'contactEmail', 'checkoutPaused']
  const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)))
  if (!Object.keys(update).length) return res.status(400).json({ error: 'No store settings supplied.' })
  if ('storeName' in update && (typeof update.storeName !== 'string' || !update.storeName.trim() || update.storeName.length > 80)) return res.status(400).json({ error: 'Store name must be 1–80 characters.' })
  if ('announcement' in update && (typeof update.announcement !== 'string' || update.announcement.length > 180)) return res.status(400).json({ error: 'Announcement must be 180 characters or less.' })
  if ('contactEmail' in update && typeof update.contactEmail !== 'string') return res.status(400).json({ error: 'Support email is invalid.' })
  if ('checkoutPaused' in update && typeof update.checkoutPaused !== 'boolean') return res.status(400).json({ error: 'Checkout setting must be on or off.' })
  if (update.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.contactEmail)) return res.status(400).json({ error: 'Enter a valid support email.' })
  const settings = await StoreSettings.findByIdAndUpdate('store', { $set: update }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean()
  res.json(settings)
}))

const builtSite = resolve(root, 'dist')
if (existsSync(resolve(builtSite, 'index.html'))) {
  app.use(express.static(builtSite, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => req.accepts('html') ? res.sendFile(resolve(builtSite, 'index.html')) : next())
}

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }))
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  const status = error.status || (error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : 500)
  if (status >= 500) console.error('API request failed:', error.message)
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message })
})

async function start() {
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 })
  if (await Product.estimatedDocumentCount() === 0) await Product.insertMany(initialProducts)
  app.listen(port, host, () => console.log(`Pocket API ready on http://${host}:${port}`))
}

start().catch(error => {
  console.error('Could not start Pocket API:', error.message)
  process.exit(1)
})
