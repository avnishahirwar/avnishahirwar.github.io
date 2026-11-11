import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
function reply(body: Record<string, unknown>, status = 200, retryAfter?: number) {
  const headers = new Headers(cors);
  if (retryAfter && retryAfter > 0) headers.set("Retry-After", String(retryAfter));
  return new Response(JSON.stringify(body), { status, headers });
}
function dbClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const secret = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !secret) throw new Error("API service configuration is unavailable.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const get = (input: Record<string, unknown>, ...names: string[]) => {
  for (const name of names) if (Object.prototype.hasOwnProperty.call(input, name)) return input[name];
  return undefined;
};
const num = (input: Record<string, unknown>, ...names: string[]) => {
  const value = get(input, ...names);
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
};
const str = (input: Record<string, unknown>, ...names: string[]) => {
  const value = get(input, ...names);
  return typeof value === "string" ? value.trim() : "";
};
function progressiveTax(income: number, slabs: [number, number][]) {
  let previous = 0, tax = 0;
  for (const [cap, rate] of slabs) {
    const slice = Math.max(0, Math.min(income, cap) - previous);
    tax += slice * rate;
    previous = cap;
    if (income <= cap) break;
  }
  return tax;
}
function taxEstimate(income: number, regime: string) {
  const isNew = regime.toLowerCase().startsWith("new");
  const slabs: [number, number][] = isNew
    ? [[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]]
    : [[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]];
  const taxBeforeRebate = progressiveTax(income, slabs);
  let rebate = 0;
  if (isNew) {
    rebate = income <= 1200000
      ? Math.min(taxBeforeRebate, 60000)
      : Math.min(60000, taxBeforeRebate, Math.max(0, taxBeforeRebate - (income - 1200000)));
  } else if (income <= 500000) {
    rebate = Math.min(taxBeforeRebate, 12500);
  }
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
  const cess = taxAfterRebate * .04;
  return { taxBeforeRebate, rebate, cess, estimatedTax: taxAfterRebate + cess };
}
function calculate(calculator: string, input: Record<string, unknown>) {
  const limit = 1e12;
  if (calculator === "gst") {
    const amount = num(input, "amount"), rate = num(input, "rate");
    const mode = (str(input, "mode") || "exclusive").toLowerCase();
    const supply = (str(input, "supply") || "intra-state").toLowerCase();
    if (!(amount >= 0 && amount <= limit && rate >= 0 && rate <= 100)) throw new Error("GST requires amount from 0 to 1,000,000,000,000 and rate from 0 to 100.");
    const remove = ["remove", "inclusive", "remove gst"].includes(mode);
    if (!["add","exclusive","remove","inclusive","add gst","remove gst"].includes(mode)) throw new Error("GST mode must be add or remove.");
    const base = remove ? round(amount * 100 / (100 + rate)) : round(amount);
    const total = remove ? round(amount) : round(base + round(base * rate / 100));
    const tax = round(total - base);
    const intra = !["inter","inter-state","igst"].includes(supply);
    const cgst = intra ? round(tax / 2) : 0;
    const sgst = intra ? round(tax - cgst) : 0;
    return {
      taxableAmount: base, gstAmount: tax, totalAmount: total, rate,
      mode: remove ? "remove" : "add", supply: intra ? "intra-state" : "inter-state",
      ...(intra ? { cgst, sgst } : { igst: tax })
    };
  }
  if (calculator === "emi") {
    const principal = num(input, "principal");
    const annualRate = num(input, "annualRate", "rate");
    const monthsRaw = get(input, "months");
    const months = typeof monthsRaw === "number" ? monthsRaw : num(input, "years") * 12;
    if (!(principal > 0 && principal <= limit && annualRate >= 0 && annualRate <= 100 &&
      Number.isInteger(months) && months >= 1 && months <= 600)) {
      throw new Error("EMI requires principal above 0, annualRate 0–100%, and months 1–600 (or years 1–50).");
    }
    const monthlyRate = annualRate / 1200;
    const emi = monthlyRate === 0 ? principal / months
      : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return { monthlyEmi: round(emi), totalPayment: round(emi * months), totalInterest: round(emi * months - principal), months };
  }
  if (calculator === "fd") {
    const principal = num(input, "principal"), annualRate = num(input, "annualRate", "rate");
    const years = num(input, "years"), frequency = get(input, "frequency") === undefined ? 4 : num(input, "frequency");
    if (!(principal > 0 && principal <= limit && annualRate >= 0 && annualRate <= 100 &&
      years > 0 && years <= 50 && [1,2,4,12].includes(frequency))) {
      throw new Error("FD requires principal above 0, annualRate 0–100%, years above 0 up to 50, and frequency 1, 2, 4 or 12.");
    }
    const maturity = principal * Math.pow(1 + annualRate / (100 * frequency), frequency * years);
    return { maturityValue: round(maturity), principal: round(principal), estimatedInterest: round(maturity - principal), frequency };
  }
  if (calculator === "discount") {
    const price = num(input, "price", "amount"), discountPercent = num(input, "discountPercent", "rate");
    if (!(price >= 0 && price <= limit && discountPercent >= 0 && discountPercent <= 100)) {
      throw new Error("Discount requires price from 0 to 1,000,000,000,000 and discountPercent from 0 to 100.");
    }
    const discountAmount = price * discountPercent / 100;
    return { originalPrice: round(price), discountAmount: round(discountAmount), finalPrice: round(price - discountAmount), discountPercent };
  }
  if (calculator === "profit-loss") {
    const costPrice = num(input, "costPrice", "cost"), sellingPrice = num(input, "sellingPrice", "selling");
    if (!(costPrice > 0 && costPrice <= limit && sellingPrice >= 0 && sellingPrice <= limit)) {
      throw new Error("Profit & Loss requires costPrice above 0 and sellingPrice from 0 to 1,000,000,000,000.");
    }
    const difference = sellingPrice - costPrice;
    return { status: difference > 0 ? "profit" : difference < 0 ? "loss" : "break_even", amount: round(Math.abs(difference)), percentage: round(Math.abs(difference) / costPrice * 100) };
  }
  if (calculator === "savings-interest") {
    const principal = num(input, "principal", "balance"), annualRate = num(input, "annualRate", "rate"), days = num(input, "days");
    if (!(principal >= 0 && principal <= limit && annualRate >= 0 && annualRate <= 100 && Number.isInteger(days) && days >= 1 && days <= 3650)) {
      throw new Error("Savings interest requires principal 0–1,000,000,000,000, annualRate 0–100%, and days 1–3650.");
    }
    const interest = principal * annualRate / 100 * days / 365;
    return { estimatedInterest: round(interest), balancePlusInterest: round(principal + interest), days };
  }
  if (calculator === "salary") {
    const monthly = num(input, "monthly"), days = num(input, "days"), hours = num(input, "hours");
    if (!(monthly >= 0 && monthly <= limit && days > 0 && days <= 31 && hours > 0 && hours <= 24)) {
      throw new Error("Salary requires monthly salary 0–1,000,000,000,000, working days 1–31 and hours per day 1–24.");
    }
    return { dailyEstimate: round(monthly / days), hourlyEstimate: round(monthly / (days * hours)) };
  }
  if (calculator === "inflation") {
    const amount = num(input, "amount"), rate = num(input, "rate", "annualRate"), years = num(input, "years");
    if (!(amount >= 0 && amount <= limit && rate >= 0 && rate <= 100 && years >= 0 && years <= 100)) {
      throw new Error("Inflation requires amount 0–1,000,000,000,000, rate 0–100% and years 0–100.");
    }
    const future = amount * Math.pow(1 + rate / 100, years);
    return { estimatedFutureCost: round(future), estimatedIncrease: round(future - amount) };
  }
  if (calculator === "fuel-cost") {
    const distance = num(input, "distance"), mileage = num(input, "mileage"), price = num(input, "price", "fuelPrice");
    if (!(distance >= 0 && distance <= limit && mileage > 0 && mileage <= 1000 && price >= 0 && price <= 100000)) {
      throw new Error("Fuel cost requires distance >= 0 km, mileage above 0 km/litre (up to 1,000) and price >= 0 INR/litre.");
    }
    const litres = distance / mileage;
    return { fuelRequiredLitres: round(litres), estimatedTripCost: round(litres * price) };
  }
  if (calculator === "income-tax") {
    const income = num(input, "income", "taxableIncome");
    const regime = str(input, "regime") || "New regime";
    if (!(income >= 0 && income <= limit) || !["new regime","new regime — tax year 2026–27","old regime","old regime — individual below 60"].includes(regime.toLowerCase())) {
      throw new Error("Income tax requires non-negative annual taxable income and regime 'new' or 'old'.");
    }
    const tax = taxEstimate(income, regime);
    return { taxableIncome: round(income), regime: regime.toLowerCase().startsWith("new") ? "new" : "old", taxBeforeRebate: round(tax.taxBeforeRebate), indicativeRebate: round(tax.rebate), cess: round(tax.cess), estimatedTaxIncludingCess: round(tax.estimatedTax), taxYear: "2026-27" };
  }
  if (calculator === "salary-tds") {
    const income = num(input, "income"), paid = num(input, "paid", "taxAlreadyPaid"), months = num(input, "months");
    if (!(income >= 0 && income <= limit && paid >= 0 && paid <= limit && Number.isInteger(months) && months >= 1 && months <= 12)) {
      throw new Error("Salary TDS requires annual taxable income >= 0, paid tax >= 0 and remaining payroll months 1–12.");
    }
    const tax = taxEstimate(income, "New regime");
    const balance = Math.max(0, tax.estimatedTax - paid);
    return { indicativeAnnualTaxIncludingCess: round(tax.estimatedTax), taxAlreadyPaid: round(paid), estimatedBalance: round(balance), indicativeMonthlyTds: round(balance / months), monthsRemaining: months, taxYear: "2026-27" };
  }
  if (calculator === "bmi") {
    const height = num(input, "height"), weight = num(input, "weight");
    if (!(height >= 50 && height <= 260 && weight >= 2 && weight <= 350)) throw new Error("BMI requires height 50–260 cm and weight 2–350 kg.");
    return { bmi: round(weight / Math.pow(height / 100, 2)), interpretation: "BMI number only. Adult categories do not apply to people under 18; use age-specific guidance from a qualified health professional." };
  }
  if (calculator === "epf") {
    const monthly = num(input, "monthly"), rate = num(input, "rate", "annualRate"), years = num(input, "years");
    if (!(monthly > 0 && monthly <= 10000000 && rate >= 0 && rate <= 30 && years > 0 && years <= 50)) {
      throw new Error("EPF requires monthly contribution above 0 (up to 10,000,000), rate 0–30% and years above 0 up to 50.");
    }
    const months = Math.round(years * 12), monthlyRate = rate / 1200;
    const total = monthlyRate === 0 ? monthly * months : monthly * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    return { estimatedContributions: round(monthly * months), illustrativeAccumulatedValue: round(total), illustrativeInterest: round(total - monthly * months), months };
  }
  if (calculator === "age") {
    const dob = str(input, "dob", "dateOfBirth"), asof = str(input, "asof", "asOfDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{4}-\d{2}-\d{2}$/.test(asof)) throw new Error("Age requires dob and asof dates in YYYY-MM-DD format.");
    const a = new Date(dob + "T00:00:00Z"), b = new Date(asof + "T00:00:00Z");
    if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || a.toISOString().slice(0,10) !== dob || b.toISOString().slice(0,10) !== asof || a > b) throw new Error("Date of birth must be a valid date on or before the as-of date.");
    let years = b.getUTCFullYear() - a.getUTCFullYear();
    let months = b.getUTCMonth() - a.getUTCMonth();
    let days = b.getUTCDate() - a.getUTCDate();
    if (days < 0) { months--; days += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (months < 0) { years--; months += 12; }
    return { ageYears: years, ageMonths: months, ageDays: days, age: years + " years, " + months + " months, " + days + " days" };
  }
  if (calculator === "electricity") {
    const units = num(input, "units"), rate = num(input, "rate"), fixed = get(input, "fixed") === undefined ? 0 : num(input, "fixed"), other = get(input, "other") === undefined ? 0 : num(input, "other");
    if (!(units >= 0 && units <= limit && rate >= 0 && rate <= 100000 && fixed >= 0 && fixed <= limit && other >= 0 && other <= limit)) {
      throw new Error("Electricity requires units >= 0 kWh, rate >= 0 INR/unit and non-negative fixed/other charges.");
    }
    const energyCharges = units * rate;
    return { energyCharges: round(energyCharges), estimatedBill: round(energyCharges + fixed + other), fixedCharges: round(fixed), otherCharges: round(other) };
  }
  if (calculator === "sip") {
    const monthly = num(input, "monthly", "monthlyInvestment"), annualRate = num(input, "rate", "annualRate"), years = num(input, "years");
    if (!(monthly > 0 && monthly <= 10000000 && annualRate >= 0 && annualRate <= 50 && Number.isInteger(years) && years >= 1 && years <= 50)) {
      throw new Error("SIP requires monthly investment 1–10,000,000 INR, annual return 0–50% and whole years 1–50.");
    }
    const months = years * 12, monthlyRate = annualRate / 1200;
    const factor = monthlyRate === 0 ? months : ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const invested = monthly * months, future = monthly * factor;
    return { totalContributions: round(invested), illustrativeEstimatedValue: round(future), illustrativeGainOrLoss: round(future - invested), months, contributionTiming: "beginning of each month" };
  }
  if (calculator === "ppf") {
    const yearlyDeposit = num(input, "yearlyDeposit", "amount"), rate = num(input, "rate", "annualRate"), years = num(input, "years");
    if (!(yearlyDeposit >= 500 && yearlyDeposit <= 150000 && rate >= 0 && rate <= 15 && Number.isInteger(years) && years >= 15 && years <= 50)) {
      throw new Error("PPF requires yearlyDeposit INR 500–150,000, rate 0–15% and whole-year tenure 15–50.");
    }
    let maturity = 0;
    for (let year = 0; year < years; year++) maturity = (maturity + yearlyDeposit) * (1 + rate / 100);
    const invested = yearlyDeposit * years;
    return { maturityValue: round(maturity), totalDeposited: round(invested), estimatedInterest: round(maturity - invested), years, depositTiming: "beginning of each year" };
  }
  if (calculator === "ctc-salary") {
    const ctc = num(input, "ctc", "annualCtc"), basicPercent = num(input, "basicPercent"), pfPercent = num(input, "pfPercent");
    const professionalTax = get(input, "professionalTaxMonthly") === undefined ? 0 : num(input, "professionalTaxMonthly");
    const tds = get(input, "tdsMonthly") === undefined ? 0 : num(input, "tdsMonthly");
    const gratuityRaw = get(input, "includeGratuity");
    const includeGratuity = gratuityRaw === undefined ? false : gratuityRaw === true || gratuityRaw === 1 || gratuityRaw === "yes";
    if (!(ctc > 0 && ctc <= limit && basicPercent > 0 && basicPercent <= 100 && pfPercent >= 0 && pfPercent <= 100 && professionalTax >= 0 && professionalTax <= 1000000 && tds >= 0 && tds <= 100000000)) {
      throw new Error("CTC salary requires ctc > 0, basicPercent 0–100, pfPercent 0–100 and non-negative monthly deductions.");
    }
    const basic = ctc * basicPercent / 100, employerPf = basic * pfPercent / 100, employeePf = basic * pfPercent / 100;
    const gratuity = includeGratuity ? basic * .0481 : 0;
    const monthlyGross = (ctc - employerPf - gratuity) / 12;
    const takeHome = monthlyGross - employeePf / 12 - professionalTax - tds;
    return { monthlyTakeHomeEstimate: round(takeHome), annualBasicSalary: round(basic), annualEmployerPf: round(employerPf), annualEmployeePf: round(employeePf), annualGratuityProvision: round(gratuity), monthlyGrossCashSalary: round(monthlyGross), monthlyProfessionalTax: round(professionalTax), monthlyTds: round(tds) };
  }
  if (calculator === "hra") {
    const actualHra = num(input, "actualHraReceived", "hraReceived"), basic = num(input, "basicSalary"), rent = num(input, "rentPaid");
    const metroRaw = get(input, "metro");
    const metro = metroRaw === true || metroRaw === 1 || String(metroRaw).toLowerCase() === "metro";
    if (!(actualHra >= 0 && actualHra <= limit && basic > 0 && basic <= limit && rent >= 0 && rent <= limit)) {
      throw new Error("HRA requires actualHraReceived >= 0, basicSalary > 0 and rentPaid >= 0.");
    }
    const rentLimit = Math.max(0, rent - .10 * basic);
    const salaryLimit = basic * (metro ? .5 : .4);
    const exemption = Math.min(actualHra, rentLimit, salaryLimit);
    return { exemptedHra: round(exemption), taxableHra: round(actualHra - exemption), actualHraReceived: round(actualHra), rentLessTenPercentSalary: round(rentLimit), salaryLimit: round(salaryLimit), locationType: metro ? "metro" : "non-metro" };
  }
  if (calculator === "basic") {
    const a = num(input, "a", "first"), operation = str(input, "operation").toLowerCase();
    if (!(Number.isFinite(a) && Math.abs(a) <= limit)) throw new Error("Basic calculator requires numeric input a.");
    if (["percent","percentage"].includes(operation)) return { result: round(a / 100), operation: "percent", explanation: a + "% = " + round(a / 100) };
    const b = num(input, "b", "second");
    if (!(Number.isFinite(b) && Math.abs(b) <= limit)) throw new Error("Basic calculator requires numeric input b for arithmetic operations.");
    let result: number;
    if (["add","+","plus"].includes(operation)) result = a + b;
    else if (["subtract","-","minus"].includes(operation)) result = a - b;
    else if (["multiply","*","×"].includes(operation)) result = a * b;
    else if (["divide","/","÷"].includes(operation)) {
      if (b === 0) throw new Error("Division by zero is not defined.");
      result = a / b;
    } else throw new Error("Basic operation must be add, subtract, multiply, divide or percent.");
    if (!Number.isFinite(result)) throw new Error("The calculation result is outside the supported numeric range.");
    return { first: a, second: b, operation, result: round(result) };
  }
  throw new Error("Unsupported calculator. Use one of the 20 calculator identifiers listed in the API documentation.");
}
async function finalize(admin: any, usageId: number, status: number, started: number) {
  const { error } = await admin.rpc("finalize_api_request", {
    p_usage_id: usageId, p_status_code: status,
    p_duration_ms: Math.min(120000, Math.max(0, Math.round(performance.now() - started)))
  });
  if (error) throw error;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST.", code: "METHOD_NOT_ALLOWED" }, 405);
  if (Number(req.headers.get("content-length") || "0") > 16000) return reply({ error: "Request too large.", code: "REQUEST_TOO_LARGE" }, 413);
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return reply({ error: "Send a JSON request body.", code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  const started = performance.now();
  let admin: any = null, usageId = 0;
  try {
    const rawKey = req.headers.get("x-api-key") || "";
    if (!rawKey.startsWith("avsk_live_") || rawKey.length < 35) return reply({ error: "A valid Friendly Calculator API key is required.", code: "INVALID_API_KEY" }, 401);
    admin = dbClient();
    const prefix = rawKey.slice(0, 18);
    const { data: keyRow, error: keyError } = await admin.from("api_keys")
      .select("id,key_hash,scopes,revoked_at,expires_at")
      .eq("key_prefix", prefix).maybeSingle();
    if (keyError) throw keyError;
    const digest = await (async () => {
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
      return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    })();
    if (!keyRow || keyRow.revoked_at || (keyRow.expires_at && new Date(keyRow.expires_at).getTime() <= Date.now()) ||
        keyRow.key_hash.length !== digest.length || !cryptoSafeEqual(keyRow.key_hash, digest)) {
      return reply({ error: "API key is invalid, expired or revoked.", code: "INVALID_API_KEY" }, 401);
    }
    if (!Array.isArray(keyRow.scopes) || !keyRow.scopes.includes("calculators:read")) {
      return reply({ error: "API key does not have the required calculators:read scope.", code: "INSUFFICIENT_SCOPE" }, 403);
    }
    const rawBody = await req.text();
    if (rawBody.length > 16000) return reply({ error: "Request too large.", code: "REQUEST_TOO_LARGE" }, 413);
    let body: any;
    try { body = JSON.parse(rawBody); }
    catch { body = null; }
    const calculator = typeof body?.calculator === "string" ? body.calculator.toLowerCase().trim() : "invalid-json";
    const { data: reservation, error: reserveError } = await admin.rpc("reserve_api_request", {
      p_api_key_id: keyRow.id, p_endpoint: calculator || "unknown"
    });
    if (reserveError) throw reserveError;
    if (!reservation?.allowed) {
      const status = Number(reservation?.status) || 403;
      return reply({
        error: reservation?.error || "API request was not allowed.",
        code: status === 429 ? "QUOTA_OR_RATE_LIMIT_EXCEEDED" : "API_ACCESS_DISABLED",
        ...(reservation?.quota !== undefined ? { quota: reservation.quota, used: reservation.used, remaining: reservation.remaining } : {}),
        ...(reservation?.retry_after_seconds ? { retry_after_seconds: reservation.retry_after_seconds } : {})
      }, status, Number(reservation?.retry_after_seconds) || undefined);
    }
    usageId = Number(reservation.usage_id);
    if (!body || typeof body !== "object" || Array.isArray(body) || !body.inputs || typeof body.inputs !== "object" || Array.isArray(body.inputs)) {
      await finalize(admin, usageId, 400, started);
      return reply({ error: "Request body must contain calculator and an inputs object.", code: "INVALID_REQUEST_BODY" }, 400);
    }
    if (typeof body.calculator !== "string" || !calculator) {
      await finalize(admin, usageId, 400, started);
      return reply({ error: "Choose a calculator identifier.", code: "INVALID_CALCULATOR" }, 400);
    }
    let result: Record<string, unknown>;
    try { result = calculate(calculator, body.inputs); }
    catch (error) {
      await finalize(admin, usageId, 400, started);
      return reply({ error: error instanceof Error ? error.message : "Invalid calculator inputs.", code: "INVALID_INPUT", calculator }, 400);
    }
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    await finalize(admin, usageId, 200, started);
    return reply({
      ok: true, calculator, result,
      usage: {
        plan: reservation.plan_code,
        quota: reservation.quota,
        used: reservation.used,
        remaining: reservation.remaining,
        rate_limit_per_minute: reservation.rate_limit_per_minute
      }
    });
  } catch (_error) {
    if (admin && usageId) {
      try { await finalize(admin, usageId, 500, started); } catch (_ignored) { /* keep response generic */ }
    }
    return reply({ error: "The API could not process this request. Please retry later.", code: "INTERNAL_ERROR" }, 500);
  }
});
function cryptoSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}
