/**
 * Claude Explorer Web UI
 */

let selectedConversations = new Set();
let currentConversations = [];

// Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');
const resultsCount = document.getElementById('results-count');
const detailModal = document.getElementById('detail-modal');
const detailContent = document.getElementById('detail-content');
const loading = document.getElementById('loading');
const filterMessagesOnly = document.getElementById('filter-messages-only');
const sortSelect = document.getElementById('sort-select');
const selectAllBtn = document.getElementById('select-all-btn');
const exportSelectedBtn = document.getElementById('export-selected-btn');
const selectedCountSpan = document.getElementById('selected-count');

// Help system elements
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');

// Settings panel elements
const openSettingsBtn = document.getElementById('open-settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('api-key-input');
const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
const modelSearchInput = document.getElementById('model-search-input');
const modelDropdown = document.getElementById('model-dropdown');
const modelDropdownList = document.getElementById('model-dropdown-list');
const modelSelectHidden = document.getElementById('model-select');
const refreshModelsBtn = document.getElementById('refresh-models-btn');
const modelHint = document.getElementById('model-hint');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const clearSettingsBtn = document.getElementById('clear-settings-btn');
const currentModelBadge = document.getElementById('current-model-badge');
const selectedModelDisplay = document.getElementById('selected-model-display');
const selectedModelName = document.getElementById('selected-model-name');
const selectedModelCtx = document.getElementById('selected-model-ctx');
const selectedModelPricing = document.getElementById('selected-model-pricing');
const keySavedInfo = document.getElementById('key-saved-info');

// Local model cache
let allModels = [];
let filteredModels = [];

// Advanced filter elements
const toggleAdvancedFilters = document.getElementById('toggle-advanced-filters');
const advancedFilters = document.getElementById('advanced-filters');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');
const filterMessagesMin = document.getElementById('filter-messages-min');
const filterMessagesMax = document.getElementById('filter-messages-max');
const applyFiltersBtn = document.getElementById('apply-filters');
const clearFiltersBtn = document.getElementById('clear-filters');

// Upload elements
const uploadBtn = document.getElementById('upload-btn');
const clearUploadBtn = document.getElementById('clear-upload-btn');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const dataInfoPanel = document.getElementById('data-info-panel');
const dataInfoStats = document.getElementById('data-info-stats');
const dataInfoPath = document.getElementById('data-info-path');
const resetDataBtn = document.getElementById('reset-data-btn');

// Initialize
checkUploadStatus();
loadStats();
loadConversations();
loadSettings();
loadDataInfo();

// Event listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});

filterMessagesOnly.addEventListener('change', loadConversations);
sortSelect.addEventListener('change', loadConversations);

selectAllBtn.addEventListener('click', toggleSelectAll);
exportSelectedBtn.addEventListener('click', exportSelected);

// Upload event listeners
if (uploadBtn) {
  uploadBtn.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', handleFileUpload);
}

if (clearUploadBtn) {
  clearUploadBtn.addEventListener('click', handleClearUpload);
}

// Reset data button
if (resetDataBtn) {
  resetDataBtn.addEventListener('click', handleResetData);
}

// Advanced filter event listeners
if (toggleAdvancedFilters) {
  toggleAdvancedFilters.addEventListener('click', () => {
    advancedFilters.classList.toggle('hidden');
  });
}

if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener('click', applyAdvancedFilters);
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', clearAdvancedFilters);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.querySelector('.modal-close').addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeModal();
});

// Help system event listeners
if (helpBtn) {
  helpBtn.addEventListener('click', openHelp);
}

if (helpModal) {
  const helpCloseBtn = helpModal.querySelector('.modal-close');
  if (helpCloseBtn) {
    helpCloseBtn.addEventListener('click', closeHelp);
  }
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelp();
  });
}

// Settings panel event listeners
if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });
}

if (toggleKeyVisibility) {
  toggleKeyVisibility.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyVisibility.textContent = isPassword ? 'Hide' : 'Show';
  });
}

if (refreshModelsBtn) {
  refreshModelsBtn.addEventListener('click', loadModels);
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', saveSettings);
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
}

if (clearSettingsBtn) {
  clearSettingsBtn.addEventListener('click', clearSettings);
}

// Auto-load models when API key is entered
if (apiKeyInput) {
  let debounceTimer;
  apiKeyInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const key = apiKeyInput.value.trim();
    if (key.length > 10 && key.startsWith('sk-or')) {
      refreshModelsBtn.disabled = false;
      modelSearchInput.disabled = false;
      debounceTimer = setTimeout(loadModels, 800);
    } else {
      refreshModelsBtn.disabled = true;
      modelSearchInput.disabled = true;
    }
  });
}

// Searchable model dropdown
if (modelSearchInput) {
  modelSearchInput.addEventListener('focus', () => {
    if (allModels.length > 0) {
      modelDropdown.classList.remove('hidden');
      filterModels(modelSearchInput.value);
    }
  });

  modelSearchInput.addEventListener('input', () => {
    filterModels(modelSearchInput.value);
    modelDropdown.classList.remove('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!modelSearchInput.contains(e.target) && !modelDropdown.contains(e.target)) {
      modelDropdown.classList.add('hidden');
    }
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC to close modals
  if (e.key === 'Escape') {
    if (!helpModal.classList.contains('hidden')) {
      closeHelp();
    } else if (!detailModal.classList.contains('hidden')) {
      closeModal();
    }
  }

  // ? to open help (only when not typing in an input/textarea)
  if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    openHelp();
  }
});

