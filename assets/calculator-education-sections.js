(() => {
  'use strict';

  // Read existing page copy and equation metadata; never alter calculation inputs or logic.
  if (new URLSearchParams(location.search).get('embed') === '1') return;
  if (!/(?:^|\/)calculators\/[^/]+\.html$/i.test(location.pathname)) return;

  const main = document.querySelector('main');
  if (!main || main.querySelector('#fc-learning-sections')) return;
  const titleNode = main.querySelector('h1');
  const calculatorUi = main.querySelector('form, [data-fc-native-calculator], #live-page-calculator, #calc, #calcForm');
  if (!titleNode || !calculatorUi) return;

  const pageTitle = (titleNode.textContent || '').trim();
  const route = location.pathname.toLowerCase();
  // Skip restricted or safety-sensitive calculator topics.
  const excludedTopic = /(?:firearm|weapon|ammunition|rounds-per-minute|twist-rate|bullet|rifle|opioid|overdose|dosage|drug-dose|medication|paracetamol|acetaminophen|prescription|poison|toxic-substance|casino|gambling|sports-bet|wager|betting|alcohol|nicotine|vape|self-harm)/i;
  if (excludedTopic.test(route) || excludedTopic.test(pageTitle)) return;

  const headingText = node => (node.textContent || '').replace(/\s+/g, ' ').trim();
  const headings = Array.from(main.querySelectorAll('h2, h3, h4'));
  const findHeading = patterns => headings.find(node => patterns.some(pattern => pattern.test(headingText(node))));

  function textAfterHeading(heading) {
    if (!heading) return '';
    const pieces = [];
    let node = heading.nextElementSibling;
    while (node && !/^H[1-6]$/.test(node.tagName)) {
      const value = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (value) pieces.push(value);
      node = node.nextElementSibling;
    }
    if (!pieces.length) {
      const parent = heading.parentElement;
      if (parent && parent !== main) {
        const value = (parent.innerText || parent.textContent || '')
          .replace(headingText(heading), '').replace(/\s+/g, ' ').trim();
        if (value) pieces.push(value);
      }
    }
    return pieces.join(' ').slice(0, 900);
  }

  function equationFromConfig() {
    const raw = window.FC_EQUATION_CONFIG;
    if (!raw) return '';
    try {
      const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const equations = Array.isArray(config.equations) ? config.equations.slice(0, 3) : [];
      return equations.map(item => {
        if (!item || !item.lhs || !item.formula) return '';
        return item.lhs + ' = ' + item.formula;
      }).filter(Boolean).join(' | ').slice(0, 900);
    } catch (_) {
      return '';
    }
  }

  const methodHeading = findHeading([
    /^(?:formula(?: and method| and calculation method)?|calculation method|how it works|how .* calculated|calculation steps?)$/i,
    /formula and calculation method/i
  ]);
  const exampleHeading = findHeading([/worked example|worked sample|^example(?:s)?$/i]);
  const historyHeading = findHeading([/^history(?: of .*)?$|historical background|origins? and history|timeline/i]);
  const factsHeading = findHeading([/interesting facts?|did you know|quick facts/i]);

  const method = textAfterHeading(methodHeading) || equationFromConfig();
  const example = textAfterHeading(exampleHeading);
  const history = textAfterHeading(historyHeading);
  const facts = textAfterHeading(factsHeading);

  const section = document.createElement('section');
  section.id = 'fc-learning-sections';
  section.className = 'fc-learning-sections';
  section.setAttribute('aria-labelledby', 'fc-learning-title');

  const heading = document.createElement('h2');
  heading.id = 'fc-learning-title';
  heading.textContent = 'Learn How This Calculator Works';
  const intro = document.createElement('p');
  intro.className = 'fc-learning-intro';
  intro.textContent = 'Understand the method, review an example, and explore verified background information before relying on a result.';
  const grid = document.createElement('div');
  grid.className = 'fc-learning-grid';
  section.append(heading, intro, grid);

  function addCard(label, value, pendingText, id) {
    const card = document.createElement('article');
    card.className = 'fc-learning-card';
    card.setAttribute('aria-labelledby', id);
    const cardHeading = document.createElement('h3');
    cardHeading.id = id;
    cardHeading.textContent = label;
    const content = document.createElement('p');
    content.textContent = value || pendingText;
    if (!value) card.classList.add('fc-learning-pending');
    card.append(cardHeading, content);
    grid.appendChild(card);
  }

  addCard('How Is the Calculation Done?', method,
    'A page-specific formula and step-by-step method still need editorial verification. Do not infer a formula from the calculator title alone.',
    'fc-learning-method');
  addCard('Example', example,
    'A worked example using checked input values and the same formula as the live calculator has not yet been published for this page.',
    'fc-learning-example');
  addCard('History', history,
    'Topic-specific history will be added after its dates and claims have been checked against reliable sources.',
    'fc-learning-history');
  addCard('Interesting Facts', facts,
    'Topic-specific facts will be added only when they can be supported by reliable sources.',
    'fc-learning-facts');

  main.appendChild(section);
})();