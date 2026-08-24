window.DashboardUpcoming = (() => {
    "use strict";
    const utils = window.DashboardUtils;
    let rows = [];
    const n = v => utils.toNumber(v);
    function selectedRows() {
        const limit = n(utils.byId("upcomingPageDays")?.value ?? 10);
        return rows.filter(r => {
            const d = n(r.daysRemainingToCollect ?? r.daysUntilDue);
            return d >= 0 && (limit === 0 ? d === 0 : d <= limit) && n(r.invoiceBalance) > 0;
        }).sort((a,b)=>n(a.daysRemainingToCollect??a.daysUntilDue)-n(b.daysRemainingToCollect??b.daysUntilDue)||n(b.invoiceBalance)-n(a.invoiceBalance));
    }
    function render() {
        const body=utils.byId("upcomingPageTableBody"); if(!body) return;
        const data=selectedRows();
        utils.setText("upcomingPageCount", utils.formatNumber(data.length,0));
        utils.setText("upcomingPageAmount", utils.formatCurrency(data.reduce((s,r)=>s+n(r.invoiceBalance),0)));
        body.innerHTML=data.length?data.map(r=>{const d=n(r.daysRemainingToCollect??r.daysUntilDue); return `<tr><td>${utils.escapeHTML(r.invoiceNo||"--")}</td><td>${utils.escapeHTML(r.customerName||"--")}</td><td>${utils.escapeHTML(r.salesmanName||r.salesmanCode||"--")}</td><td>${utils.escapeHTML(utils.formatDate(r.dueDate)||r.dueDate||"--")}</td><td>${utils.formatCurrency(r.invoiceBalance)}</td><td>${utils.formatNumber(d,0)}</td><td><span class="upcoming-status ${d===0?'critical':d<=3?'warning':'normal'}">${d===0?'Today':`Due in ${d} days`}</span></td></tr>`}).join(""):`<tr><td colspan="7" class="empty-cell">No upcoming collections for this period</td></tr>`;
    }
    function setData(data){ rows=Array.isArray(data)?data:[]; render(); }
    function exportExcel(){ const data=selectedRows().map(r=>({"Invoice Number":r.invoiceNo,"Customer Name":r.customerName,"Salesman":r.salesmanName||r.salesmanCode,"Due Date":r.dueDate,"Balance Due":n(r.invoiceBalance),"Days Remaining":n(r.daysRemainingToCollect??r.daysUntilDue),"Status":n(r.daysRemainingToCollect??r.daysUntilDue)===0?'Today':'Upcoming'})); if(!data.length)return; const ws=XLSX.utils.json_to_sheet(data), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Upcoming Collections"); XLSX.writeFile(wb,"Upcoming-Collections.xlsx"); }
    function printReport(){ const data=selectedRows(); const total=data.reduce((s,r)=>s+n(r.invoiceBalance),0); const range=utils.byId("upcomingPageDays")?.selectedOptions?.[0]?.textContent||"Next 10 Days"; const logo=new URL("al-howail-logo.png",window.location.href).href; const w=window.open("","_blank"); if(!w)return; w.document.write(`<!doctype html><html><head><title>Upcoming Collections Report</title><style>body{font-family:Arial,sans-serif;color:#0b1f3a;padding:28px}header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #0f6b80;padding-bottom:14px;margin-bottom:18px}header img{width:60px}.company{font-size:26px;font-weight:700}.sub{color:#60738c}.summary{display:flex;gap:12px;margin:18px 0}.box{border:1px solid #d7e0e8;padding:10px 14px;border-radius:6px;min-width:180px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d7e0e8;padding:8px;text-align:center}th{background:#eef3f7}@media print{body{padding:0}}</style></head><body><header><img src="${logo}"><div><div class="company">Al-Howail Tyres</div><div class="sub">Upcoming Collections Report</div></div></header><div><b>Period:</b> ${range} &nbsp; | &nbsp; <b>Report Date:</b> ${new Date().toLocaleDateString()}</div><div class="summary"><div class="box"><b>Invoices</b><br>${data.length}</div><div class="box"><b>Total Balance Due</b><br>${utils.formatCurrency(total)}</div></div><table><thead><tr><th>Invoice Number</th><th>Customer Name</th><th>Salesman</th><th>Due Date</th><th>Balance Due</th><th>Days Remaining</th><th>Status</th></tr></thead><tbody>${data.map(r=>{const d=n(r.daysRemainingToCollect??r.daysUntilDue);return `<tr><td>${utils.escapeHTML(r.invoiceNo||'')}</td><td>${utils.escapeHTML(r.customerName||'')}</td><td>${utils.escapeHTML(r.salesmanName||r.salesmanCode||'')}</td><td>${utils.escapeHTML(r.dueDate||'')}</td><td>${utils.formatCurrency(r.invoiceBalance)}</td><td>${d}</td><td>${d===0?'Today':`Due in ${d} days`}</td></tr>`}).join('')}</tbody></table></body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),500); }
    function bind(){ utils.byId("upcomingPageDays")?.addEventListener("change",render); utils.byId("exportUpcomingExcelButton")?.addEventListener("click",exportExcel); utils.byId("printUpcomingButton")?.addEventListener("click",printReport); }
    document.addEventListener("DOMContentLoaded",bind);
    return Object.freeze({setData,render});
})();