// Terminal interface elements and listeners
const terminalInput = document.getElementById('terminal-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const terminalOutput = document.getElementById('terminal-output');
const authStatus = document.getElementById('auth-status');

if (sendBtn) {
  sendBtn.addEventListener('click', sendMessage);
}

if (clearChatBtn) {
  clearChatBtn.addEventListener('click', clearChat);
}

if (terminalInput) {
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

/**
 * Load statistics
 */
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    document.getElementById('stat-conversations').textContent =
      stats.conversationsWithMessages;
    document.getElementById('stat-messages').textContent = stats.messages.total;
    document.getElementById('stat-projects').textContent = stats.totalProjects;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Load conversations
 */
async function loadConversations() {
  showLoading();
  try {
    const messagesOnly = filterMessagesOnly.checked;
    const sort = sortSelect.value;

    const response = await fetch(
      `/api/conversations?messagesOnly=${messagesOnly}&sort=${sort}&limit=100`
    );
    const data = await response.json();

    // Apply advanced filters client-side
    let filtered = data.conversations;
    filtered = applyAdvancedFiltersToResults(filtered);

    currentConversations = filtered;
    displayResults(filtered);
    resultsCount.textContent = `${filtered.length} of ${data.total} conversations`;
  } catch (error) {
    console.error('Failed to load conversations:', error);
    resultsDiv.innerHTML = '<p>Failed to load conversations</p>';
  } finally {
    hideLoading();
  }
}

/**
 * Apply advanced filters to conversation results
 */
function applyAdvancedFiltersToResults(conversations) {
  let filtered = [...conversations];

  // Filter by date range
  if (filterDateFrom && filterDateFrom.value) {
    const fromDate = new Date(filterDateFrom.value);
    filtered = filtered.filter(conv => new Date(conv.created_at) >= fromDate);
  }

  if (filterDateTo && filterDateTo.value) {
    const toDate = new Date(filterDateTo.value);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(conv => new Date(conv.created_at) <= toDate);
  }

  // Filter by message count range
  if (filterMessagesMin && filterMessagesMin.value) {
    const minMessages = parseInt(filterMessagesMin.value);
    filtered = filtered.filter(conv => (conv.chat_messages?.length || 0) >= minMessages);
  }

  if (filterMessagesMax && filterMessagesMax.value) {
    const maxMessages = parseInt(filterMessagesMax.value);
    filtered = filtered.filter(conv => (conv.chat_messages?.length || 0) <= maxMessages);
  }

  return filtered;
}

/**
 * Apply advanced filters button handler
 */
function applyAdvancedFilters() {
  loadConversations();
}

/**
 * Clear advanced filters
 */
function clearAdvancedFilters() {
  if (filterDateFrom) filterDateFrom.value = '';
  if (filterDateTo) filterDateTo.value = '';
  if (filterMessagesMin) filterMessagesMin.value = '';
  if (filterMessagesMax) filterMessagesMax.value = '';
  loadConversations();
}

/**
 * Handle search
 */
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    loadConversations();
    return;
  }

  showLoading();
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    currentConversations = results.map((r) => r.conversation);

    // Apply current sorting
    const sortBy = sortSelect.value;
    currentConversations = sortConversations(currentConversations, sortBy);

    displayResults(results, true);
    resultsCount.textContent = `${results.length} search results`;
  } catch (error) {
    console.error('Search failed:', error);
    resultsDiv.innerHTML = '<p>Search failed</p>';
  } finally {
    hideLoading();
  }
}

/**
 * Display results
 */
function displayResults(results, isSearch = false) {
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p>No results found</p>';
    return;
  }

  resultsDiv.innerHTML = results
    .map((item, idx) => {
      const conv = isSearch ? item.conversation : item;
      const isSelected = selectedConversations.has(conv.uuid);

      let html = `
        <div class="result-card ${isSelected ? 'selected' : ''}" data-uuid="${conv.uuid}">
          <div class="checkbox-wrapper">
            <input type="checkbox"
              class="conv-checkbox"
              data-uuid="${conv.uuid}"
              ${isSelected ? 'checked' : ''}>
            <div style="flex: 1">
              <div class="result-header">
                <div>
                  <div class="result-title" onclick="showDetail('${conv.uuid}')">
                    ${conv.name || 'Untitled Conversation'}
                  </div>
                  <div class="result-meta">
                    <span>📅 ${new Date(conv.created_at).toLocaleDateString()}</span>
                    <span>💬 ${conv.chat_messages?.length || 0} messages</span>
                  </div>
                </div>
                <div class="result-actions">
                  <button class="btn btn-sm" onclick="exportConversation('${conv.uuid}', 'markdown')">
                    📄 MD
                  </button>
                  <button class="btn btn-sm" onclick="exportConversation('${conv.uuid}', 'json')">
                    📋 JSON
                  </button>
                  <button class="btn btn-sm" onclick="exportConversation('${conv.uuid}', 'bundle')">
                    📦 ZIP
                  </button>
                </div>
              </div>
      `;

      if (isSearch && item.matches && item.matches.length > 0) {
        html += `
          <div class="result-snippet">
            <strong>Matches:</strong><br>
            ${item.matches
              .slice(0, 2)
              .map(
                (m) =>
                  `<div style="margin-top: 5px;">Message ${m.messageIndex + 1}: ${m.snippet}</div>`
              )
              .join('')}
          </div>
        `;
      }

      html += `
            </div>
          </div>
        </div>
      `;

      return html;
    })
    .join('');

  // Add checkbox listeners
  document.querySelectorAll('.conv-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const uuid = e.target.dataset.uuid;
      if (e.target.checked) {
        selectedConversations.add(uuid);
      } else {
        selectedConversations.delete(uuid);
      }
      updateSelectionUI();
    });
  });
}

/**
 * Show conversation detail
 */
