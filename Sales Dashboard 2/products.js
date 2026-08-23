"use strict";

/* =========================================================
   Al-Howail Tyres Sales Operations
   products.js
   Product performance indicators and aggregated product sales
========================================================= */

window.DashboardProducts = (() => {
    const utils = window.DashboardUtils;

    let invoiceRows = [];
    let searchText = "";
    let eventsBound = false;

    function toNumber(value) {
        return utils?.toNumber ? utils.toNumber(value) : Number(value) || 0;
    }

    function normalizeCode(value) {
        return utils?.normalizeCode ? utils.normalizeCode(value) : String(value ?? "").trim();
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function escapeHTML(value) {
        return utils?.escapeHTML ? utils.escapeHTML(value) : String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function firstValue(row, keys, fallback = "") {
        if (utils?.firstValue) {
            return utils.firstValue(row, keys, fallback);
        }
        for (const key of keys) {
            if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
                return row[key];
            }
        }
        return fallback;
    }

    function t(key, fallback) {
        return utils?.t ? utils.t(key, fallback) : fallback;
    }

    function byId(id) {
        return utils?.byId ? utils.byId(id) : document.getElementById(id);
    }

    function formatCurrency(value) {
        return utils?.formatCurrency
            ? utils.formatCurrency(value)
            : `SAR ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatNumber(value, maximumFractionDigits = 0) {
        return new Intl.NumberFormat(document.documentElement.lang === "ar" ? "ar-SA" : "en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits
        }).format(toNumber(value));
    }

    function normalizeRow(row = {}) {
        return {
            productCode: normalizeCode(firstValue(row, ["productCode", "Product Code", "Code"], "")),
            productDescription: normalizeText(firstValue(row, ["productDescription", "Product Description", "Description"], "")),
            quantity: toNumber(firstValue(row, ["invoiceQuantity", "Invoice Qty", "Quantity"], 0)),
            salesWithoutTax: toNumber(firstValue(row, ["salesWithoutTax", "netSales", "Net Sales"], 0)),
            grossAmount: toNumber(firstValue(row, ["grossAmount", "Gross Amount"], 0)),
            unitPrice: toNumber(firstValue(row, ["unitPrice", "Unit Price"], 0))
        };
    }

    function aggregateProducts() {
        const productMap = new Map();

        invoiceRows.forEach(rawRow => {
            const row = normalizeRow(rawRow);
            if (!row.productCode && !row.productDescription) return;

            const key = row.productCode || row.productDescription.toLowerCase();
            if (!productMap.has(key)) {
                productMap.set(key, {
                    productCode: row.productCode,
                    productDescription: row.productDescription,
                    quantity: 0,
                    salesWithoutTax: 0,
                    grossAmount: 0,
                    minSellingPrice: null,
                    maxSellingPrice: null
                });
            }

            const product = productMap.get(key);
            product.quantity += row.quantity;
            product.salesWithoutTax += row.salesWithoutTax;
            product.grossAmount += row.grossAmount;

            // Ignore zero/0.01 adjustment lines when calculating real selling-price range.
            if (row.unitPrice > 0.01) {
                product.minSellingPrice = product.minSellingPrice === null
                    ? row.unitPrice
                    : Math.min(product.minSellingPrice, row.unitPrice);
                product.maxSellingPrice = product.maxSellingPrice === null
                    ? row.unitPrice
                    : Math.max(product.maxSellingPrice, row.unitPrice);
            }

            if (!product.productDescription && row.productDescription) {
                product.productDescription = row.productDescription;
            }
        });

        return [...productMap.values()]
            .sort((a, b) => b.quantity - a.quantity || b.salesWithoutTax - a.salesWithoutTax);
    }

    function getFilteredProducts() {
        const text = searchText.trim().toLowerCase();
        const products = aggregateProducts();
        if (!text) return products;

        return products.filter(product =>
            product.productCode.toLowerCase().includes(text) ||
            product.productDescription.toLowerCase().includes(text)
        );
    }

    function renderIndicators(products) {
        const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
        const totalSales = products.reduce((sum, product) => sum + product.salesWithoutTax, 0);
        const topProduct = products[0] || null;

        if (byId("productsTotalQuantity")) {
            byId("productsTotalQuantity").textContent = formatNumber(totalQuantity, 2);
        }
        if (byId("productsCount")) {
            byId("productsCount").textContent = formatNumber(products.length);
        }
        if (byId("productsTotalSales")) {
            byId("productsTotalSales").textContent = formatCurrency(totalSales);
        }
        if (byId("productsTopProduct")) {
            byId("productsTopProduct").textContent = topProduct
                ? `${topProduct.productCode || "—"} · ${formatNumber(topProduct.quantity, 2)}`
                : "—";
        }
        if (byId("productsTopProductDescription")) {
            byId("productsTopProductDescription").textContent = topProduct?.productDescription || t("common.noData", "No data");
        }
    }

    function renderTable(products) {
        const body = byId("productsTableBody");
        if (!body) return;

        const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);

        if (!products.length) {
            body.innerHTML = `<tr><td colspan="7" class="empty-table-cell">${escapeHTML(t("common.noData", "No data available"))}</td></tr>`;
            return;
        }

        body.innerHTML = products.map((product, index) => {
            const share = totalQuantity > 0 ? (product.quantity / totalQuantity) * 100 : 0;
            return `
                <tr>
                    <td class="product-rank">${index + 1}</td>
                    <td><strong class="product-code">${escapeHTML(product.productCode || "—")}</strong></td>
                    <td class="product-description-cell">${escapeHTML(product.productDescription || "—")}</td>
                    <td><strong class="product-quantity">${formatNumber(product.quantity, 2)}</strong></td>
                    <td>${formatCurrency(product.salesWithoutTax)}</td>
                    <td>${product.minSellingPrice === null ? "—" : formatCurrency(product.minSellingPrice)}</td>
                    <td>${product.maxSellingPrice === null ? "—" : formatCurrency(product.maxSellingPrice)}</td>
                    <td>
                        <div class="product-share-wrap">
                            <strong>${share.toFixed(1)}%</strong>
                            <span class="product-share-bar"><span style="width:${Math.min(100, share)}%"></span></span>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }

    function renderFooter(products) {
        const footer = byId("productsTableFooter");
        if (!footer) return;
        const totalQty = products.reduce((sum, product) => sum + product.quantity, 0);
        footer.textContent = `${t("products.productsShown", "Products")}: ${formatNumber(products.length)}  •  ${t("products.totalPieces", "Total pieces")}: ${formatNumber(totalQty, 2)}`;
    }

    function render() {
        const products = getFilteredProducts();
        renderIndicators(products);
        renderTable(products);
        renderFooter(products);
        return products;
    }

    function setData(data = {}) {
        invoiceRows = Array.isArray(data) ? data : (Array.isArray(data.invoices) ? data.invoices : []);
        render();
    }

    function exportExcel() {
        const products = getFilteredProducts();
        if (!products.length) return;

        const rows = products.map((product, index) => ({
            "#": index + 1,
            [t("products.productCode", "Product Code")]: product.productCode,
            [t("products.productDescription", "Product Description")]: product.productDescription,
            [t("products.quantitySold", "Quantity Sold")]: product.quantity,
            [t("products.netSales", "Net Sales")]: product.salesWithoutTax,
            [t("products.lowestSellingPrice", "Lowest Selling Price")]: product.minSellingPrice ?? "",
            [t("products.highestSellingPrice", "Highest Selling Price")]: product.maxSellingPrice ?? ""
        }));

        if (window.XLSX) {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
            const dateValue = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(workbook, `Products_${dateValue}.xlsx`);
        }
    }

    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        byId("productsSearchInput")?.addEventListener("input", event => {
            searchText = String(event.target.value || "");
            render();
        });

        byId("exportProductsButton")?.addEventListener("click", exportExcel);
    }

    function initialize() {
        bindEvents();
        render();
    }

    return {
        initialize,
        setData,
        render,
        refresh: render,
        getProducts: aggregateProducts
    };
})();
