const initialProducts = [
  { id: 'espresso-machine', name: 'Espresso machine', priceCents: 18500, stock: 8, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=300&q=80', description: 'A little ritual, made at home.' },
  { id: 'ceramic-mug', name: 'Ceramic mug', priceCents: 1250, stock: 12, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=300&q=80', description: 'Hand-finished stoneware.' },
  { id: 'coffee-beans', name: 'Coffee beans', priceCents: 1600, stock: 20, image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80', description: 'A bright, balanced house roast.' },
];

let products = initialProducts.map((product) => ({ ...product }));
const basket = new Map();
let ordering = false;

const productList = document.querySelector('#product-list');
const basketItems = document.querySelector('#basket-items');
const placeOrderButton = document.querySelector('#place-order');
const receipt = document.querySelector('#receipt');
const checkoutMessage = document.querySelector('#checkout-message');
const resetStatus = document.querySelector('#reset-status');

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function renderProducts() {
  productList.replaceChildren(...products.map((product) => {
    const article = document.createElement('article');
    article.className = 'product';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.image;
    image.alt = product.name;
    image.loading = 'lazy';

    const copy = document.createElement('div');
    copy.className = 'product-copy';
    const name = document.createElement('h3');
    name.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
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
  const entries = [...basket.entries()];
  document.querySelector('#basket-count').textContent = String(entries.reduce((sum, [, quantity]) => sum + quantity, 0));
  const estimatedTotal = entries.reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return sum + product.priceCents * quantity;
  }, 0);
  document.querySelector('#basket-total').textContent = formatMoney(estimatedTotal);

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
  placeOrderButton.disabled = ordering || entries.length === 0;
}

function render() {
  renderProducts();
  renderBasket();
  const itemsSold = products.reduce((sum, product, index) => sum + initialProducts[index].stock - product.stock, 0);
  document.querySelector('#items-sold').textContent = String(itemsSold);
}

function changeQuantity(id, change) {
  const next = (basket.get(id) || 0) + change;
  if (next <= 0) basket.delete(id);
  else basket.set(id, next);
  checkoutMessage.textContent = '';
  receipt.hidden = true;
  render();
}

placeOrderButton.addEventListener('click', () => {
  if (ordering || basket.size === 0) return;
  ordering = true;
  checkoutMessage.textContent = '';
  receipt.hidden = true;
  renderBasket();

  const requested = [...basket.entries()];
  const stockConflict = requested.find(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return quantity > product.stock;
  });

  if (stockConflict) {
    checkoutMessage.textContent = 'Not enough stock. No stock was changed.';
    ordering = false;
    render();
    return;
  }

  const receiptLines = requested.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return {
      id,
      name: product.name,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    };
  });
  const totalCents = receiptLines.reduce((sum, item) => sum + item.lineTotalCents, 0);

  products = products.map((product) => {
    const quantity = basket.get(product.id) || 0;
    return { ...product, stock: product.stock - quantity };
  });
  basket.clear();
  document.querySelector('#receipt-items').replaceChildren(...receiptLines.map((item) => {
    const row = document.createElement('div');
    row.className = 'receipt-row';
    const label = document.createElement('span');
    label.textContent = `${item.name} × ${item.quantity}`;
    const price = document.createElement('span');
    price.textContent = formatMoney(item.lineTotalCents);
    row.append(label, price);
    return row;
  }));
  document.querySelector('#receipt-total').textContent = formatMoney(totalCents);
  receipt.hidden = false;
  checkoutMessage.textContent = 'Browser preview only: this order was calculated in JavaScript, not sent to COBOL.';
  ordering = false;
  render();
});

document.querySelector('#reset-stock').addEventListener('click', () => {
  products = initialProducts.map((product) => ({ ...product }));
  basket.clear();
  checkoutMessage.textContent = '';
  resetStatus.textContent = 'Demo stock restored to starting levels.';
  receipt.hidden = true;
  render();
});

render();