async function showDetail(uuid) {
  showLoading();
  try {
    const response = await fetch(`/api/conversations/${uuid}`);
    const conv = await response.json();

    detailContent.innerHTML = `
      <h2>${conv.name || 'Untitled Conversation'}</h2>

      <div class="modal-export-actions">
        <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'markdown')">
          📄 Export Markdown
        </button>
        <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'json')">
          📋 Export JSON
        </button>
        <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'bundle')">
          📦 Export ZIP
        </button>
      </div>

      <div style="margin: 20px 0; color: #666;">
        <p><strong>Created:</strong> ${new Date(conv.created_at).toLocaleString()}</p>
        <p><strong>Updated:</strong> ${new Date(conv.updated_at).toLocaleString()}</p>
        <p><strong>Messages:</strong> ${conv.chat_messages?.length || 0}</p>
        <p style="font-size: 0.85em; color: #999;"><strong>UUID:</strong> ${conv.uuid}</p>
      </div>
      ${
        conv.summary
          ? `<div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px;">
          <strong>Summary:</strong> ${conv.summary}
        </div>`
          : ''
      }
      <h3>Messages (${conv.chat_messages?.length || 0}):</h3>
      <div style="margin-top: 20px;">
        ${
          conv.chat_messages
            ?.map(
              (msg, idx) => `
          <div class="message-preview ${msg.sender === 'human' ? 'message-human' : 'message-assistant'}">
            <div class="message-header">
              <div class="message-sender">
                ${msg.sender === 'human' ? '👤' : '🤖'} ${msg.sender.toUpperCase()}
                <span class="message-meta">
                  #${idx + 1} • ${new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
              <button class="btn-copy" onclick="copyToClipboard(\`${msg.text?.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, this)">
                📋 Copy
              </button>
            </div>
            <div class="message-text">${renderMarkdown(msg.text)}</div>
          </div>
        `
            )
            .join('') || '<p>No messages</p>'
        }
      </div>
    `;

    detailModal.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to load detail:', error);
    alert('Failed to load conversation details');
  } finally {
    hideLoading();
  }
}

/**
 * Export conversation
 */
async function exportConversation(uuid, format) {
  try {
    const response = await fetch(`/api/export/conversation/${uuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers
      .get('Content-Disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') || `export.${format === 'bundle' ? 'zip' : format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed');
  }
}

/**
 * Toggle select all
 */
function toggleSelectAll() {
  if (selectedConversations.size === currentConversations.length) {
    // Deselect all
    selectedConversations.clear();
  } else {
    // Select all
    currentConversations.forEach((conv) => {
      selectedConversations.add(conv.uuid);
    });
  }
  updateSelectionUI();
  loadConversations(); // Refresh to show checkboxes
}

/**
 * Export selected
 */
async function exportSelected() {
  if (selectedConversations.size === 0) return;

  try {
    const response = await fetch('/api/export/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuids: Array.from(selectedConversations),
        format: 'bundle',
      }),
    });

    if (!response.ok) throw new Error('Batch export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversations-export.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error('Batch export failed:', error);
    alert('Batch export failed');
  }
}

/**
 * Update selection UI
 */
function updateSelectionUI() {
  selectedCountSpan.textContent = selectedConversations.size;
  exportSelectedBtn.disabled = selectedConversations.size === 0;

  if (selectedConversations.size === currentConversations.length) {
    selectAllBtn.textContent = 'Deselect All';
  } else {
    selectAllBtn.textContent = 'Select All';
  }
}

/**
 * Load projects
 */
