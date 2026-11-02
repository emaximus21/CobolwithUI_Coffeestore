const previewProducts = [
  { id: 'espresso-machine', name: 'Espresso machine', priceCents: 18500, stock: 8, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=300&q=80', description: 'A little ritual, made at home.' },
  { id: 'ceramic-mug', name: 'Ceramic mug', priceCents: 1250, stock: 12, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=300&q=80', description: 'Hand-finished stoneware.' },
  { id: 'coffee-beans', name: 'Coffee beans', priceCents: 1600, stock: 20, image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80', description: 'A bright, balanced house roast.' },
];

let products = previewProducts.map((product) => ({ ...product }));
const startingStock = new Map(previewProducts.map((product) => [product.id, product.stock]));
const basket = new Map();
let backendReady = false;
let ordering = false;

const productList = document.querySelector('#product-list');
const basketItems = document.querySelector('#basket-items');
const placeOrderButton = document.querySelector('#place-order');
const resetStockButton = document.querySelector('#reset-stock');
const resetStatus = document.querySelector('#reset-status');
const checkoutMessage = document.querySelector('#checkout-message');
const connectionStatus = document.querySelector('#connection-status');
const previewNotice = document.querySelector('#preview-notice');
const receipt = document.querySelector('#receipt');

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function renderProducts() {
  productList.replaceChildren(...products.map((product) => {
    const article = document.createElement('article');
    article.className = 'product';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.image || previewProducts.find((item) => item.id === product.id).image;
    image.alt = product.name;
    image.loading = 'lazy';

    const copy = document.createElement('div');
    copy.className = 'product-copy';
    const name = document.createElement('h3');
    name.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = previewProducts.find((item) => item.id === product.id).description;
    const meta = document.createElement('div');
    meta.className = 'product-meta';
    const price = document.createElement('span');
    price.textContent = formatMoney(product.priceCents);
    const stock = document.createElement('span');
    stock.textContent = `${product.stock} in stock`;
    if (product.stock < 5) stock.className = 'stock-low';
    meta.append(price, stock);
    copy.append(name, description, meta);

    const addButton = document.createElement('button');
    addButton.className = 'add-button';
    addButton.type = 'button';
    addButton.textContent = 'Add to basket';
    addButton.disabled = product.stock === 0 || (basket.get(product.id) || 0) >= product.stock;
    addButton.addEventListener('click', () => {
      basket.set(product.id, (basket.get(product.id) || 0) + 1);
      checkoutMessage.textContent = '';
      receipt.hidden = true;
      render();
    });

    article.append(image, copy, addButton);
    return article;
  }));
}

function renderBasket() {
  const entries = [...basket.entries()].filter(([, quantity]) => quantity > 0);
  document.querySelector('#basket-count').textContent = String(entries.reduce((sum, [, quantity]) => sum + quantity, 0));
  const total = entries.reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return sum + product.priceCents * quantity;
  }, 0);
  document.querySelector('#basket-total').textContent = formatMoney(total);

  if (entries.length === 0) {
    basketItems.innerHTML = '<p class="empty-state">Your basket is empty.</p>';
  } else {
    basketItems.replaceChildren(...entries.map(([id, quantity]) => {
      const product = products.find((item) => item.id === id);
      const row = document.createElement('div');
      row.className = 'basket-line';
      const label = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'basket-line-name';
      name.textContent = product.name;
      const subtotal = document.createElement('div');
      subtotal.className = 'basket-line-sub';
      subtotal.textContent = formatMoney(product.priceCents * quantity);
      label.append(name, subtotal);

      const controls = document.createElement('div');
      controls.className = 'quantity-controls';
      const decrement = document.createElement('button');
      decrement.type = 'button';
      decrement.textContent = '−';
      decrement.setAttribute('aria-label', `Remove one ${product.name}`);
      decrement.addEventListener('click', () => changeQuantity(id, -1));
      const count = document.createElement('span');
      count.textContent = String(quantity);
      const increment = document.createElement('button');
      increment.type = 'button';
      increment.textContent = '+';
      increment.setAttribute('aria-label', `Add one ${product.name}`);
      increment.disabled = quantity >= product.stock;
      increment.addEventListener('click', () => changeQuantity(id, 1));
      controls.append(decrement, count, increment);
      row.append(label, controls);
      return row;
    }));
  }
  placeOrderButton.disabled = !backendReady || ordering || entries.length === 0;
  resetStockButton.disabled = !backendReady || ordering;
}

function changeQuantity(id, change) {
  const next = (basket.get(id) || 0) + change;
  if (next <= 0) basket.delete(id);
  else basket.set(id, next);
  checkoutMessage.textContent = '';
  receipt.hidden = true;
  render();
}

function render() {
  renderProducts();
  renderBasket();
  const sold = products.reduce((sum, product) => sum + startingStock.get(product.id) - product.stock, 0);
  document.querySelector('#items-sold').textContent = String(sold);
}

async function connectToApi() {
  if (window.location.protocol === 'file:') {
    previewNotice.hidden = false;
    previewNotice.textContent = 'Browser-only preview. Checkout is disabled here; open the Codespace app to use the API and GnuCOBOL backend.';
    render();
    return;
  }

  try {
    const [statusResponse, productsResponse] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/products'),
    ]);
    const status = await statusResponse.json();
    const catalog = await productsResponse.json();
    if (Array.isArray(catalog.products)) {
      products = catalog.products.map((product) => ({ ...product }));
    }
    backendReady = statusResponse.ok && status.cobolConnected === true;
    resetStockButton.disabled = !backendReady;
    if (!backendReady) {
      connectionStatus.textContent = `${status.error || 'COBOL checkout is unavailable.'} ${status.fix || 'Run npm run build:cobol.'}`;
      connectionStatus.hidden = false;
    }
  } catch {
    backendReady = false;
    connectionStatus.textContent = 'Shop API unavailable. Start the server with npm start.';
    connectionStatus.hidden = false;
  }
  render();
}

resetStockButton.addEventListener('click', async () => {
  if (!backendReady || ordering) return;
  ordering = true;
  resetStatus.textContent = '';
  checkoutMessage.textContent = '';
  receipt.hidden = true;
  try {
    const response = await fetch('/api/reset', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not reset stock.');
    products = result.products;
    basket.clear();
    resetStatus.textContent = 'Stock restored to starting levels.';
  } catch (error) {
    resetStatus.textContent = `Stock was not reset. ${error.message}`;
  } finally {
    ordering = false;
    render();
  }
});

placeOrderButton.addEventListener('click', async () => {
  if (!backendReady || ordering || basket.size === 0) return;
  ordering = true;
  checkoutMessage.textContent = '';
  receipt.hidden = true;
  renderBasket();
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [...basket].map(([id, quantity]) => ({ id, quantity })) }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error([result.error, result.detail, result.fix].filter(Boolean).join(' '));
    }

    products = result.products.map((product) => ({ ...product }));
    basket.clear();
    document.querySelector('#receipt-items').replaceChildren(...result.items.map((item) => {
      const row = document.createElement('div');
      row.className = 'receipt-row';
      const label = document.createElement('span');
      label.textContent = `${item.name} × ${item.quantity}`;
      const lineTotal = document.createElement('span');
      lineTotal.textContent = formatMoney(item.lineTotalCents);
      row.append(label, lineTotal);
      return row;
    }));
    document.querySelector('#receipt-total').textContent = formatMoney(result.totalCents);
    receipt.hidden = false;
  } catch (error) {
    checkoutMessage.textContent = `Order not placed. ${error.message} Stock has not been changed.`;
  } finally {
    ordering = false;
    render();
  }
});

render();
connectToApi();