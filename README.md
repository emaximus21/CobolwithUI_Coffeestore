# Corner Shop Project

The working shop project follows this path:

```text
Browser UI → Node.js API → compiled GnuCOBOL checkout
```

This is a demo only. It has no payment processing, customer accounts, or personal data. Inventory is held in the running Node process and resets when the server restarts.

## Start Here

You do not need to install Visual Studio, Node.js, or COBOL on your computer. Work in GitHub Codespaces in your browser.

1. **Make your own copy:** open this repository and click **Fork**. This creates your personal copy. You do not need to run `git pull` or `git clone`.
2. **Open your copy:** on your fork, click **Code → Codespaces → Create codespace on main**.
3. **Wait for setup:** Codespaces installs Node.js and GnuCOBOL and compiles the COBOL checkout program automatically.
4. **Start the shop:** in the Codespaces terminal, run `npm start`.
5. **Open the website:** select the forwarded port labeled **Corner Shop** or open port `4173` from the Ports tab.

The hosted [lesson](https://emaximus21.github.io/CobolwithUI_Coffeestore/) and [browser shop preview](https://emaximus21.github.io/CobolwithUI_Coffeestore/shop.html) are optional. GitHub Pages cannot run the Node API or COBOL, so use your Codespace for the real checkout.

## If You Edit COBOL

After changing `backend/shop.cbl`, rebuild it before testing:

```sh
npm run build:cobol
```

Then restart the app with `npm start`. Check `GET /api/status` to confirm that the compiled COBOL program is connected. If `cobc` is missing, use **Codespaces: Rebuild Container** from the Command Palette.

If the initial build says `cobc` is missing, rebuild the Codespace container so `.devcontainer/Dockerfile` can install GnuCOBOL. On Ubuntu, the equivalent install command is `sudo apt-get update && sudo apt-get install -y gnucobol`, followed by `npm run build:cobol`.

## Classroom Stages

1. **UI:** work in `index.html`, `styles.css`, and `app.js`. The browser loads products from the API, keeps basket changes local, and submits the basket only when Place order is selected. Opening `index.html` directly is a labeled browser-only preview; its checkout is disabled.
2. **API:** work in `server.js`. The Node server binds to `0.0.0.0:4173`, serves the UI, validates the request shape, and passes the current catalog, stock, and quantities to the COBOL executable. It updates stock only after a valid COBOL result.
3. **COBOL:** work in `backend/shop.cbl`. It validates order quantities against stock, rejects an oversell, calculates remaining stock and total cents, and writes a machine-readable result for the API. Rebuild with `npm run build:cobol`.

## Catalog

| Product | Price | Starting stock |
| --- | ---: | ---: |
| Espresso machine | $185.00 | 8 |
| Ceramic mug | $12.50 | 12 |
| Coffee beans | $16.00 | 20 |

Adding an item changes only the basket. Stock changes after a successful checkout response.

## API Contract

- `GET /api/status` runs the compiled COBOL health check. A connected response is `{"api":"connected","cobolConnected":true}`. If the executable is missing or fails, the API reports an error and build instructions; it never replaces COBOL calculations with JavaScript.
- `GET /api/products` returns `{ "products": [{ "id", "name", "priceCents", "stock" }] }`.
- `POST /api/checkout` accepts `{ "items": [{ "id": "espresso-machine", "quantity": 2 }] }`.
- `POST /api/reset` restores the starting stock for all products and returns the refreshed product list. The Reset stock button uses this route, so the browser and API stay in sync.
- A successful order returns receipt `items` with quantities and line totals, updated `products`, and `totalCents`. For two espresso machines the response has stock `6` and total `37000`.
- Invalid requests return `400`; stock conflicts return `409`; an unavailable COBOL executable returns `503`. Failed orders do not update stock.

The API and COBOL program exchange one fixed-width input record per catalog product. Each record contains a signed six-digit quantity, eight-digit unit price in cents, and six-digit stock. COBOL returns either an error or the three remaining-stock values and total cents.

## Project Map

The default `main` branch is the working app. The separate `gh-pages` branch publishes the lesson site, so its files do not appear in the Codespaces project workspace.

- **UI:** `index.html`, `styles.css`, and `app.js`
- **API:** `server.js`
- **COBOL checkout:** `backend/shop.cbl`
- **Codespaces setup:** `.devcontainer/`