async function loadProjects() {
  const projectsList = document.getElementById('projects-list');
  showLoading();
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();

    projectsList.innerHTML = data.projects
      .map(
        (proj) => `
      <div class="result-card">
        <div class="result-title">${proj.name}</div>
        <div class="result-meta">
          <span>📚 ${proj.docs?.length || 0} docs</span>
          <span>${proj.is_private ? '🔒 Private' : '🌐 Public'}</span>
        </div>
        <p style="margin: 10px 0; color: #666;">
          ${proj.description.substring(0, 200)}${proj.description.length > 200 ? '...' : ''}
        </p>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Failed to load projects:', error);
    projectsList.innerHTML = '<p>Failed to load projects</p>';
  } finally {
    hideLoading();
  }
}

/**
 * Load analytics dashboard
 */
async function loadAnalytics() {
  showLoading();
  try {
    // Fetch all conversations for analytics
    const response = await fetch('/api/conversations?messagesOnly=true&limit=1000');
    const data = await response.json();
    const conversations = data.conversations;

    // Generate activity timeline
    generateActivityTimeline(conversations);

    // Generate message distribution
    generateMessageDistribution(conversations);

    // Generate top keywords
    generateTopKeywords(conversations);

    // Generate conversation trends
    generateConversationTrends(conversations);

  } catch (error) {
    console.error('Failed to load analytics:', error);
  } finally {
    hideLoading();
  }
}

/**
 * Generate activity timeline chart
 */
function generateActivityTimeline(conversations) {
  const timeline = {};
  const now = new Date();
  const monthsAgo6 = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Group by month
  conversations.forEach(conv => {
    const date = new Date(conv.created_at);
    if (date >= monthsAgo6) {
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      timeline[monthKey] = (timeline[monthKey] || 0) + 1;
    }
  });

  // Find max for scaling
  const max = Math.max(...Object.values(timeline), 1);

  const container = document.getElementById('activity-timeline');
  container.innerHTML = Object.entries(timeline)
    .map(([month, count]) => {
      const width = (count / max) * 100;
      return `
        <div class="chart-bar">
          <span class="chart-label">${month}</span>
          <div class="chart-bar-fill" style="width: ${width}%">
            <span class="chart-bar-value">${count}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Generate message distribution stats
 */
function generateMessageDistribution(conversations) {
  const totalMessages = conversations.reduce((sum, conv) => sum + (conv.chat_messages?.length || 0), 0);
  const avgMessages = Math.round(totalMessages / conversations.length);

  const distribution = {
    small: conversations.filter(c => (c.chat_messages?.length || 0) < 10).length,
    medium: conversations.filter(c => {
      const len = c.chat_messages?.length || 0;
      return len >= 10 && len < 50;
    }).length,
    large: conversations.filter(c => (c.chat_messages?.length || 0) >= 50).length,
  };

  const container = document.getElementById('message-distribution');
  container.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Average messages per conversation</span>
      <span class="stat-value-large">${avgMessages}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Short conversations (< 10 messages)</span>
      <span class="stat-value-large">${distribution.small}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Medium conversations (10-50 messages)</span>
      <span class="stat-value-large">${distribution.medium}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Long conversations (50+ messages)</span>
      <span class="stat-value-large">${distribution.large}</span>
    </div>
  `;
}

/**
 * Generate top keywords from conversation names
 */
function generateTopKeywords(conversations) {
  const keywords = {};

  conversations.forEach(conv => {
    if (conv.name) {
      // Extract words from conversation name
      const words = conv.name.toLowerCase()
        .split(/[\s,\.\-\(\)]+/)
        .filter(w => w.length > 3 && !['with', 'from', 'about', 'that', 'this', 'have', 'will'].includes(w));

      words.forEach(word => {
        keywords[word] = (keywords[word] || 0) + 1;
      });
    }
  });

  // Get top 15 keywords
  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const container = document.getElementById('top-keywords');
  container.innerHTML = topKeywords
    .map(([word, count]) => `
      <div class="keyword-tag" onclick="searchKeyword('${word}')">
        ${word}
        <span class="keyword-count">${count}</span>
      </div>
    `)
    .join('');
}

/**
 * Search for a keyword from analytics
 */
function searchKeyword(keyword) {
  // Switch to conversations tab
  switchTab('conversations');

  // Set search input
  if (searchInput) {
    searchInput.value = keyword;
  }

  // Trigger search
  setTimeout(() => {
    handleSearch();
  }, 100);
}

/**
 * Generate conversation trends
 */
function generateConversationTrends(conversations) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const lastWeek = conversations.filter(c => new Date(c.created_at) >= weekAgo).length;
  const lastMonth = conversations.filter(c => new Date(c.created_at) >= monthAgo).length;
  const mostActiveDay = getMostActiveDay(conversations);

  const container = document.getElementById('conversation-trends');
  container.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Conversations in last 7 days</span>
      <span class="stat-value-large">${lastWeek}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Conversations in last 30 days</span>
      <span class="stat-value-large">${lastMonth}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Most active day of week</span>
      <span class="stat-value-large">${mostActiveDay}</span>
    </div>
  `;
}

/**
 * Find most active day of the week
 */
function getMostActiveDay(conversations) {
  const days = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  const dayCounts = {};

  conversations.forEach(conv => {
    const day = new Date(conv.created_at).getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const mostActive = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  return mostActive ? days[mostActive[0]] : 'N/A';
}

/**
 * Close modal
 */
function closeModal() {
  detailModal.classList.add('hidden');
}

/**
 * Show/hide loading
 */
function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

/**
 * Sort conversations locally
 */
function sortConversations(conversations, sortBy) {
  const sorted = [...conversations];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
      case 'messages':
        comparison =
          (b.chat_messages?.length || 0) - (a.chat_messages?.length || 0);
        break;
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
    }

    return comparison;
  });

  return sorted;
}

/**
 * Apply advanced filters
 */
function applyAdvancedFilters() {
  // Get current conversations and apply filters
  let filtered = [...currentConversations];

  // Date range filter
  const dateFrom = filterDateFrom?.value;
  const dateTo = filterDateTo?.value;

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filtered = filtered.filter(conv => new Date(conv.created_at) >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(conv => new Date(conv.created_at) <= toDate);
  }

  // Message count filter
  const minMessages = filterMessagesMin?.value ? parseInt(filterMessagesMin.value) : null;
  const maxMessages = filterMessagesMax?.value ? parseInt(filterMessagesMax.value) : null;

  if (minMessages !== null) {
    filtered = filtered.filter(conv => (conv.chat_messages?.length || 0) >= minMessages);
  }

  if (maxMessages !== null) {
    filtered = filtered.filter(conv => (conv.chat_messages?.length || 0) <= maxMessages);
  }

  // Update display
  displayResults(filtered, false);
  resultsCount.textContent = `${filtered.length} of ${currentConversations.length} conversations (filtered)`;
}

/**
 * Clear advanced filters
 */
function clearAdvancedFilters() {
  if (filterDateFrom) filterDateFrom.value = '';
  if (filterDateTo) filterDateTo.value = '';
  if (filterMessagesMin) filterMessagesMin.value = '';
  if (filterMessagesMax) filterMessagesMax.value = '';

  // Reload conversations without filters
  loadConversations();
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.style.background = '#28a745';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Failed to copy to clipboard');
  }
}

/**
 * Render markdown text with artifact support
 */
function renderMarkdown(text) {
  if (!text) return '(No text)';

  // First, extract and render artifacts
  const { content, artifacts } = extractArtifacts(text);

  // Escape HTML but preserve code blocks and formatting
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Convert bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Convert line breaks
  html = html.replace(/\n/g, '<br>');

  // Append rendered artifacts
  if (artifacts.length > 0) {
    html += '<div class="artifacts-container">' + artifacts.map(renderArtifact).join('') + '</div>';
  }

  return html;
}

/**
 * Extract artifacts from text
 */
function extractArtifacts(text) {
  const artifacts = [];
  let content = text;

  // Pattern 1: Detect <antArtifact> tags (Claude's artifact format)
  const artifactPattern = /<antArtifact[^>]*identifier="([^"]*)"[^>]*type="([^"]*)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/antArtifact>/gi;

  content = content.replace(artifactPattern, (match, identifier, type, title, code) => {
    artifacts.push({
      identifier,
      type,
      title,
      code: code.trim()
    });
    return `[Artifact: ${title}]`;
  });

  // Pattern 2: Detect artifact blocks in exported format (might be different)
  const exportArtifactPattern = /\[ARTIFACT:\s*([^\]]+)\]\s*```(\w+)\n([\s\S]*?)```/gi;

  content = content.replace(exportArtifactPattern, (match, title, type, code) => {
    artifacts.push({
      identifier: 'artifact-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type: type.toLowerCase(),
      title: title.trim(),
      code: code.trim()
    });
    return `[Artifact: ${title}]`;
  });

  return { content, artifacts };
}

