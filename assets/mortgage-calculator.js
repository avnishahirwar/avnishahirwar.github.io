'use strict';

function calculateMortgage({
  homePrice,
  downPayment,
  annualInterestRate,
  termYears,
  annualPropertyTax = 0,
  annualHomeInsurance = 0,
  monthlyMaintenance = 0
}) {
  const values = {
    homePrice: Number(homePrice),
    downPayment: Number(downPayment),
    annualInterestRate: Number(annualInterestRate),
    termYears: Number(termYears),
    annualPropertyTax: Number(annualPropertyTax),
    annualHomeInsurance: Number(annualHomeInsurance),
    monthlyMaintenance: Number(monthlyMaintenance)
  };

  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) throw new TypeError(name + ' must be a finite number.');
  }
  if (values.homePrice <= 0) throw new RangeError('Home price must be greater than zero.');
  if (values.downPayment < 0 || values.downPayment > values.homePrice) {
    throw new RangeError('Down payment must be between zero and the home price.');
  }
  if (values.annualInterestRate < 0 || values.annualInterestRate > 50) {
    throw new RangeError('Annual interest rate must be between 0% and 50%.');
  }
  if (!Number.isInteger(values.termYears) || values.termYears < 1 || values.termYears > 50) {
    throw new RangeError('Loan term must be a whole number from 1 to 50 years.');
  }
  if (values.annualPropertyTax < 0 || values.annualHomeInsurance < 0 || values.monthlyMaintenance < 0) {
    throw new RangeError('Property tax, insurance and maintenance cannot be negative.');
  }

  const loanAmount = values.homePrice - values.downPayment;
  const numberOfPayments = values.termYears * 12;
  const monthlyRate = values.annualInterestRate / 1200;
  let monthlyPrincipalAndInterest = 0;

  if (loanAmount > 0) {
    monthlyPrincipalAndInterest = monthlyRate === 0
      ? loanAmount / numberOfPayments
      : loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  }

  const monthlyPropertyTax = values.annualPropertyTax / 12;
  const monthlyHomeInsurance = values.annualHomeInsurance / 12;
  const monthlyTotal = monthlyPrincipalAndInterest
    + monthlyPropertyTax
    + monthlyHomeInsurance
    + values.monthlyMaintenance;
  const totalPrincipalAndInterest = monthlyPrincipalAndInterest * numberOfPayments;

  return Object.freeze({
    homePrice: values.homePrice,
    downPayment: values.downPayment,
    loanAmount,
    numberOfPayments,
    monthlyRate,
    monthlyPrincipalAndInterest,
    monthlyPropertyTax,
    monthlyHomeInsurance,
    monthlyMaintenance: values.monthlyMaintenance,
    monthlyTotal,
    totalPrincipalAndInterest,
    totalInterest: totalPrincipalAndInterest - loanAmount
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateMortgage };
}
if (typeof globalThis !== 'undefined') {
  globalThis.FCMortgage = Object.freeze({ calculateMortgage });
}
