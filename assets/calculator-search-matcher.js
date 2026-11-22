(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FriendlyCalculatorSearchMatcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SYNONYMS = {
    gst: ['goods and services tax'],
    emi: ['loan installment', 'loan instalment'],
    sip: ['systematic investment plan'],
    fd: ['fixed deposit'],
    rd: ['recurring deposit'],
    ppf: ['public provident fund'],
    vat: ['value added tax'],
    bmi: ['body mass index'],
    roi: ['return on investment'],
    hra: ['house rent allowance'],
    tds: ['tax deducted at source']
  };

  const normalize = value => String(value || '').normalize('NFKD')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tokensOf = value => normalize(value).split(/\s+/).filter(Boolean);
  // Short acronyms must match whole tokens; longer words retain prefix matching.
  const tokenMatches = (token, term) => token === term || (term.length >= 4 && token.startsWith(term));

  function hasSynonym(term, field) {
    return (SYNONYMS[term] || []).some(alias => normalize(field).includes(alias));
  }

  function getCalculatorMatch(item, terms, query, categoryLabel) {
    if (!item || !Array.isArray(terms) || !terms.length) return null;

    const name = normalize(item.name);
    const keywords = normalize(item.keywords);
    const category = normalize(categoryLabel || item.category);
    const nameTokens = tokensOf(name);
    const keywordTokens = tokensOf(keywords);
    const categoryTokens = tokensOf(category);

    // Every query term must be present in the calculator name, preventing
    // unrelated catalogue entries from being combined across fields.
    const nameMatch = terms.every(term =>
      nameTokens.some(token => tokenMatches(token, term)) || hasSynonym(term, name)
    );

    // Keywords are intentionally stricter: multi-word searches must be a
    // contiguous phrase, while a single acronym may use its explicit alias.
    const phrase = terms.join(' ');
    const keywordMatch = terms.length === 1
      ? keywordTokens.includes(terms[0]) || hasSynonym(terms[0], keywords)
      : keywords.includes(phrase);

    // Category search is only a fallback when all terms belong to that
    // category. Descriptions are not searched because they create noisy hits.
    const categoryMatch = terms.every(term =>
      categoryTokens.some(token => tokenMatches(token, term))
    );

    if (!nameMatch && !keywordMatch && !categoryMatch) return null;

    let score = nameMatch ? 120 * terms.length : keywordMatch ? 60 * terms.length : 25 * terms.length;
    const normalizedQuery = normalize(query);
    if (name === normalizedQuery) score += 1000;
    else if (name.startsWith(normalizedQuery)) score += 500;
    else if (name.includes(normalizedQuery)) score += 300;
    return score;
  }

  return { normalize, getCalculatorMatch };
});