/**
 * Render an artifact
 */
function renderArtifact(artifact) {
  const artifactId = 'artifact-' + artifact.identifier.replace(/[^a-z0-9]/gi, '-');

  let renderedContent = '';

  switch (artifact.type.toLowerCase()) {
    case 'text/html':
    case 'html':
      // Render HTML in sandboxed iframe
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>📄 ${artifact.title}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <iframe
              sandbox="allow-scripts allow-same-origin"
              style="width: 100%; min-height: 400px; border: 1px solid #ddd; border-radius: 4px;"
              srcdoc="${artifact.code.replace(/"/g, '&quot;')}">
            </iframe>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${artifact.code}</textarea>
        </div>
      `;
      break;

    case 'image/svg+xml':
    case 'svg':
      // Render SVG directly
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>🎨 ${artifact.title}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <div style="padding: 20px; background: white; border: 1px solid #ddd; border-radius: 4px;">
              ${artifact.code}
            </div>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${artifact.code}</textarea>
        </div>
      `;
      break;

    case 'application/vnd.ant.mermaid':
    case 'mermaid':
      // Render Mermaid diagram placeholder (would need mermaid.js library)
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>📊 ${artifact.title}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code>${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            <p style="margin-top: 10px; color: #666;">
              <em>Note: Mermaid diagram rendering requires the Mermaid library. Code shown above.</em>
            </p>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${artifact.code}</textarea>
        </div>
      `;
      break;

    case 'application/vnd.ant.react':
    case 'react':
    case 'jsx':
      // Show React code (can't execute JSX directly without transpiler)
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>⚛️ ${artifact.title}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code class="language-jsx">${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            <p style="margin-top: 10px; color: #666;">
              <em>React component code. To use: copy and integrate into your React project.</em>
            </p>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${artifact.code}</textarea>
        </div>
      `;
      break;

    default:
      // Generic code display
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>📝 ${artifact.title}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code>${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${artifact.code}</textarea>
        </div>
      `;
  }

  return renderedContent;
}

/**
 * Toggle artifact visibility
 */
function toggleArtifact(artifactId) {
  const element = document.getElementById(artifactId);
  if (element) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Copy artifact code to clipboard
 */
async function copyArtifactCode(artifactId) {
  const codeElement = document.getElementById(artifactId + '-code');
  if (codeElement) {
    try {
      await navigator.clipboard.writeText(codeElement.value);
      alert('Artifact code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  }
}

/**
 * Enhance AI response with download buttons and quick actions
 */
function enhanceAIResponse(html) {
  // Detect bundle/zip file mentions: MSP-Managed-IT-Onboarding-Bundle-2025.zip
  const bundlePattern = /([A-Za-z0-9_-]+\.zip)/g;

  // Add download buttons next to each bundle mention
  let enhanced = html.replace(bundlePattern, (match, filename) => {
    const bundleName = filename.replace('.zip', '');
    return `<code class="inline-code">${match}</code> <button class="btn-download btn-sm" onclick="downloadFromResponse('${bundleName}')">📥 Download</button>`;
  });

  // Detect conversation UUIDs and add quick actions
  const uuidPattern = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
  enhanced = enhanced.replace(uuidPattern, (match) => {
    return `<code class="inline-code">${match}</code> <button class="btn-action btn-sm" onclick="quickViewConversation('${match}')">👁️ View</button>`;
  });

  // Detect phrases like "14 conversations" and add search/export buttons
  const conversationCountPattern = /(\d+)\s+(conversations?)/gi;
  enhanced = enhanced.replace(conversationCountPattern, (match, count, word) => {
    return `${match} <button class="btn-action btn-sm" onclick="quickExportFromContext()">📦 Export These</button>`;
  });

  return enhanced;
}

/**
 * Download bundle mentioned in AI response
 */
async function downloadFromResponse(bundleName) {
  try {
    // The bundle name might be in format: MSP-Managed-IT-Onboarding-Bundle-2025
    // We need to find matching conversations based on the context

    // For now, trigger a search for the bundle topic
    const searchTerm = bundleName.replace(/-Bundle-\d+$/, '').replace(/-/g, ' ');

    // Show a message that we're searching
    addTerminalMessage('system', 'ℹ️', `Searching for conversations related to: <strong>${searchTerm}</strong>`);

    // Perform search
    const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
    const results = await response.json();

    if (results.length === 0) {
      addTerminalMessage('error', '⚠️', 'No conversations found for this bundle.');
      return;
    }

    // Extract UUIDs
    const uuids = results.slice(0, 20).map(r => r.conversation.uuid);

    // Export as bundle
    const exportResponse = await fetch('/api/export/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuids: uuids,
        format: 'bundle',
      }),
    });

    if (!exportResponse.ok) throw new Error('Export failed');

    const blob = await exportResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundleName}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    addTerminalMessage('system', '✓', `Downloaded <strong>${bundleName}.zip</strong> (${uuids.length} conversations)`);
  } catch (error) {
    console.error('Download from response failed:', error);
    addTerminalMessage('error', '❌', `Failed to download bundle: ${error.message}`);
  }
}

/**
 * Quick view conversation from AI response
 */
async function quickViewConversation(uuid) {
  try {
    // Switch to conversations tab
    switchTab('conversations');

    // Show the conversation detail modal
    await showDetail(uuid);
  } catch (error) {
    console.error('Quick view failed:', error);
    addTerminalMessage('error', '❌', `Failed to view conversation: ${error.message}`);
  }
}

/**
 * Quick export conversations from AI context
 */
async function quickExportFromContext() {
  try {
    // Get the last AI message to extract context
    const lastAIMessage = Array.from(document.querySelectorAll('.assistant-message'))
      .pop();

    if (!lastAIMessage) {
      addTerminalMessage('error', '⚠️', 'No AI response found to extract conversations from.');
      return;
    }

    // Extract all UUIDs from the message
    const messageText = lastAIMessage.textContent;
    const uuidPattern = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
    const uuids = [...messageText.matchAll(uuidPattern)].map(match => match[1]);

    if (uuids.length === 0) {
      addTerminalMessage('error', '⚠️', 'No conversation UUIDs found in the AI response.');
      return;
    }

    addTerminalMessage('system', 'ℹ️', `Exporting ${uuids.length} conversations...`);

    // Export as bundle
    const response = await fetch('/api/export/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuids: uuids,
        format: 'bundle',
      }),
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-suggested-conversations-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    addTerminalMessage('system', '✓', `Downloaded <strong>${uuids.length} conversations</strong> as ZIP bundle`);
  } catch (error) {
    console.error('Quick export failed:', error);
    addTerminalMessage('error', '❌', `Failed to export conversations: ${error.message}`);
  }
}

/**
 * AI Terminal Functions
 */

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/assistant/status');
    const data = await response.json();

    if (authStatus) {
      if (data.authenticated) {
        authStatus.textContent = `Connected (${data.provider})`;
        authStatus.className = 'status-badge authenticated';
        if (currentModelBadge && data.model) {
          currentModelBadge.textContent = data.model;
        }
      } else {
        authStatus.textContent = 'Not connected';
        authStatus.className = 'status-badge error';
      }
    }
    return data.authenticated;
  } catch (error) {
    console.error('Auth check failed:', error);
    if (authStatus) {
      authStatus.textContent = 'Error';
      authStatus.className = 'status-badge error';
    }
    return false;
  }
}

// Add message to terminal
function addTerminalMessage(type, icon, content) {
  if (!terminalOutput) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `terminal-message ${type}-message`;

  messageDiv.innerHTML = `
    <div class="message-icon">${icon}</div>
    <div class="message-content">${content}</div>
  `;

  terminalOutput.appendChild(messageDiv);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Helper function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send message with retry logic
async function sendMessageWithRetry(message, retries = 3, typingId = null) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if response contains an error
      if (data.error) {
        throw new Error(data.error + (data.details ? `\n\n${data.details}` : ''));
      }

      return data;
    } catch (error) {
      // If this was the last attempt, throw the error
      if (attempt === retries - 1) {
        throw error;
      }

      // Calculate backoff delay: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;

      // Show retry message
      if (typingId) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
          typingElement.closest('.terminal-message').remove();
        }
      }

      const retryId = 'retry-' + Date.now();
      addTerminalMessage(
        'system',
        'ℹ️',
        `<div id="${retryId}">Request failed. Retrying in ${delay / 1000} seconds... (Attempt ${attempt + 1}/${retries})</div>`
      );

      // Wait with exponential backoff
      await sleep(delay);

      // Remove retry message
      const retryElement = document.getElementById(retryId);
      if (retryElement) {
        retryElement.closest('.terminal-message').remove();
      }

      // Show typing indicator again
      if (typingId) {
        addTerminalMessage(
          'assistant',
          '🤖',
          `<div class="typing-indicator" id="${typingId}">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>`
        );
      }
    }
  }
}

// Send message to AI assistant
async function sendMessage() {
  if (!terminalInput) return;

  const message = terminalInput.value.trim();
  if (!message) return;

  // Add user message
  addTerminalMessage('user', '👤', renderMarkdown(message));

  // Clear input
  terminalInput.value = '';

  // Show typing indicator
  const typingId = 'typing-' + Date.now();
  addTerminalMessage(
    'assistant',
    '🤖',
    `<div class="typing-indicator" id="${typingId}">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`
  );

  try {
    const data = await sendMessageWithRetry(message, 3, typingId);

    // Remove typing indicator
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
      typingElement.closest('.terminal-message').remove();
    }

    // Add assistant response with enhanced download buttons
    addTerminalMessage('assistant', '🤖', enhanceAIResponse(renderMarkdown(data.response)));
  } catch (error) {
    // Remove typing indicator
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
      typingElement.closest('.terminal-message').remove();
    }

    console.error('Chat failed after retries:', error);
    const errorMessage = error.message || 'Failed to send message';
    const errorHtml = `
      <strong>Error:</strong><br>
      <pre style="white-space: pre-wrap; font-size: 0.85em; margin: 10px 0;">${errorMessage}</pre>
      <button class="btn-sm btn-primary" onclick="retryLastMessage('${message.replace(/'/g, "\\'")}')">Retry</button>
    `;
    addTerminalMessage('error', '❌', errorHtml);
  }
}

// Retry the last message
function retryLastMessage(message) {
  if (terminalInput) {
    terminalInput.value = message;
    sendMessage();
  }
}

// Clear chat
async function clearChat() {
  if (!terminalOutput) return;

  // Clear server-side history
  try {
    await fetch('/api/assistant/clear', { method: 'POST' });
  } catch {}

  // Keep only the welcome message
  const welcomeMessage = terminalOutput.querySelector('.system-message');
  terminalOutput.innerHTML = '';
  if (welcomeMessage) {
    terminalOutput.appendChild(welcomeMessage);
  }
}

// Check auth when assistant tab is opened
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
  });

  if (tabName === 'projects') {
    loadProjects();
  } else if (tabName === 'analytics') {
    loadAnalytics();
  } else if (tabName === 'assistant') {
    checkAuthStatus();
  }
}

/**
 * Help System Functions
 */

// Open help modal
function openHelp() {
  if (helpModal) {
    helpModal.classList.remove('hidden');
    // Focus the modal for accessibility
    helpModal.focus();
    // Trap focus within modal
    trapFocus(helpModal);
  }
}

// Close help modal
function closeHelp() {
  if (helpModal) {
    helpModal.classList.add('hidden');
    // Return focus to help button
    if (helpBtn) {
      helpBtn.focus();
    }
  }
}

// Trap focus within modal for accessibility
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  });
}

/**
 * Upload Functions
 */

// Check upload status on page load
async function checkUploadStatus() {
  try {
    const response = await fetch('/api/upload/status');
    const data = await response.json();

    if (data.hasUploadedData) {
      showUploadStatus('success', `Using uploaded data (${data.dataSource})`);
    }
  } catch (error) {
    console.error('Failed to check upload status:', error);
  }
}

// Handle file upload
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.zip')) {
    showUploadStatus('error', 'Please select a .zip file');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    // Show progress
    uploadProgress.classList.remove('hidden');
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading and processing...';

    // Simulate progress (since we can't track real progress easily)
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress <= 90) {
        progressFill.style.width = `${progress}%`;
      }
    }, 100);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);
    progressFill.style.width = '100%';

    const data = await response.json();

    if (response.ok) {
      showUploadStatus('success',
        `Successfully loaded ${data.stats.conversations} conversations, ${data.stats.messages} messages`
      );

      // Reload data
      await loadStats();
      await loadConversations();
      await loadDataInfo();

      // Hide progress after a delay
      setTimeout(() => {
        uploadProgress.classList.add('hidden');
      }, 2000);
    } else {
      showUploadStatus('error', data.message || data.error || 'Upload failed');
      uploadProgress.classList.add('hidden');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showUploadStatus('error', `Upload failed: ${error.message}`);
    uploadProgress.classList.add('hidden');
  }

  // Reset file input
  fileInput.value = '';
}

// Handle clear upload
async function handleClearUpload() {
  if (!confirm('Are you sure you want to clear the uploaded data and revert to the default data source?')) {
    return;
  }

  try {
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';

    const response = await fetch('/api/upload/clear', {
      method: 'POST',
    });

    const data = await response.json();

    if (response.ok) {
      showUploadStatus('info', data.message);
      dataInfoPanel.classList.add('hidden');

      // Reload data
      await loadStats();
      await loadConversations();
    } else {
      showUploadStatus('error', data.error || 'Failed to clear uploaded data');
    }
  } catch (error) {
    console.error('Clear upload error:', error);
    showUploadStatus('error', `Failed to clear: ${error.message}`);
  }
}

// Show upload status message
function showUploadStatus(type, message) {
  uploadStatus.textContent = message;
  uploadStatus.className = `upload-status ${type}`;
}

/**
 * Settings Panel Functions
 */

// Load settings on page load
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();

    if (data.hasApiKey) {
      apiKeyInput.value = data.apiKey;
      modelSearchInput.disabled = false;
      refreshModelsBtn.disabled = false;

      // Show saved info
      if (data.savedAt) {
        const savedDate = new Date(data.savedAt);
        if (data.expiresAt) {
          const expDate = new Date(data.expiresAt);
          const daysLeft = Math.max(0, Math.ceil((expDate - Date.now()) / (1000 * 60 * 60 * 24)));
          if (daysLeft <= 0) {
            keySavedInfo.textContent = 'Key expired — please re-enter';
            keySavedInfo.style.color = 'var(--danger)';
            apiKeyInput.value = '';
          } else {
            keySavedInfo.textContent = `Saved · expires in ${daysLeft} days`;
            keySavedInfo.style.color = 'var(--success)';
          }
        } else {
          keySavedInfo.textContent = `Saved ${savedDate.toLocaleDateString()} · no expiry`;
          keySavedInfo.style.color = 'var(--success)';
        }
      }

      // Restore model selection
      if (data.model) {
        modelSelectHidden.value = data.model;
        showSelectedModel(data.model);
      }

      // Load models
      loadModels();
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Fetch models from OpenRouter
async function loadModels() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    modelHint.textContent = 'Enter API key first';
    return;
  }

  modelHint.textContent = 'Loading models...';
  refreshModelsBtn.disabled = true;

  try {
    const response = await fetch(`/api/models?apiKey=${encodeURIComponent(key)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch models');
    }

    allModels = data.models || [];
    filteredModels = [...allModels];

    modelHint.textContent = `${allModels.length} models loaded`;
    refreshModelsBtn.disabled = false;

    // Render the dropdown
    filterModels(modelSearchInput.value || '');
  } catch (error) {
    console.error('Failed to load models:', error);
    modelHint.textContent = `Error: ${error.message}`;
    refreshModelsBtn.disabled = false;
  }
}

