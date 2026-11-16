(() => {
  "use strict";

  function calculateLoanEmi(principal, annualRate, months) {
    const monthlyRate = annualRate / 1200;
    const emi = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * Math.pow(1 + monthlyRate, months) /
        (Math.pow(1 + monthlyRate, months) - 1);
    return {
      emi,
      totalRepayment: emi * months,
      totalInterest: emi * months - principal,
      monthlyRate
    };
  }

  const money = value => window.FCLocale
    ? window.FCLocale.formatCurrency(value, window.FCLocale.getCurrency(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "₹" + Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function cell(tag, text, scope) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (scope) node.scope = scope;
    return node;
  }

  function init() {
    const panel = document.getElementById("live-page-calculator");
    if (!panel || panel.dataset.fcLoanEmiReady === "true") return;
    panel.dataset.fcLoanEmiReady = "true";
    panel.replaceChildren();

    const heading = cell("h2", "Use the Loan EMI Calculator");
    panel.appendChild(heading);

    const form = document.createElement("form");
    form.noValidate = true;
    form.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px";

    const fields = [
      ["principal", "Loan amount (₹)", "500000", "0.01"],
      ["rate", "Annual interest rate (%)", "9", "0.01"],
      ["years", "Tenure (years)", "5", "0.01"]
    ];

    for (const [name, label, value, step] of fields) {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:grid;gap:5px;font-weight:600";
      wrap.appendChild(document.createTextNode(label));
      const input = document.createElement("input");
      input.type = "number";
      input.name = name;
      input.min = "0";
      input.step = step;
      input.value = value;
      input.required = true;
      input.inputMode = "decimal";
      input.style.cssText = "width:100%;padding:11px;border:1px solid #cbd5df;border-radius:8px;font:inherit";
      wrap.appendChild(input);
      form.appendChild(wrap);
    }

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn";
    submit.textContent = "Calculate";
    submit.style.cssText = "border:0;cursor:pointer;grid-column:1/-1";
    form.appendChild(submit);

    const output = document.createElement("div");
    output.className = "fc-loan-emi-results";
    output.setAttribute("aria-live", "polite");
    output.style.cssText = "display:none;margin-top:16px;padding:14px;background:#edf3f7;border-radius:10px";
    panel.append(form, output);
    let localeRefresh = false;
    const refreshForLocale = () => {
      if (output.style.display !== "none" && typeof form.requestSubmit === "function") {
        localeRefresh = true;
        try { form.requestSubmit(); } finally { localeRefresh = false; }
      }
    };
    window.addEventListener("fc:localechange", refreshForLocale);
    window.addEventListener("fc:locale-ready", refreshForLocale);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const principal = Number(form.elements.principal.value);
      const rate = Number(form.elements.rate.value);
      const years = Number(form.elements.years.value);
      const rawMonths = years * 12;
      const months = Math.round(rawMonths);

      if (!form.elements.principal.value.trim() ||
          !form.elements.rate.value.trim() ||
          !form.elements.years.value.trim() ||
          !Number.isFinite(principal) || principal <= 0 ||
          !Number.isFinite(rate) || rate < 0 || rate > 100 ||
          !Number.isFinite(years) || years <= 0 ||
          months < 1 || months > 600 ||
          Math.abs(rawMonths - months) > 0.000001) {
        output.textContent = "Enter a positive loan amount, an annual rate from 0% to 100%, and a tenure that resolves to 1–600 whole months.";
        output.style.display = "block";
        return;
      }

      const result = calculateLoanEmi(principal, rate, months);
      output.replaceChildren();

      const table = document.createElement("table");
      table.className = "fc-result-table";
      table.style.cssText = "width:100%;border-collapse:collapse";
      table.appendChild(cell("caption", "Calculation results"));
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      headRow.append(cell("th", "Result", "col"), cell("th", "Value", "col"));
      thead.appendChild(headRow);
      table.appendChild(thead);

      const rows = [
        ["Monthly EMI", result.emi],
        ["Total repayment", result.totalRepayment],
        ["Total interest", result.totalInterest]
      ];
      const tbody = document.createElement("tbody");
      for (const [label, value] of rows) {
        const row = document.createElement("tr");
        row.append(cell("th", label, "row"), cell("td", money(value)));
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      output.appendChild(table);

      const chart = document.createElement("section");
      chart.className = "fc-result-chart";
      chart.appendChild(cell("h3", "Result comparison chart"));
      const note = cell("p", "Bars use a shared relative scale; compare values only within this calculation.");
      chart.appendChild(note);
      const max = Math.max(...rows.map(([, value]) => value), 1);
      for (const [label, value] of rows) {
        const item = document.createElement("div");
        item.className = "fc-chart-item";
        const labelRow = document.createElement("div");
        labelRow.className = "fc-chart-label";
        labelRow.append(cell("span", label), cell("strong", money(value)));
        const track = document.createElement("div");
        track.className = "fc-chart-track";
        const bar = document.createElement("span");
        bar.className = "fc-chart-bar";
        bar.style.width = Math.max(2, value / max * 100) + "%";
        track.appendChild(bar);
        item.append(labelRow, track);
        chart.appendChild(item);
      }
      output.appendChild(chart);

      const schedule = document.createElement("section");
      schedule.className = "fc-amortization";
      schedule.style.cssText = "margin-top:18px;padding:14px;background:#fff;border:1px solid #d9e2ea;border-radius:10px";
      schedule.appendChild(cell("h3", "Monthly loan amortization schedule"));
      schedule.appendChild(cell("p", "Each row separates the monthly payment into principal and interest and shows the remaining loan balance. Assumes a constant rate and monthly payments."));
      const scroller = document.createElement("div");
      scroller.style.cssText = "overflow:auto;max-height:460px;border:1px solid #e1e7ed;border-radius:8px";
      const scheduleTable = document.createElement("table");
      scheduleTable.className = "fc-result-table";
      scheduleTable.style.cssText = "width:100%;min-width:720px;border-collapse:collapse";
      const scheduleHead = document.createElement("thead");
      const scheduleHeadRow = document.createElement("tr");
      for (const label of ["Payment", "Opening balance", "EMI", "Principal", "Interest", "Closing balance"]) {
        const th = cell("th", label, "col");
        th.style.cssText = "position:sticky;top:0;background:#edf3f7;z-index:1;padding:9px;text-align:right";
        scheduleHeadRow.appendChild(th);
      }
      scheduleHead.appendChild(scheduleHeadRow);
      scheduleTable.appendChild(scheduleHead);
      const scheduleBody = document.createElement("tbody");
      let balance = principal;
      for (let month = 1; month <= months; month++) {
        const opening = balance;
        const interest = opening * result.monthlyRate;
        const payment = Math.min(result.emi, opening + interest);
        const principalPaid = Math.min(opening, Math.max(0, payment - interest));
        balance = Math.max(0, opening - principalPaid);
        if (month === months || balance < 0.005) balance = 0;
        const row = document.createElement("tr");
        const values = [String(month), money(opening), money(payment), money(principalPaid), money(interest), money(balance)];
        values.forEach((value, index) => {
          const td = cell(index === 0 ? "th" : "td", value, index === 0 ? "row" : null);
          td.style.cssText = "padding:8px;border-bottom:1px solid #e7edf2;text-align:right;white-space:nowrap";
          row.appendChild(td);
        });
        scheduleBody.appendChild(row);
      }
      scheduleTable.appendChild(scheduleBody);
      scroller.appendChild(scheduleTable);
      schedule.appendChild(scroller);
      schedule.appendChild(cell("p", "Illustrative schedule only. Lender fees, payment-date conventions, rate resets, prepayments and rounding policies may change the actual statement."));
      output.appendChild(schedule);

      const solution = document.createElement("section");
      solution.className = "fc-calculation-solution";
      solution.style.cssText = "margin-top:18px;padding:14px;background:#fff;border:1px solid #d9e2ea;border-radius:10px";
      solution.appendChild(cell("h3", "How this result was calculated"));
      solution.appendChild(cell("p", "Monthly EMI uses the reducing-balance formula: P × r × (1+r)^n ÷ ((1+r)^n−1), where P is principal, r is monthly interest rate and n is the number of monthly payments. At 0% interest, principal is divided by the number of payments."));
      const steps = document.createElement("ol");
      for (const [label, value] of [
        ["Loan principal", money(principal)],
        ["Monthly interest rate", (rate / 12).toFixed(4) + "%"],
        ["Number of monthly payments", String(months)],
        ["Monthly EMI", money(result.emi)]
      ]) {
        steps.appendChild(cell("li", label + ": " + value));
      }
      solution.appendChild(steps);
      output.appendChild(solution);
      output.style.display = "block";

      if (!localeRefresh && typeof window.gtag === "function") {
        window.gtag("event", "calculator_used", {
          calculator_name: "Loan EMI Calculator",
          calculator_page: location.pathname
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.FriendlyCalculatorLoanEMI = { calculateLoanEmi };
})();
