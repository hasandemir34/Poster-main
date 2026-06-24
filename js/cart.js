const CART_KEY = 'framely:cart';
const ORDERS_KEY = 'framely:orders';

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || 'null');
}

export function setCart(item) {
  localStorage.setItem(CART_KEY, JSON.stringify(item));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function getOrders() {
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
}

export function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return order;
}

export function createOrder({ user, cart, address, payment }) {
  const order = {
    id: 'FRM-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    preset: cart.preset,
    presetName: cart.presetName,
    presetDesc: cart.presetDesc,
    quantity: cart.quantity || 1,
    price: cart.price,
    total: cart.price * (cart.quantity || 1),
    address,
    cardLast4: payment.cardNumber.slice(-4),
    status: 'Hazırlanıyor',
    createdAt: new Date().toISOString(),
  };
  saveOrder(order);
  clearCart();
  return order;
}