// Filter and render models in dropdown
function filterModels(query) {
  const q = query.toLowerCase().trim();

  if (q) {
    filteredModels = allModels.filter(m =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  } else {
    filteredModels = [...allModels];
  }

  // Group by provider
  const groups = {};
  filteredModels.forEach(m => {
    const provider = m.id.split('/')[0] || 'Other';
    if (!groups[provider]) groups[provider] = [];
    groups[provider].push(m);
  });

  // Render
  const sortedProviders = Object.keys(groups).sort();
  const selectedId = modelSelectHidden.value;

  let html = '';

  if (filteredModels.length === 0) {
    html = '<div class="model-dropdown-no-results">No models match your search</div>';
  } else {
    sortedProviders.forEach(provider => {
      html += `<div class="model-dropdown-group">`;
      html += `<div class="model-dropdown-group-label">${provider}</div>`;

      groups[provider]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(m => {
          const isSelected = m.id === selectedId;
          const ctx = m.context_length ? `${Math.round(m.context_length / 1000)}k` : '';
          const promptCost = parseFloat(m.pricing?.prompt || '0') * 1000000;
          const completionCost = parseFloat(m.pricing?.completion || '0') * 1000000;
          const isFree = promptCost === 0 && completionCost === 0;
          const priceLabel = isFree ? 'FREE' : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per 1M`;
          const priceClass = isFree ? '' : 'paid';

          html += `
            <div class="model-dropdown-item ${isSelected ? 'selected' : ''}"
                 data-model-id="${m.id}"
                 data-model-name="${m.name}"
                 data-model-ctx="${ctx}"
                 data-model-pricing="${priceLabel}"
                 onclick="selectModel(this)">
              <span class="model-dropdown-item-name">${m.name}</span>
              <div class="model-dropdown-item-meta">
                ${ctx ? `<span class="model-dropdown-item-ctx">${ctx}</span>` : ''}
                <span class="model-dropdown-item-pricing ${priceClass}">${isFree ? 'FREE' : 'PAID'}</span>
              </div>
            </div>
          `;
        });

      html += `</div>`;
    });
  }

  modelDropdownList.innerHTML = html;
  modelDropdown.classList.remove('hidden');
}

// Select a model from dropdown
function selectModel(element) {
  const modelId = element.dataset.modelId;
  const modelName = element.dataset.modelName;
  const modelCtx = element.dataset.modelCtx;
  const modelPricing = element.dataset.modelPricing;

  modelSelectHidden.value = modelId;
  modelSearchInput.value = modelName;
  modelDropdown.classList.add('hidden');

  // Update selected display
  showSelectedModel(modelId, modelName, modelCtx, modelPricing);
}

// Show selected model info
function showSelectedModel(modelId, name, ctx, pricing) {
  if (!selectedModelDisplay) return;

  // If we only have the ID, try to find the model
  if (!name) {
    const m = allModels.find(m => m.id === modelId);
    if (m) {
      name = m.name;
      ctx = m.context_length ? `${Math.round(m.context_length / 1000)}k` : '';
      const promptCost = parseFloat(m.pricing?.prompt || '0') * 1000000;
      const completionCost = parseFloat(m.pricing?.completion || '0') * 1000000;
      pricing = (promptCost === 0 && completionCost === 0) ? 'FREE' : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per 1M`;
    }
  }

  selectedModelDisplay.classList.remove('hidden');
  selectedModelName.textContent = name || modelId;
  selectedModelCtx.textContent = ctx || '';
  selectedModelPricing.textContent = pricing || '';
  modelSearchInput.value = name || modelId;

  if (currentModelBadge) {
    currentModelBadge.textContent = name || modelId;
  }
}

// Save settings
async function saveSettings() {
  const key = apiKeyInput.value.trim();
  const model = modelSelectHidden.value;

  if (!key) {
    alert('Please enter an API key.');
    return;
  }

  if (!model) {
    alert('Please select a model.');
    return;
  }

  // Get persist duration
  const persistRadio = document.querySelector('input[name="persist-duration"]:checked');
  const persistDays = persistRadio ? parseInt(persistRadio.value) : 0;

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, model, persistDays }),
    });

    if (!response.ok) throw new Error('Failed to save');

    settingsPanel.classList.add('hidden');

    if (currentModelBadge) {
      currentModelBadge.textContent = model;
    }

    if (authStatus) {
      authStatus.textContent = 'Connected (OpenRouter)';
      authStatus.className = 'status-badge authenticated';
    }

    // Update saved info
    if (persistDays > 0) {
      keySavedInfo.textContent = `Saved · expires in ${persistDays} days`;
    } else {
      keySavedInfo.textContent = 'Saved · no expiry';
    }
    keySavedInfo.style.color = 'var(--success)';

    addTerminalMessage('system', '✓', `Settings saved. Model: <strong>${model}</strong>`);
  } catch (error) {
    alert('Failed to save settings: ' + error.message);
  }
}

