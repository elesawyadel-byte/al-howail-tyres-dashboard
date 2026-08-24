/* =========================
   profiles.js
========================= */

"use strict";

window.DashboardProfiles = (() => {
    const utils = window.DashboardUtils;
    const targetsModule = window.DashboardTargets;

    if (!utils) {
        throw new Error(
            "DashboardUtils is not available. Load utils.js before profiles.js."
        );
    }

    let targetRows = [];
    let invoiceRows = [];
    let collectionRows = [];
    let dueRows = [];
    let companyDueRows = [];
    let newCustomerRows = [];
    let reactivatedCustomerRows = [];
    let eventsBound = false;

    function normalizeCode(value) {
        return utils.normalizeCode(value);
    }

    function getValue(row, keys, fallback = "") {
        return utils.firstValue(
            row,
            keys,
            fallback
        );
    }

    function getTargetCode(row) {
        return normalizeCode(
            getValue(
                row,
                [
                    "salesmanCode",
                    "Salesman Code",
                    "salesCode",
                    "code"
                ],
                ""
            )
        );
    }

    function splitSalesmanCodes(value) {
        const text = String(value == null ? "" : value).trim();

        if (!text) {
            return [];
        }

        return Array.from(
            new Set(
                text
                    .split(/\s*(?:\+|,|&|\/|\\|\||،)\s*/g)
                    .map(normalizeCode)
                    .filter(Boolean)
            )
        );
    }

    function getTargetCodes(row) {
        return splitSalesmanCodes(getTargetCode(row));
    }

    function findTargetRowByCode(code) {
        const cleanCode = normalizeCode(code);

        return targetRows.find(row =>
            getTargetCodes(row).includes(cleanCode) ||
            getTargetCode(row) === cleanCode
        ) || null;
    }

    function rowBelongsToCodes(row, codes) {
        const rowCode = normalizeCode(
            getValue(
                row,
                [
                    "salesmanCode",
                    "Salesman Code",
                    "salesCode"
                ],
                ""
            )
        );

        const rowCodes = splitSalesmanCodes(rowCode);
        return rowCodes.some(code => codes.includes(code)) ||
            codes.includes(rowCode);
    }

    function getSalesmanName(row) {
        return String(
            getValue(
                row,
                [
                    "salesmanName",
                    "Salesman Name",
                    "name"
                ],
                ""
            )
        ).trim();
    }

    function getBranch(row) {
        return String(
            getValue(
                row,
                [
                    "branch",
                    "Branch"
                ],
                ""
            )
        ).trim();
    }

    function getCustomerCode(row) {
        return normalizeCode(
            getValue(
                row,
                [
                    "customerCode",
                    "Customer Code",
                    "accountCode"
                ],
                ""
            )
        );
    }

    function getCustomerName(row) {
        return String(
            getValue(
                row,
                [
                    "customerName",
                    "Customer Name",
                    "customer"
                ],
                ""
            )
        ).trim();
    }

    function getInvoiceSales(row) {
        return utils.toNumber(
            getValue(
                row,
                [
                    "salesWithoutTax",
                    "netSale",
                    "netSales",
                    "Net Sales",
                    "amount"
                ],
                0
            )
        );
    }

    function getCollectionAmount(row) {
        return utils.toNumber(
            getValue(
                row,
                [
                    "collectionAmount",
                    "collection",
                    "Collection Amount",
                    "amount"
                ],
                0
            )
        );
    }

    function getBalance(row) {
        return utils.toNumber(
            getValue(
                row,
                [
                    "invoiceBalance",
                    "balance",
                    "totalBalance",
                    "Invoice Balance"
                ],
                0
            )
        );
    }

    function getStatus(row) {
        const suppliedStatus = utils
            .normalizeText(
                getValue(
                    row,
                    ["status", "Status"],
                    ""
                )
            )
            .replace(/\s+/g, "");

        const overdueDays = utils.toNumber(
            getValue(
                row,
                [
                    "overdueDays",
                    "outstandingDays",
                    "Overdue Days"
                ],
                0
            )
        );

        if (
            suppliedStatus === "overdue" ||
            suppliedStatus === "متأخر" ||
            overdueDays > 0
        ) {
            return "overdue";
        }

        return "due";
    }

    function getOverdueDays(row) {
        return Math.max(
            0,
            utils.toNumber(
                getValue(
                    row,
                    [
                        "overdueDays",
                        "outstandingDays",
                        "Overdue Days"
                    ],
                    0
                )
            )
        );
    }

    function getCreditLimit(row) {
        return utils.toNumber(
            getValue(
                row,
                [
                    "creditLimit",
                    "Credit Limit",
                    "credit"
                ],
                0
            )
        );
    }

    function getInvoiceDate(row) {
        return getValue(
            row,
            [
                "invoiceDate",
                "Invoice Date",
                "date"
            ],
            ""
        );
    }

    function getCurrentMonthlyTarget(targetRow) {
        if (!targetRow) {
            return 0;
        }

        if (
            targetsModule &&
            typeof targetsModule.getMonthlyTarget ===
                "function"
        ) {
            return utils.toNumber(
                targetsModule.getMonthlyTarget(
                    targetRow
                )
            );
        }

        const quarter =
            Math.floor(
                new Date().getMonth() / 3
            ) + 1;

        return utils.toNumber(
            getValue(
                targetRow,
                [
                    `monthlyTargetQ${quarter}`,
                    `monthlyTarget${quarter}`,
                    `Q${quarter} Monthly Target`,
                    "monthlyTarget",
                    "Monthly Target",
                    "target"
                ],
                0
            )
        );
    }

    function setData(data = {}) {
        targetRows = Array.isArray(data.target)
            ? data.target
            : [];

        invoiceRows = Array.isArray(data.invoices)
            ? data.invoices
            : [];

        collectionRows = Array.isArray(
            data.collections
        )
            ? data.collections
            : [];

        dueRows = Array.isArray(data.dueOverdue)
            ? data.dueOverdue
            : [];

        companyDueRows = Array.isArray(data.companyDueOverdue)
            ? data.companyDueOverdue
            : dueRows;

        newCustomerRows = Array.isArray(data.newCustomers)
            ? data.newCustomers
            : [];

        reactivatedCustomerRows = Array.isArray(data.reactivatedCustomers)
            ? data.reactivatedCustomers
            : [];

        populateSalesmen();
        render();
    }

    function setTargets(rows = []) {
        targetRows = Array.isArray(rows)
            ? rows
            : [];

        populateSalesmen();
        render();
    }

    function setInvoices(rows = []) {
        invoiceRows = Array.isArray(rows)
            ? rows
            : [];

        render();
    }

    function setCollections(rows = []) {
        collectionRows = Array.isArray(rows)
            ? rows
            : [];

        render();
    }

    function setDueOverdue(rows = []) {
        dueRows = Array.isArray(rows)
            ? rows
            : [];

        render();
    }

    function getSalesmen() {
        const map = new Map();
        const childCodeToParent = new Map();

        targetRows.forEach(row => {
            const parentCode = getTargetCode(row);

            if (!parentCode) {
                return;
            }

            getTargetCodes(row).forEach(code => {
                childCodeToParent.set(code, parentCode);
            });

            map.set(parentCode, {
                code: parentCode,
                name:
                    getSalesmanName(row) ||
                    parentCode,
                branch:
                    getBranch(row)
            });
        });

        [
            ...invoiceRows,
            ...collectionRows,
            ...dueRows
        ].forEach(row => {
            const rawCode = normalizeCode(
                getValue(
                    row,
                    [
                        "salesmanCode",
                        "Salesman Code",
                        "salesCode"
                    ],
                    ""
                )
            );

            if (!rawCode) {
                return;
            }

            const parentCode =
                childCodeToParent.get(rawCode) ||
                rawCode;

            if (map.has(parentCode)) {
                return;
            }

            const targetRow =
                findTargetRowByCode(rawCode);

            map.set(parentCode, {
                code: parentCode,
                name:
                    getSalesmanName(targetRow || row) ||
                    parentCode,
                branch:
                    getBranch(targetRow || row)
            });
        });

        return Array.from(map.values()).sort(
            (first, second) =>
                first.name.localeCompare(
                    second.name,
                    utils.getLocale(),
                    {
                        numeric: true
                    }
                )
        );
    }

    function populateSalesmen() {
        const select = utils.byId(
            "profileSalesmanSelect"
        );

        if (!select) {
            return;
        }

        const currentValue = select.value;
        const salesmen = getSalesmen();

        select.innerHTML = salesmen
            .map(
                salesman => `
                    <option value="${utils.escapeHTML(
                        salesman.code
                    )}">
                        ${utils.escapeHTML(
                            salesman.name
                        )}
                        (${utils.escapeHTML(
                            salesman.code
                        )})
                    </option>
                `
            )
            .join("");

        const authenticatedCode =
            window.DashboardAuth?.getSalesmanCode?.() ||
            "";

        const selectedCode =
            currentValue ||
            authenticatedCode ||
            salesmen[0]?.code ||
            "";

        select.value = selectedCode;
    }

    function getSelectedSalesmanCode() {
        return (
            normalizeCode(
                utils.byId(
                    "profileSalesmanSelect"
                )?.value
            ) ||
            normalizeCode(
                window.DashboardAuth
                    ?.getSalesmanCode?.()
            ) ||
            getSalesmen()[0]?.code ||
            ""
        );
    }

    function uniqueActivityCustomerCount(rows) {
        const keys = new Set();
        (Array.isArray(rows) ? rows : []).forEach(row => {
            const code = getCustomerCode(row);
            const name = getCustomerName(row);
            const key = code || utils.normalizeText(name);
            if (key) keys.add(key);
        });
        return keys.size;
    }

    function buildProfile(code) {
        const selectedCode = normalizeCode(code);
        const targetRow =
            findTargetRowByCode(selectedCode) ||
            {};

        const profileCode =
            getTargetCode(targetRow) ||
            selectedCode;

        const profileCodes =
            getTargetCodes(targetRow).length
                ? getTargetCodes(targetRow)
                : [selectedCode];

        const invoices =
            invoiceRows.filter(row =>
                rowBelongsToCodes(
                    row,
                    profileCodes
                )
            );

        const collections =
            collectionRows.filter(row =>
                rowBelongsToCodes(
                    row,
                    profileCodes
                )
            );

        const balances =
            dueRows.filter(row =>
                rowBelongsToCodes(
                    row,
                    profileCodes
                )
            );

        const newCustomers =
            newCustomerRows.filter(row =>
                rowBelongsToCodes(row, profileCodes)
            );

        const reactivatedCustomers =
            reactivatedCustomerRows.filter(row =>
                rowBelongsToCodes(row, profileCodes)
            );

        const sales = utils.sumBy(
            invoices,
            getInvoiceSales
        );

        const collectionsTotal =
            utils.sumBy(
                collections,
                getCollectionAmount
            );

        const due = utils.sumBy(
            balances.filter(
                row =>
                    getStatus(row) === "due"
            ),
            getBalance
        );

        const overdue = utils.sumBy(
            balances.filter(
                row =>
                    getStatus(row) ===
                    "overdue"
            ),
            getBalance
        );

        const target =
            getCurrentMonthlyTarget(
                targetRow
            );

        const achievement =
            target > 0
                ? (sales / target) * 100
                : 0;

        return {
            code: profileCode,
            name:
                getSalesmanName(targetRow) ||
                getSalesmanName(
                    invoices[0] ||
                        collections[0] ||
                        balances[0] ||
                        {}
                ) ||
                code,

            branch:
                getBranch(targetRow) ||
                getBranch(
                    invoices[0] ||
                        collections[0] ||
                        balances[0] ||
                        {}
                ) ||
                "--",

            target,
            sales,
            collections:
                collectionsTotal,
            due,
            overdue,
            achievement,
            invoiceCount:
                invoices.length,
            newCustomerCount:
                uniqueActivityCustomerCount(newCustomers),
            reactivatedCustomerCount:
                uniqueActivityCustomerCount(reactivatedCustomers),
            newCustomers:
                newCustomers,
            reactivatedCustomers:
                reactivatedCustomers,

            customers:
                buildCustomers(
                    invoices,
                    collections,
                    balances
                )
        };
    }

    function buildCustomers(
        invoices,
        collections,
        balances
    ) {
        const customerMap = new Map();

        function ensureCustomer(row) {
            const code =
                getCustomerCode(row);

            const name =
                getCustomerName(row);

            const key =
                code || name;

            if (!key) {
                return null;
            }

            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    customerCode: code,
                    customerName: name,
                    lastPurchase: "",
                    sales: 0,
                    collections: 0,
                    due: 0,
                    overdue: 0,
                    overdueDays: 0,
                    creditLimit: 0
                });
            }

            const customer =
                customerMap.get(key);

            if (
                !customer.customerCode &&
                code
            ) {
                customer.customerCode =
                    code;
            }

            if (
                !customer.customerName &&
                name
            ) {
                customer.customerName =
                    name;
            }

            return customer;
        }

        invoices.forEach(row => {
            const customer =
                ensureCustomer(row);

            if (!customer) {
                return;
            }

            customer.sales +=
                getInvoiceSales(row);

            const invoiceDate =
                getInvoiceDate(row);

            const currentDate =
                utils.parseDate(
                    customer.lastPurchase
                );

            const candidateDate =
                utils.parseDate(
                    invoiceDate
                );

            if (
                candidateDate &&
                (
                    !currentDate ||
                    candidateDate > currentDate
                )
            ) {
                customer.lastPurchase =
                    invoiceDate;
            }
        });

        collections.forEach(row => {
            const customer =
                ensureCustomer(row);

            if (!customer) {
                return;
            }

            customer.collections +=
                getCollectionAmount(row);
        });

        balances.forEach(row => {
            const customer =
                ensureCustomer(row);

            if (!customer) {
                return;
            }

            const balance =
                getBalance(row);

            if (
                getStatus(row) ===
                "overdue"
            ) {
                customer.overdue +=
                    balance;
            } else {
                customer.due +=
                    balance;
            }

            customer.overdueDays =
                Math.max(
                    customer.overdueDays,
                    getOverdueDays(row)
                );

            customer.creditLimit =
                Math.max(
                    customer.creditLimit,
                    getCreditLimit(row)
                );
        });

        return Array.from(
            customerMap.values()
        ).sort(
            (first, second) =>
                second.overdue -
                    first.overdue ||
                second.sales -
                    first.sales
        );
    }

    function getFilteredCustomers(
        customers
    ) {
        const searchText =
            utils.normalizeText(
                utils.byId(
                    "profileCustomersSearchInput"
                )?.value || ""
            );

        if (!searchText) {
            return customers;
        }

        return customers.filter(
            customer =>
                [
                    customer.customerCode,
                    customer.customerName,
                    customer.lastPurchase,
                    customer.sales,
                    customer.collections,
                    customer.due,
                    customer.overdue
                ].some(value =>
                    utils
                        .normalizeText(value)
                        .includes(searchText)
                )
        );
    }

    function setCompanyOutstandingValues() {
        const companyDue = utils.sumBy(
            companyDueRows.filter(row =>
                getStatus(row) === "due"
            ),
            getBalance
        );

        const companyOverdue = utils.sumBy(
            companyDueRows.filter(row =>
                getStatus(row) === "overdue"
            ),
            getBalance
        );

        utils.setText(
            "profileCompanyDueValue",
            utils.formatCurrency(companyDue)
        );

        utils.setText(
            "profileCompanyOverdueValue",
            utils.formatCurrency(companyOverdue)
        );

        utils.setText(
            "profileCompanyOutstandingValue",
            utils.formatCurrency(
                companyDue + companyOverdue
            )
        );

        utils.setText(
            "profileCompanyNewCustomersValue",
            utils.formatNumber(uniqueActivityCustomerCount(newCustomerRows), 0)
        );

        utils.setText(
            "profileCompanyReactivatedCustomersValue",
            utils.formatNumber(uniqueActivityCustomerCount(reactivatedCustomerRows), 0)
        );
    }

    function setProfileValues(profile) {
        utils.setText(
            "profileSalesmanName",
            profile.name
        );

        utils.setText(
            "profileSalesmanCode",
            profile.code
        );

        utils.setText(
            "profileSalesmanBranch",
            profile.branch
        );

        utils.setText(
            "profileTargetValue",
            utils.formatCurrency(
                profile.target
            )
        );

        utils.setText(
            "profileSalesValue",
            utils.formatCurrency(
                profile.sales
            )
        );

        utils.setText(
            "profileCollectionsValue",
            utils.formatCurrency(
                profile.collections
            )
        );

        utils.setText(
            "profileDueValue",
            utils.formatCurrency(
                profile.due
            )
        );

        utils.setText(
            "profileOverdueValue",
            utils.formatCurrency(
                profile.overdue
            )
        );

        utils.setText(
            "profileAchievementValue",
            utils.formatPercentage(
                profile.achievement
            )
        );

        utils.setText(
            "profileInvoiceCount",
            utils.formatNumber(
                profile.invoiceCount
            )
        );

        utils.setText(
            "profileCustomerCount",
            utils.formatNumber(
                profile.customers.length
            )
        );

        utils.setText(
            "profileNewCustomerCount",
            utils.formatNumber(profile.newCustomerCount, 0)
        );

        utils.setText(
            "profileReactivatedCustomerCount",
            utils.formatNumber(profile.reactivatedCustomerCount, 0)
        );
    }

    function createCustomerRow(customer) {
        const hasOverdue =
            customer.overdue > 0;

        return `
            <tr>
                <td>
                    ${utils.escapeHTML(
                        customer.customerCode ||
                            "--"
                    )}
                </td>

                <td>
                    ${utils.escapeHTML(
                        customer.customerName ||
                            "--"
                    )}
                </td>

                <td>
                    ${utils.formatDate(
                        customer.lastPurchase
                    )}
                </td>

                <td>
                    ${utils.formatCurrency(
                        customer.sales
                    )}
                </td>

                <td>
                    ${utils.formatCurrency(
                        customer.collections
                    )}
                </td>

                <td>
                    ${utils.formatCurrency(
                        customer.due
                    )}
                </td>

                <td>
                    ${utils.formatCurrency(
                        customer.overdue
                    )}
                </td>

                <td>
                    ${utils.formatNumber(
                        customer.overdueDays
                    )}
                </td>

                <td>
                    ${utils.formatCurrency(
                        customer.creditLimit
                    )}
                </td>

                <td>
                    <span class="status-badge ${
                        hasOverdue
                            ? "status-warning"
                            : "status-success"
                    }">
                        ${utils.escapeHTML(
                            hasOverdue
                                ? utils.t(
                                      "salesmanProfiles.overdueCustomer",
                                      "متأخر"
                                  )
                                : utils.t(
                                      "salesmanProfiles.active",
                                      "نشط"
                                  )
                        )}
                    </span>
                </td>
            </tr>
        `;
    }

    function renderCustomers(customers) {
        const tableBody = utils.byId(
            "profileCustomersTableBody"
        );

        if (!tableBody) {
            return;
        }

        const filteredCustomers =
            getFilteredCustomers(
                customers
            );

        tableBody.innerHTML =
            filteredCustomers.length > 0
                ? filteredCustomers
                      .map(
                          createCustomerRow
                      )
                      .join("")
                : utils.emptyTableRow(
                      10,
                      utils.t(
                          "common.noData",
                          "لا توجد بيانات متاحة"
                      )
                  );
    }

    function render() {
        const code =
            getSelectedSalesmanCode();

        if (!code) {
            return null;
        }

        const profile =
            buildProfile(code);

        setCompanyOutstandingValues();
        setProfileValues(profile);
        renderCustomers(
            profile.customers
        );

        return profile;
    }

    function getExportRows() {
        const profile = render();

        if (!profile) {
            return [];
        }

        return profile.customers.map(
            customer => ({
                "Customer Code":
                    customer.customerCode,

                "Customer Name":
                    customer.customerName,

                "Last Purchase":
                    utils.formatDate(
                        customer.lastPurchase
                    ),

                Sales:
                    customer.sales,

                Collections:
                    customer.collections,

                Due:
                    customer.due,

                Overdue:
                    customer.overdue,

                "Overdue Days":
                    customer.overdueDays,

                "Credit Limit":
                    customer.creditLimit,

                Status:
                    customer.overdue > 0
                        ? "Overdue"
                        : "Active"
            })
        );
    }

    function exportExcel() {
        if (
            !window.DashboardReports ||
            typeof window
                .DashboardReports
                .exportRows !==
                "function"
        ) {
            return false;
        }

        return window.DashboardReports
            .exportRows(
                getExportRows(),
                "Salesman_Profile"
            );
    }

    function printProfile() {
        const profile = render();

        if (!profile) {
            return false;
        }

        const rows =
            getFilteredCustomers(
                profile.customers
            );

        const bodyRows = rows
            .map(createCustomerRow)
            .join("");

        // Sales generated by each activity customer during the currently
        // selected dashboard period. invoiceRows is already filtered by the
        // global From/To date filters before it reaches Salesman Profiles.
        const getActivityCustomerSales = activityRow => {
            const customerCode = getCustomerCode(activityRow);
            const customerName = utils.normalizeText(getCustomerName(activityRow));

            return utils.sumBy(
                invoiceRows.filter(invoiceRow => {
                    const invoiceCustomerCode = getCustomerCode(invoiceRow);
                    const invoiceCustomerName = utils.normalizeText(getCustomerName(invoiceRow));

                    if (customerCode && invoiceCustomerCode) {
                        return customerCode === invoiceCustomerCode;
                    }

                    return Boolean(customerName) && customerName === invoiceCustomerName;
                }),
                getInvoiceSales
            );
        };

        const createActivityRows = activityRows =>
            (Array.isArray(activityRows) ? activityRows : [])
                .map(row => `
                    <tr>
                        <td>${utils.escapeHTML(getCustomerCode(row) || "--")}</td>
                        <td>${utils.escapeHTML(getCustomerName(row) || "--")}</td>
                        <td>${utils.escapeHTML(utils.formatDate(getValue(row, ["activityDate", "date"], "")))}</td>
                        <td>${utils.formatCurrency(getActivityCustomerSales(row))}</td>
                    </tr>
                `)
                .join("");

        const getActivityTotalSales = activityRows => {
            const seen = new Set();

            return (Array.isArray(activityRows) ? activityRows : []).reduce((total, row) => {
                const code = getCustomerCode(row);
                const name = utils.normalizeText(getCustomerName(row));
                const key = code || name;

                if (!key || seen.has(key)) {
                    return total;
                }

                seen.add(key);
                return total + getActivityCustomerSales(row);
            }, 0);
        };

        const newCustomerPrintRows =
            createActivityRows(profile.newCustomers);
        const reactivatedCustomerPrintRows =
            createActivityRows(profile.reactivatedCustomers);
        const newCustomerTotalSales =
            getActivityTotalSales(profile.newCustomers);
        const reactivatedCustomerTotalSales =
            getActivityTotalSales(profile.reactivatedCustomers);

        const fromDateValue =
            document.getElementById("fromDateFilter")?.value || "";
        const toDateValue =
            document.getElementById("toDateFilter")?.value || "";

        const selectedPeriodText = (() => {
            if (fromDateValue && toDateValue) {
                return `${utils.formatDate(fromDateValue)} - ${utils.formatDate(toDateValue)}`;
            }

            if (fromDateValue) {
                return `From ${utils.formatDate(fromDateValue)}`;
            }

            if (toDateValue) {
                return `Up to ${utils.formatDate(toDateValue)}`;
            }

            return "All Dates";
        })();

        const companyLogoUrl = new URL(
            "al-howail-logo.png",
            window.location.href
        ).href;

        const printWindow =
            window.open(
                "",
                "_blank",
                "width=1200,height=800"
            );

        if (!printWindow) {
            return false;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="${
                utils.getLanguage()
            }" dir="${
                utils.getLanguage() ===
                "ar"
                    ? "rtl"
                    : "ltr"
            }">
            <head>
                <meta charset="UTF-8">
                <title>
                    ${utils.escapeHTML(
                        profile.name
                    )}
                </title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 24px;
                        color: #172033;
                    }

                    .company-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 18px;
                        padding-bottom: 16px;
                        margin-bottom: 18px;
                        border-bottom: 2px solid #0f6f82;
                    }

                    .company-brand {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                    }

                    .company-brand img {
                        width: 72px;
                        height: 72px;
                        object-fit: contain;
                    }

                    .company-name {
                        font-size: 26px;
                        font-weight: 700;
                        color: #0d3550;
                    }

                    .report-label {
                        font-size: 14px;
                        color: #66758a;
                        margin-top: 4px;
                    }

                    .selected-period {
                        display: inline-block;
                        margin: 4px 0 10px;
                        padding: 8px 12px;
                        border: 1px solid #cbd8e2;
                        border-radius: 7px;
                        background: #f5f8fa;
                        font-size: 14px;
                        font-weight: 700;
                        color: #0d3550;
                    }

                    h1 {
                        margin: 0 0 8px;
                    }

                    .summary {
                        display: grid;
                        grid-template-columns:
                            repeat(4, 1fr);
                        gap: 10px;
                        margin: 20px 0;
                    }

                    .summary div {
                        border: 1px solid #dbe3ea;
                        padding: 12px;
                        border-radius: 8px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    th,
                    td {
                        border: 1px solid #dbe3ea;
                        padding: 8px;
                        text-align: center;
                    }

                    th {
                        background: #f3f6f8;
                    }
                </style>
            </head>

            <body>
                <div class="company-header">
                    <div class="company-brand">
                        <img
                            src="${utils.escapeHTML(companyLogoUrl)}"
                            alt="Al-Howail Tyres Logo"
                        >
                        <div>
                            <div class="company-name">Al-Howail Tyres</div>
                            <div class="report-label">Salesman Profile Report</div>
                        </div>
                    </div>
                </div>

                <h1>
                    ${utils.escapeHTML(
                        profile.name
                    )}
                </h1>

                <p>
                    ${utils.escapeHTML(
                        profile.code
                    )}
                    -
                    ${utils.escapeHTML(
                        profile.branch
                    )}
                </p>

                <div class="selected-period">
                    Selected Period: ${utils.escapeHTML(selectedPeriodText)}
                </div>

                <div class="summary">
                    <div>
                        Target:
                        ${utils.formatCurrency(
                            profile.target
                        )}
                    </div>

                    <div>
                        Sales:
                        ${utils.formatCurrency(
                            profile.sales
                        )}
                    </div>

                    <div>
                        Collections:
                        ${utils.formatCurrency(
                            profile.collections
                        )}
                    </div>

                    <div>
                        Achievement:
                        ${utils.formatPercentage(
                            profile.achievement
                        )}
                    </div>

                    <div>
                        Due:
                        ${utils.formatCurrency(
                            profile.due
                        )}
                    </div>

                    <div>
                        Overdue:
                        ${utils.formatCurrency(
                            profile.overdue
                        )}
                    </div>

                    <div>
                        Invoices:
                        ${utils.formatNumber(
                            profile.invoiceCount
                        )}
                    </div>

                    <div>
                        Customers:
                        ${utils.formatNumber(
                            profile.customers
                                .length
                        )}
                    </div>

                    <div>
                        New Customers:
                        ${utils.formatNumber(profile.newCustomerCount, 0)}
                    </div>

                    <div>
                        Reactivated Customers:
                        ${utils.formatNumber(profile.reactivatedCustomerCount, 0)}
                    </div>
                </div>

                <h2 style="margin:22px 0 10px;font-size:18px;">Customers List</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Customer Code</th>
                            <th>Customer Name</th>
                            <th>Last Purchase</th>
                            <th>Sales</th>
                            <th>Collections</th>
                            <th>Due</th>
                            <th>Overdue</th>
                            <th>Overdue Days</th>
                            <th>Credit Limit</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${bodyRows}
                    </tbody>
                </table>

                <h2 style="margin:26px 0 10px;font-size:18px;">New Customers (${utils.formatNumber(profile.newCustomerCount, 0)})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Customer Code</th>
                            <th>Customer Name</th>
                            <th>Date Added</th>
                            <th>Sales This Period</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${newCustomerPrintRows || '<tr><td colspan="4">No new customers in the selected period</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="3" style="text-align:right;">Total Sales</th>
                            <th>${utils.formatCurrency(newCustomerTotalSales)}</th>
                        </tr>
                    </tfoot>
                </table>

                <h2 style="margin:26px 0 10px;font-size:18px;">Reactivated Customers (${utils.formatNumber(profile.reactivatedCustomerCount, 0)})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Customer Code</th>
                            <th>Customer Name</th>
                            <th>Date Reactivated</th>
                            <th>Sales This Period</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reactivatedCustomerPrintRows || '<tr><td colspan="4">No reactivated customers in the selected period</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="3" style="text-align:right;">Total Sales</th>
                            <th>${utils.formatCurrency(reactivatedCustomerTotalSales)}</th>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        window.setTimeout(
            () => printWindow.print(),
            700
        );

        return true;
    }

    function bindEvents() {
        if (eventsBound) {
            return;
        }

        utils.byId(
            "profileSalesmanSelect"
        )?.addEventListener(
            "change",
            render
        );

        utils.byId(
            "profileCustomersSearchInput"
        )?.addEventListener(
            "input",
            render
        );

        utils.byId(
            "exportSalesmanProfileButton"
        )?.addEventListener(
            "click",
            exportExcel
        );

        utils.byId(
            "printSalesmanProfileButton"
        )?.addEventListener(
            "click",
            printProfile
        );

        eventsBound = true;
    }

    function initialize() {
        bindEvents();
        populateSalesmen();
        render();
    }

    return Object.freeze({
        initialize,
        bindEvents,

        setData,
        setTargets,
        setInvoices,
        setCollections,
        setDueOverdue,

        getSalesmen,
        getSelectedSalesmanCode,
        getExportRows,

        render,
        exportExcel,
        printProfile
    });
})();