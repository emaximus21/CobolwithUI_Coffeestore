const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 4173;
const COBOL_PROGRAM = path.join(__dirname, 'backend', 'shop');
const COBOL_FIX = 'Run npm run build:cobol. If cobc is missing, rebuild the Codespace container or install GnuCOBOL.';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const startingProducts = [
  { id: 'espresso-machine', name: 'Espresso machine', priceCents: 18500, stock: 8 },
  { id: 'ceramic-mug', name: 'Ceramic mug', priceCents: 1250, stock: 12 },
  { id: 'coffee-beans', name: 'Coffee beans', priceCents: 1600, stock: 20 },
];
let products = startingProducts.map((product) => ({ ...product }));
let checkoutQueue = Promise.resolve();

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function runCobol(args = [], input = '') {
  return new Promise((resolve, reject) => {
    const process = spawn(COBOL_PROGRAM, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');
    process.stdout.on('data', (chunk) => { stdout += chunk; });
    process.stderr.on('data', (chunk) => { stderr += chunk; });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      const error = new Error(stderr.trim() || `COBOL process exited with code ${code}.`);
      error.stdout = stdout.trim();
      reject(error);
    });
    process.stdin.end(input);
  });
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

function checkout(body) {
  const operation = checkoutQueue.then(() => performCheckout(body));
  checkoutQueue = operation.catch(() => {});
  return operation;
}

function resetInventory() {
  const operation = checkoutQueue.then(() => {
    products = startingProducts.map((product) => ({ ...product }));
    return products;
  });
  checkoutQueue = operation.catch(() => {});
  return operation;
}

async function performCheckout(body) {
  if (!body || !Array.isArray(body.items)) {
    return { status: 400, body: { error: 'Send an items array to place an order.' } };
  }

  const quantities = new Map();
  for (const item of body.items) {
    if (!item || typeof item.id !== 'string' || !Number.isSafeInteger(item.quantity)) {
      return { status: 400, body: { error: 'Each item needs a product id and an integer quantity.' } };
    }
    if (!products.some((product) => product.id === item.id)) {
      return { status: 400, body: { error: `Unknown product: ${item.id}.` } };
    }
    if (quantities.has(item.id)) {
      return { status: 400, body: { error: 'Each product may appear only once in an order.' } };
    }
    if (Math.abs(item.quantity) > 999_999) {
      return { status: 400, body: { error: 'Quantity exceeds the COBOL order limit of 999999.' } };
    }
    quantities.set(item.id, item.quantity);
  }

  const orderItems = products.map((product) => ({
    ...product,
    quantity: quantities.get(product.id) || 0,
  }));
  const input = orderItems.map(({ quantity, priceCents, stock }) => {
    const sign = quantity < 0 ? '-' : '+';
    return `${sign}${String(Math.abs(quantity)).padStart(6, '0')}${String(priceCents).padStart(8, '0')}${String(stock).padStart(6, '0')}`;
  }).join('\n') + '\n';

  let output;
  try {
    output = await runCobol([], input);
  } catch (error) {
    return {
      status: 503,
      body: { error: 'The COBOL checkout program could not run.', detail: error.message, fix: COBOL_FIX },
    };
  }

  if (output.startsWith('ERROR|')) {
    return { status: 409, body: { error: output.slice('ERROR|'.length) } };
  }

  const result = /^OK\|(\d{6})\|(\d{6})\|(\d{6})\|(\d{15})$/.exec(output);
  if (!result) {
    return {
      status: 502,
      body: { error: 'COBOL returned an unexpected checkout result.', detail: output, fix: COBOL_FIX },
    };
  }

  const newStocks = result.slice(1, 4).map(Number);
  const totalCents = Number(result[4]);
  if (orderItems.some((item, index) => newStocks[index] !== item.stock - item.quantity)) {
    return { status: 502, body: { error: 'COBOL returned inconsistent stock values.' } };
  }

  products = products.map((product, index) => ({ ...product, stock: newStocks[index] }));
  const receiptItems = orderItems
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents,
      lineTotalCents: item.quantity * item.priceCents,
    }));

  return {
    status: 200,
    body: { items: receiptItems, products, totalCents },
  };
}

async function handleApi(request, response, pathname) {
  if (request.method === 'GET' && pathname === '/api/status') {
    try {
      const output = await runCobol(['--health']);
      if (output === 'COBOL_READY') {
        sendJson(response, 200, { api: 'connected', cobolConnected: true });
        return;
      }
      sendJson(response, 503, { api: 'connected', cobolConnected: false, error: 'COBOL health check returned an unexpected response.', fix: COBOL_FIX });
    } catch (error) {
      sendJson(response, 503, { api: 'connected', cobolConnected: false, error: 'GnuCOBOL is not connected to the API.', detail: error.message, fix: COBOL_FIX });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/products') {
    sendJson(response, 200, { products });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/checkout') {
    try {
      const result = await checkout(await readJson(request));
      sendJson(response, result.status, result.body);
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/reset') {
    const resetProducts = await resetInventory();
    sendJson(response, 200, { products: resetProducts });
    return;
  }

  sendJson(response, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    await handleApi(request, response, pathname);
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(__dirname, `.${requestedPath}`);
  if (!filePath.startsWith(`${__dirname}${path.sep}`)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(contents);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Corner Shop listening on http://0.0.0.0:${PORT}`);
});