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

function buildAskInstruction(options = {}) {
  const jobDescription = (options.jobDescription || '').trim();

  if (jobDescription) {
    return [
      'Assess whether this candidate is a good match for this Senior Product Manager job description.',
      'Compare candidate strengths and risks directly against the JD requirements and responsibilities.',
      `Job description:\n${jobDescription}`,
      'Then provide the five most revealing interview questions to validate fit.',
    ].filter(Boolean).join(' ');
  }

  return [
    'No job description was provided.',
    'Ask the user to paste the full job description before proceeding with role-fit evaluation.',
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
  return win.open('about:blank', '_blank');
}

function openProviderInNewTab(url, win = typeof window !== 'undefined' ? window : null, preopenedTab = null) {
  if (preopenedTab && preopenedTab.location) {
    preopenedTab.location.href = url;
    return true;
  }
  if (!win || typeof win.open !== 'function') return false;
  const openedTab = win.open(url, '_blank', 'noopener,noreferrer');
  return Boolean(openedTab);
}

function closeTabSafely(tab) {
  if (!tab || typeof tab.close !== 'function') return;
  try {
    tab.close();
  } catch {
    // No-op: browser may block programmatic tab close.
  }
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

  if (!trigger || !modal || !closeButton || providerButtons.length === 0) return;

  let cachedTemplate = '';

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

  providerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = button.getAttribute('data-ai-provider');
      if (!provider) return;
      const jobDescription = jdInput ? jdInput.value.trim() : '';

      trackAiMatchEvent('ai_match_provider_selected', { provider });
      if (!jobDescription) {
        setStatusMessage(statusElement, 'Paste a job description to continue.');
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
        });

        const providerUrl = buildProviderUrl(provider, prompt);
        const opened = openProviderInNewTab(providerUrl, window, preopenedTab || null);
        if (!opened) {
          closeTabSafely(preopenedTab);
          setStatusMessage(statusElement, 'Popup blocked. Prompt copied. Please open your AI tool manually.');
        }
      } catch (error) {
        closeTabSafely(preopenedTab);
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
  shouldUseClipboardFallback,
  copyPromptToClipboard,
  fetchPromptTemplate,
  openBlankTab,
  openProviderInNewTab,
  initAiMatchModal,
};
