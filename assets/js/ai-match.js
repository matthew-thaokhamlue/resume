const PROVIDER_URL_BUILDERS = {
  chatgpt: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  claude: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  gemini: (prompt) => `https://gemini.google.com/app?prompt=${encodeURIComponent(prompt)}`,
  grok: () => 'https://grok.com/',
};

const PROFILE_CONTEXT = {
  FULL_NAME: 'Matthew Thaokhamlue',
  ROLE: 'Senior Product Manager',
  SUMMARY: 'Senior Product Manager with 7+ years shipping AI/ML, health analytics, laboratory informatics, and B2B SaaS products across platform and user-facing experiences.',
  PORTFOLIO: [
    '- Labforward: Led roadmap and discovery for laboratory informatics workflows and data-intensive SaaS products.',
    '- LabTwin: Drove voice-AI product strategy, API/SDK decisions, and cross-functional delivery for lab execution products.',
    '- Thryve: Worked on digital health product initiatives connecting biometric data, user needs, and partner-facing platform capabilities.',
    '- Chat-with-Experiment: Portfolio project focused on conversational experience design for experimental and workflow-heavy domains.',
    '- RAG Meal Planner: Portfolio project demonstrating retrieval-augmented generation for contextual, user-specific planning flows.',
  ].join('\n'),
};

const ROLE_PRESETS = {
  ai_platform_pm: {
    label: 'AI Platform Product Manager',
    focus:
      'platform strategy, developer-facing APIs/SDKs, model lifecycle, and cross-team enablement',
  },
  zero_to_one_ai_pm: {
    label: '0-to-1 AI Product Manager',
    focus:
      'early product discovery, rapid validation, experimentation loops, and adoption execution',
  },
  b2b_saas_ai_pm: {
    label: 'B2B SaaS AI Product Manager',
    focus:
      'enterprise workflow integration, stakeholder alignment, adoption, and measurable business impact',
  },
};

const PROMPT_VERSION = 'match-v1';

function fillPromptTemplate(template, context) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      return String(context[key]);
    }
    return match;
  });
}

function buildProviderUrl(provider, prompt) {
  const buildUrl = PROVIDER_URL_BUILDERS[provider];
  if (!buildUrl) {
    return PROVIDER_URL_BUILDERS.chatgpt(prompt);
  }
  return buildUrl(prompt);
}

function trackAiMatchEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

function getRolePreset(presetId) {
  if (!presetId) return null;
  return ROLE_PRESETS[presetId] || null;
}

function buildAskInstruction(options = {}) {
  const jobDescription = (options.jobDescription || '').trim();
  const fallbackScope = (options.fallbackScope || '').trim();
  const rolePreset = getRolePreset(options.targetRolePreset);
  const rolePresetLine = rolePreset
    ? `Target role profile: ${rolePreset.label}. Evaluation focus: ${rolePreset.focus}.`
    : '';

  if (jobDescription) {
    return [
      'Assess whether this candidate is a good match for this Senior Product Manager job description.',
      rolePresetLine,
      'Compare candidate strengths and risks directly against the JD requirements and responsibilities.',
      `Job description:\n${jobDescription}`,
      'Then provide the five most revealing interview questions to validate fit.',
    ].filter(Boolean).join(' ');
  }

  if (fallbackScope === 'experience') {
    return [
      'No job description was provided.',
      rolePresetLine,
      'Perform an experience-focused evaluation only: assess role progression, leadership scope, execution depth, and measurable outcomes.',
      'Do not run a role-fit verdict against a missing JD.',
      'Then provide five interview questions focused on validating core PM experience.',
    ].filter(Boolean).join(' ');
  }

  if (fallbackScope === 'portfolio') {
    return [
      'No job description was provided.',
      rolePresetLine,
      'Perform a portfolio deep-dive only: evaluate problem framing, product decisions, technical depth, and impact evidence across projects.',
      'Do not run a role-fit verdict against a missing JD.',
      'Then provide five interview questions focused on validating portfolio claims.',
    ].filter(Boolean).join(' ');
  }

  return [
    'No job description was provided.',
    'Ask the user to either paste a JD or choose an analysis mode: experience or portfolio.',
  ].join(' ');
}

function composePromptFromTemplate(template, options = {}) {
  const context = {
    ...PROFILE_CONTEXT,
    ASK: buildAskInstruction(options),
  };
  return fillPromptTemplate(template, context);
}

function shouldUseClipboardFallback(provider) {
  return ['chatgpt', 'claude', 'gemini', 'grok'].includes(provider);
}

async function copyPromptToClipboard(prompt) {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(prompt);
    return true;
  } catch {
    return false;
  }
}

async function fetchPromptTemplate() {
  const response = await fetch(`assets/prompts/${PROMPT_VERSION}.txt`);
  if (!response.ok) {
    throw new Error(`Failed to load prompt template: ${response.status}`);
  }
  return response.text();
}

function setStatusMessage(statusElement, message) {
  if (!statusElement) return;
  statusElement.textContent = message;
}

function openBlankTab(win = typeof window !== 'undefined' ? window : null) {
  if (!win || typeof win.open !== 'function') return false;
  return win.open('about:blank', '_blank', 'noopener,noreferrer');
}

function openProviderInNewTab(url, win = typeof window !== 'undefined' ? window : null, preopenedTab = null) {
  const targetTab = preopenedTab || openBlankTab(win);
  if (!targetTab || !targetTab.location) return false;
  targetTab.location.href = url;
  return true;
}