// Clear settings
async function clearSettings() {
  if (!confirm('Remove your saved API key and model?')) return;

  try {
    await fetch('/api/settings/clear', { method: 'POST' });

    apiKeyInput.value = '';
    modelSearchInput.value = '';
    modelSearchInput.disabled = true;
    modelSelectHidden.value = '';
    refreshModelsBtn.disabled = true;
    allModels = [];
    filteredModels = [];

    if (selectedModelDisplay) selectedModelDisplay.classList.add('hidden');
    if (currentModelBadge) currentModelBadge.textContent = 'No model selected';
    if (authStatus) {
      authStatus.textContent = 'Not connected';
      authStatus.className = 'status-badge error';
    }

    keySavedInfo.textContent = '';
    modelHint.textContent = 'Enter API key to load models';

    addTerminalMessage('system', '🗑️', 'Settings cleared.');
  } catch (error) {
    alert('Failed to clear settings: ' + error.message);
  }
}

/**
 * Data Info Functions
 */

// Load persistent data info
async function loadDataInfo() {
  try {
    const response = await fetch('/api/data/info');
    const data = await response.json();

    if (data.exists && data.stats) {
      dataInfoPanel.classList.remove('hidden');
      dataInfoStats.textContent = `${data.stats.conversations} conversations · ${data.stats.messages} messages · ${data.stats.projects} projects (${data.sizeKB} KB)`;
      dataInfoPath.textContent = data.path;
    } else {
      dataInfoPanel.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load data info:', error);
    dataInfoPanel.classList.add('hidden');
  }
}

// Handle reset data
async function handleResetData() {
  if (!confirm('This will delete ALL your uploaded conversation data. You will need to upload your ZIP again. Continue?')) {
    return;
  }

  try {
    resetDataBtn.disabled = true;
    resetDataBtn.textContent = 'Deleting...';

    const response = await fetch('/api/upload/clear', { method: 'POST' });
    const data = await response.json();

    if (response.ok) {
      dataInfoPanel.classList.add('hidden');
      showUploadStatus('success', 'All data deleted. Upload a new ZIP to start fresh.');

      // Reload everything
      await loadStats();
      await loadConversations();

      addTerminalMessage('system', '🗑️', 'All conversation data has been deleted.');
    } else {
      showUploadStatus('error', data.error || 'Failed to delete data');
    }
  } catch (error) {
    showUploadStatus('error', 'Failed to delete: ' + error.message);
  } finally {
    resetDataBtn.disabled = false;
    resetDataBtn.textContent = 'Reset Data';
  }
}
