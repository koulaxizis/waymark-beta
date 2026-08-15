/* =========================================================
   WAYMARK — Tutorial Mode Module
   Bilingual interactive walkthrough.
   10 steps highlighting key features.
   ========================================================= */

const TUTORIAL_STEPS = [
  { target: '#map',              placement: 'center', titleKey: 'tutorial.welcome.title', bodyKey: 'tutorial.welcome.body' },
  { target: '#map',              placement: 'center', titleKey: 'tutorial.map.title',     bodyKey: 'tutorial.map.body' },
  { target: '#layerSelector',    placement: 'left',   titleKey: 'tutorial.layers.title',   bodyKey: 'tutorial.layers.body' },
  { target: '.module-toggle-panel', placement: 'right', titleKey: 'tutorial.modules.title', bodyKey: 'tutorial.modules.body' },
  { target: '.module-toggle-panel', placement: 'right', titleKey: 'tutorial.search.title',  bodyKey: 'tutorial.search.body' },
  { target: '.module-toggle-panel', placement: 'right', titleKey: 'tutorial.poi.title',     bodyKey: 'tutorial.poi.body' },
  { target: '.module-toggle-panel', placement: 'right', titleKey: 'tutorial.export.title',  bodyKey: 'tutorial.export.body' },
  { target: '.header',           placement: 'bottom', titleKey: 'tutorial.offline.title',   bodyKey: 'tutorial.offline.body' },
  { target: '.footer',           placement: 'top',    titleKey: 'tutorial.privacy.title',  bodyKey: 'tutorial.privacy.body' },
  { target: null,               placement: 'center', titleKey: 'tutorial.done.title',     bodyKey: 'tutorial.done.body' },
];

function initTutorial(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>📖 ${t('module.tutorial')}</h2>
    <div class="module-form">
      <p style="font-size: 0.9rem; color: var(--fg-muted); margin-bottom: 1rem;">
        ${isEl ? 'Ένας γρήγορος διαδραστικός οδηγός 10 βημάτων.' : 'A quick 10-step interactive guide.'}
      </p>
      <button class="btn" id="tutorialStartBtn">${t('tutorial.start')}</button>
    </div>
  `;

  document.getElementById('tutorialStartBtn').addEventListener('click', () => {
    startTutorialWalkthrough();
  });
}

function startTutorialWalkthrough() {
  let currentStep = 0;

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0);transition:background 0.3s;';
  document.body.appendChild(overlay);

  function showStep(idx) {
    if (idx >= TUTORIAL_STEPS.length) {
      overlay.remove();
      return;
    }

    const step = TUTORIAL_STEPS[idx];
    const target = step.target ? document.querySelector(step.target) : null;

    // Remove previous tooltip
    const prevTooltip = document.getElementById('tutorial-tooltip');
    if (prevTooltip) prevTooltip.remove();

    // Reset previous target styles
    document.querySelectorAll('[data-tutorial-highlighted]').forEach(el => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.removeAttribute('data-tutorial-highlighted');
    });

    // Highlight target
    if (target) {
      target.setAttribute('data-tutorial-highlighted', 'true');
      target.style.zIndex = '10001';
      target.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.7)';
      target.style.borderRadius = '8px';
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: var(--bg-secondary);
      border: 1px solid var(--accent);
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 380px;
      z-index: 10002;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transition: opacity 0.3s;
    `;

    tooltip.innerHTML = `
      <h3 style="margin-bottom: 0.75rem; color: var(--accent); font-size: 1.1rem;">${t(step.titleKey)}</h3>
      <p style="margin-bottom: 1.25rem; font-size: 0.9rem; line-height: 1.6;">${t(step.bodyKey)}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button id="tutorialSkip" style="background: transparent; border: none; color: var(--fg-muted); cursor: pointer; font-size: 0.85rem;">${t('tutorial.skip')}</button>
        <div style="display: flex; gap: 0.5rem;">
          ${idx > 0 ? '<button id="tutorialPrev" class="btn btn-secondary" style="padding: 0.5rem 1rem;">← ' + t('common.previous') + '</button>' : ''}
          <button id="tutorialNext" class="btn" style="padding: 0.5rem 1rem;">
            ${idx === TUTORIAL_STEPS.length - 1 ? t('common.finish') : t('common.next') + ' →'}
          </button>
        </div>
      </div>
      <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--fg-muted);">${idx + 1} / ${TUTORIAL_STEPS.length}</div>
    `;

    document.body.appendChild(tooltip);
    positionTooltip(tooltip, target, step.placement);

    document.getElementById('tutorialNext').onclick = () => {
      cleanupStep(target);
      showStep(idx + 1);
    };

    const prevBtn = document.getElementById('tutorialPrev');
    if (prevBtn) {
      prevBtn.onclick = () => { cleanupStep(target); showStep(idx - 1); };
    }

    document.getElementById('tutorialSkip').onclick = () => {
      cleanupStep(target);
      overlay.remove();
    };
  }

  function cleanupStep(target) {
    if (target) {
      target.style.zIndex = '';
      target.style.boxShadow = '';
      target.removeAttribute('data-tutorial-highlighted');
    }
    const tooltip = document.getElementById('tutorial-tooltip');
    if (tooltip) tooltip.remove();
  }

  function positionTooltip(tooltip, target, placement) {
    if (!target) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 16;

    switch (placement) {
      case 'right':
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.left = (rect.right + margin) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'left':
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.left = (rect.left - tooltipRect.width - margin) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        tooltip.style.top = (rect.bottom + margin) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        break;
      case 'top':
        tooltip.style.top = (rect.top - tooltipRect.height - margin) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        break;
      default:
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    // Keep tooltip on screen
    const finalRect = tooltip.getBoundingClientRect();
    if (finalRect.left < 8) { tooltip.style.left = '8px'; tooltip.style.transform = 'translateY(-50%)'; }
    if (finalRect.right > window.innerWidth - 8) { tooltip.style.left = (window.innerWidth - tooltipRect.width - 8) + 'px'; tooltip.style.transform = 'translateY(-50%)'; }
    if (finalRect.top < 8) { tooltip.style.top = '8px'; }
    if (finalRect.bottom > window.innerHeight - 8) { tooltip.style.top = (window.innerHeight - tooltipRect.height - 8) + 'px'; }
  }

  showStep(0);
}

window.initTutorial = initTutorial;