function initAiMatchModal() {
  if (typeof document === 'undefined') return;

  const trigger = document.getElementById('ai-match-trigger');
  const modal = document.getElementById('ai-match-modal');
  const closeButton = document.getElementById('ai-match-close');
  const jdInput = document.getElementById('ai-match-jd');
  const statusElement = document.getElementById('ai-match-status');
  const overlay = modal ? modal.querySelector('[data-ai-match-overlay]') : null;
  const providerButtons = modal ? modal.querySelectorAll('[data-ai-provider]') : [];
  const fallbackButtons = modal ? modal.querySelectorAll('[data-ai-fallback-scope]') : [];
  const rolePresetButtons = modal ? modal.querySelectorAll('[data-ai-role-preset]') : [];

  if (!trigger || !modal || !closeButton || providerButtons.length === 0) return;

  let cachedTemplate = '';
  let selectedFallbackScope = '';
  let selectedRolePreset = 'ai_platform_pm';

  const setFallbackScope = (scope) => {
    selectedFallbackScope = scope;
    fallbackButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-ai-fallback-scope') === scope;
      btn.classList.toggle('border-primary/40', isActive);
      btn.classList.toggle('bg-primary/15', isActive);
    });
  };

  const setRolePreset = (presetId) => {
    selectedRolePreset = presetId;
    rolePresetButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-ai-role-preset') === presetId;
      btn.classList.toggle('border-primary/40', isActive);
      btn.classList.toggle('bg-primary/15', isActive);
    });
  };

  const closeModal = () => {
    if (typeof modal.close === 'function') {
      modal.close();
    }
  };

  const openModal = () => {
    setStatusMessage(statusElement, '');
    trackAiMatchEvent('ai_match_popup_open');
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    }
  };

  trigger.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('cancel', () => setStatusMessage(statusElement, ''));

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
  }

  rolePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const presetId = button.getAttribute('data-ai-role-preset');
      if (!presetId) return;
      setRolePreset(presetId);
      trackAiMatchEvent('ai_match_role_preset_selected', { role_preset: presetId });
    });
  });

  fallbackButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const scope = button.getAttribute('data-ai-fallback-scope');
      if (!scope) return;
      setFallbackScope(scope);
      setStatusMessage(statusElement, `Quick check selected: ${scope}.`);
      trackAiMatchEvent('ai_match_fallback_scope_selected', { scope });
    });
  });

  setRolePreset(selectedRolePreset);

  providerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = button.getAttribute('data-ai-provider');
      if (!provider) return;
      const jobDescription = jdInput ? jdInput.value.trim() : '';

      trackAiMatchEvent('ai_match_provider_selected', { provider });
      if (!jobDescription && !selectedFallbackScope) {
        setStatusMessage(statusElement, 'Paste a JD or choose Experience/Portfolio quick check.');
        return;
      }

      const preopenedTab = openBlankTab(window);
      if (!preopenedTab) {
        setStatusMessage(statusElement, 'Popup blocked. Stay on this page and open your AI tool manually after copy.');
        trackAiMatchEvent('ai_match_popup_blocked', { provider });
      }

      setStatusMessage(statusElement, 'Preparing your prompt...');

      try {
        if (!cachedTemplate) {
          cachedTemplate = await fetchPromptTemplate();
        }

        const prompt = composePromptFromTemplate(cachedTemplate, {
          jobDescription,
          fallbackScope: selectedFallbackScope,
          targetRolePreset: selectedRolePreset,
        });
        const likelyNoPrefill = provider === 'gemini' || provider === 'grok';

        if (shouldUseClipboardFallback(provider)) {
          const copied = await copyPromptToClipboard(prompt);
          if (copied) {
            trackAiMatchEvent('ai_match_clipboard_fallback_used', { provider });
            if (likelyNoPrefill) {
              setStatusMessage(statusElement, 'Gemini/Grok may not auto-fill. Prompt copied. Redirecting now...');
            } else {
              setStatusMessage(statusElement, 'Prompt copied. Redirecting now...');
            }
          } else {
            if (likelyNoPrefill) {
              setStatusMessage(statusElement, 'Gemini/Grok may not auto-fill. Redirecting; paste manually.');
            } else {
              setStatusMessage(statusElement, 'Redirecting. If no prefill appears, paste manually.');
            }
          }
        }

        trackAiMatchEvent('ai_match_redirect_attempted', {
          provider,
          prompt_version: PROMPT_VERSION,
          prompt_length: prompt.length,
          has_job_description: Boolean(jobDescription),
          fallback_scope: selectedFallbackScope || 'none',
          role_preset: selectedRolePreset || 'none',
        });

        const providerUrl = buildProviderUrl(provider, prompt);
        const opened = openProviderInNewTab(providerUrl, window, preopenedTab || null);
        if (!opened) {
          setStatusMessage(statusElement, 'Popup blocked. Prompt copied. Please open your AI tool manually.');
        }
      } catch (error) {
        setStatusMessage(statusElement, 'Unable to prepare prompt. Please try again.');
        trackAiMatchEvent('ai_match_prompt_error', {
          provider,
          prompt_version: PROMPT_VERSION,
          message: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    });
  });
}

if (typeof window !== 'undefined') {
  window.AiMatch = {
    fillPromptTemplate,
    buildProviderUrl,
    trackAiMatchEvent,
    composePromptFromTemplate,
    buildAskInstruction,
    getRolePreset,
    shouldUseClipboardFallback,
    copyPromptToClipboard,
    fetchPromptTemplate,
    openBlankTab,
    openProviderInNewTab,
    initAiMatchModal,
  };

  window.addEventListener('DOMContentLoaded', initAiMatchModal);
}

export {
  fillPromptTemplate,
  buildProviderUrl,
  trackAiMatchEvent,
  composePromptFromTemplate,
  buildAskInstruction,
  getRolePreset,
  shouldUseClipboardFallback,
  copyPromptToClipboard,
  fetchPromptTemplate,
  openBlankTab,
  openProviderInNewTab,
  initAiMatchModal,
};
