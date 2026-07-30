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

// Initialize
checkUploadStatus();
loadStats();
loadConversations();

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
 * Escape a value for safe interpolation into HTML.
 * Escapes quotes too, so it is also safe inside attribute values.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
      const uuid = escapeHtml(conv.uuid);
      const name = escapeHtml(conv.name) || 'Untitled Conversation';

      let html = `
        <div class="result-card ${isSelected ? 'selected' : ''}" data-uuid="${uuid}">
          <div class="checkbox-wrapper">
            <input type="checkbox"
              class="conv-checkbox"
              data-uuid="${uuid}"
              ${isSelected ? 'checked' : ''}>
            <div style="flex: 1">
              <div class="result-header">
                <div>
                  <div class="result-title" onclick="showDetail('${uuid}')">
                    ${name}
                  </div>
                  <div class="result-meta">
                    <span>📅 ${new Date(conv.created_at).toLocaleDateString()}</span>
                    <span>💬 ${conv.chat_messages?.length || 0} messages</span>
                  </div>
                </div>
                <div class="result-actions">
                  <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'markdown')">
                    📄 MD
                  </button>
                  <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'json')">
                    📋 JSON
                  </button>
                  <button class="btn btn-sm" onclick="exportConversation('${uuid}', 'bundle')">
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
                  `<div style="margin-top: 5px;">Message ${m.messageIndex + 1}: ${escapeHtml(m.snippet)}</div>`
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
// Messages of the conversation currently shown in the detail modal,
// so copy buttons can reference them by index instead of inlining the text.
let currentDetailMessages = [];

function copyMessageText(idx, button) {
  copyToClipboard(currentDetailMessages[idx]?.text || '', button);
}

async function showDetail(uuid) {
  showLoading();
  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(uuid)}`);
    const conv = await response.json();
    currentDetailMessages = conv.chat_messages || [];
    const safeUuid = escapeHtml(conv.uuid);

    detailContent.innerHTML = `
      <h2>${escapeHtml(conv.name) || 'Untitled Conversation'}</h2>

      <div class="modal-export-actions">
        <button class="btn btn-sm" onclick="exportConversation('${safeUuid}', 'markdown')">
          📄 Export Markdown
        </button>
        <button class="btn btn-sm" onclick="exportConversation('${safeUuid}', 'json')">
          📋 Export JSON
        </button>
        <button class="btn btn-sm" onclick="exportConversation('${safeUuid}', 'bundle')">
          📦 Export ZIP
        </button>
      </div>

      <div style="margin: 20px 0; color: #666;">
        <p><strong>Created:</strong> ${new Date(conv.created_at).toLocaleString()}</p>
        <p><strong>Updated:</strong> ${new Date(conv.updated_at).toLocaleString()}</p>
        <p><strong>Messages:</strong> ${conv.chat_messages?.length || 0}</p>
        <p style="font-size: 0.85em; color: #999;"><strong>UUID:</strong> ${safeUuid}</p>
      </div>
      ${
        conv.summary
          ? `<div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px;">
          <strong>Summary:</strong> ${escapeHtml(conv.summary)}
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
                ${msg.sender === 'human' ? '👤' : '🤖'} ${escapeHtml((msg.sender || '').toUpperCase())}
                <span class="message-meta">
                  #${idx + 1} • ${new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
              <button class="btn-copy" onclick="copyMessageText(${idx}, this)">
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
        <div class="result-title">${escapeHtml(proj.name)}</div>
        <div class="result-meta">
          <span>📚 ${proj.docs?.length || 0} docs</span>
          <span>${proj.is_private ? '🔒 Private' : '🌐 Public'}</span>
        </div>
        <p style="margin: 10px 0; color: #666;">
          ${escapeHtml(proj.description.substring(0, 200))}${proj.description.length > 200 ? '...' : ''}
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
      <div class="keyword-tag" onclick="searchKeyword('${escapeHtml(word)}')">
        ${escapeHtml(word)}
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
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

  // Convert links — only http(s) URLs, so javascript: links stay inert text
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) =>
    /^https?:\/\//i.test(url)
      ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>`
      : match
  );

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
            <strong>📄 ${escapeHtml(artifact.title)}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <iframe
              sandbox="allow-scripts"
              style="width: 100%; min-height: 400px; border: 1px solid #ddd; border-radius: 4px;"
              srcdoc="${escapeHtml(artifact.code)}">
            </iframe>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${escapeHtml(artifact.code)}</textarea>
        </div>
      `;
      break;

    case 'image/svg+xml':
    case 'svg':
      // Render SVG directly
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>🎨 ${escapeHtml(artifact.title)}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <!-- SVG can carry scripts/event handlers, so render it in a sandboxed iframe -->
            <iframe
              sandbox=""
              style="width: 100%; min-height: 300px; background: white; border: 1px solid #ddd; border-radius: 4px;"
              srcdoc="${escapeHtml(artifact.code)}">
            </iframe>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${escapeHtml(artifact.code)}</textarea>
        </div>
      `;
      break;

    case 'application/vnd.ant.mermaid':
    case 'mermaid':
      // Render Mermaid diagram placeholder (would need mermaid.js library)
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>📊 ${escapeHtml(artifact.title)}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code>${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            <p style="margin-top: 10px; color: #666;">
              <em>Note: Mermaid diagram rendering requires the Mermaid library. Code shown above.</em>
            </p>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${escapeHtml(artifact.code)}</textarea>
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
            <strong>⚛️ ${escapeHtml(artifact.title)}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code class="language-jsx">${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            <p style="margin-top: 10px; color: #666;">
              <em>React component code. To use: copy and integrate into your React project.</em>
            </p>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${escapeHtml(artifact.code)}</textarea>
        </div>
      `;
      break;

    default:
      // Generic code display
      renderedContent = `
        <div class="artifact-preview">
          <div class="artifact-header">
            <strong>📝 ${escapeHtml(artifact.title)}</strong>
            <button class="btn-sm" onclick="toggleArtifact('${artifactId}')">👁️ Toggle</button>
            <button class="btn-sm" onclick="copyArtifactCode('${artifactId}')">📋 Copy Code</button>
          </div>
          <div id="${artifactId}" class="artifact-content">
            <pre class="code-block"><code>${artifact.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
          <textarea id="${artifactId}-code" style="display:none;">${escapeHtml(artifact.code)}</textarea>
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
        authStatus.textContent = '✓ Authenticated';
        authStatus.className = 'status-badge authenticated';
      } else {
        authStatus.textContent = '✗ Not Authenticated';
        authStatus.className = 'status-badge error';
        addTerminalMessage(
          'error',
          '⚠️',
          '<strong>Authentication Required</strong><br>The AI assistant requires authentication. Please ensure your API key is configured.'
        );
      }
    }
    return data.authenticated;
  } catch (error) {
    console.error('Auth check failed:', error);
    if (authStatus) {
      authStatus.textContent = '✗ Error';
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
  // Get selected model and provider
  const modelSelector = document.getElementById('model-selector');
  const selectedModel = modelSelector ? modelSelector.value : 'claude-opus-5';
  
  // Determine provider based on model ID
  const provider = selectedModel.startsWith('claude-') ? 'anthropic' : 'openrouter';
  
  // Get API key for the provider
  const apiKey = provider === 'openrouter' 
    ? await getApiKey('openrouter')
    : await getApiKey('anthropic');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          model: selectedModel,
          provider: provider,
          apiKey: apiKey
        }),
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

  // Get selected model and provider
  const modelSelector = document.getElementById('model-selector');
  const selectedModel = modelSelector ? modelSelector.value : 'claude-opus-5';
  const provider = selectedModel.startsWith('claude-') ? 'anthropic' : 'openrouter';

  // Check auth only for Anthropic (Claude Code requires authentication)
  if (provider === 'anthropic') {
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
      return;
    }
  } else {
    // For OpenRouter, check if API key exists
    const apiKey = await getApiKey('openrouter');
    if (!apiKey) {
      addTerminalMessage('error', '❌', 'Please add your OpenRouter API key in Settings first!');
      return;
    }
  }

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
    const responseHtml = enhanceAIResponse(renderMarkdown(data.response));
    
    // Add model info if available
    const modelInfo = data.model ? `<div style="font-size: 0.8em; color: var(--text-muted); margin-top: 8px;">Model: ${data.model}${data.tokensUsed ? ` • ${data.tokensUsed} tokens` : ''}</div>` : '';
    
    addTerminalMessage('assistant', '🤖', responseHtml + modelInfo);
  } catch (error) {
    // Remove typing indicator
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
      typingElement.closest('.terminal-message').remove();
    }

    console.error('Chat failed after retries:', error);
    const errorMessage = error.message || 'Failed to send message';
    const errorHtml = `
      <strong>Error (after 3 attempts):</strong><br>
      <pre style="white-space: pre-wrap; font-size: 0.85em; margin: 10px 0;">${errorMessage}</pre>
      <button class="btn-sm btn-primary" onclick="retryLastMessage('${message.replace(/'/g, "\\'")}')">🔄 Retry</button>
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
function clearChat() {
  if (!terminalOutput) return;

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
    // Initialize brain particles when assistant tab is opened
    setTimeout(() => {
      initBrainParticles();
    }, 300);
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
      clearUploadBtn.style.display = 'inline-block';
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
      clearUploadBtn.style.display = 'inline-block';

      // Reload data
      await loadStats();
      await loadConversations();

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
      clearUploadBtn.style.display = 'none';

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
 * Brain Particles - Real Conversation Network
 */
async function initBrainParticles() {
  console.log('🧠 Initializing brain network with real data...');
  
  const container = document.getElementById('brain-particles');
  if (!container) {
    console.error('❌ Brain particles container not found!');
    return;
  }

  // Fetch conversations
  let conversations = [];
  try {
    const response = await fetch('/api/conversations?messagesOnly=true&limit=100');
    const data = await response.json();
    conversations = data.conversations || [];
    console.log(`📊 Loaded ${conversations.length} conversations for brain network`);
  } catch (error) {
    console.error('❌ Failed to load conversations:', error);
  }

  // Clear container
  container.innerHTML = '';
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'pointer';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  function resizeCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Extract topics from conversation
  function extractTopics(name, messages) {
    const text = (name + ' ' + (messages || []).map(m => m.text || '').join(' ')).toLowerCase();
    const topics = [];
    
    const topicKeywords = {
      'code': ['code', 'program', 'function', 'api', 'database', 'server', 'bug', 'debug'],
      'design': ['design', 'ui', 'ux', 'layout', 'color', 'style', 'css'],
      'ai': ['ai', 'machine learning', 'model', 'training', 'neural', 'prompt'],
      'business': ['business', 'meeting', 'strategy', 'plan', 'project', 'team'],
      'learning': ['learn', 'study', 'tutorial', 'course', 'book', 'research'],
      'writing': ['write', 'article', 'blog', 'content', 'text', 'document'],
      'data': ['data', 'analysis', 'statistics', 'chart', 'report'],
      'personal': ['personal', 'family', 'friend', 'health', 'travel'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['other'];
  }

  // Color map for topics
  const topicColors = {
    'code': '#3b82f6',
    'design': '#ec4899',
    'ai': '#8b5cf6',
    'business': '#10b981',
    'learning': '#f59e0b',
    'writing': '#06b6d4',
    'data': '#ef4444',
    'personal': '#84cc16',
    'other': '#64748b',
  };

  // Node class
  class ConversationNode {
    constructor(conv, index) {
      this.conversation = conv;
      this.topics = extractTopics(conv.name, conv.chat_messages);
      this.color = topicColors[this.topics[0]] || topicColors['other'];
      this.radius = Math.min(Math.max(conv.chat_messages?.length || 0, 3), 8);
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 1;
      this.vy = (Math.random() - 0.5) * 1;
      this.hovered = false;
      this.id = conv.uuid;
      this.visible = true;
      this.opacity = 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
      if (!this.visible) return;
      
      ctx.globalAlpha = this.opacity;
      
      if (this.hovered) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '40';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.globalAlpha = 1;
    }
  }

  const nodes = conversations.map((conv, idx) => new ConversationNode(conv, idx));

  function areRelated(node1, node2) {
    return node1.topics.some(t => node2.topics.includes(t));
  }

  let mouse = { x: null, y: null };
  let hoveredNode = null;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    hoveredNode = null;
    nodes.forEach(node => {
      if (!node.visible) {
        node.hovered = false;
        return;
      }
      
      const dx = node.x - mouse.x;
      const dy = node.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      node.hovered = distance < node.radius + 5;
      if (node.hovered) hoveredNode = node;
    });

    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
    nodes.forEach(node => node.hovered = false);
    hoveredNode = null;
  });

  canvas.addEventListener('click', async () => {
    if (hoveredNode) {
      console.log('Clicked conversation:', hoveredNode.conversation.name);
      await showDetail(hoveredNode.conversation.uuid);
    }
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].visible && nodes[j].visible && areRelated(nodes[i], nodes[j])) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            ctx.globalAlpha = nodes[i].opacity * nodes[j].opacity * 0.5;
            ctx.beginPath();
            ctx.strokeStyle = nodes[i].color;
            ctx.lineWidth = 1.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    nodes.forEach(node => {
      node.update();
      node.draw();
    });

    if (hoveredNode && hoveredNode.visible) {
      const conv = hoveredNode.conversation;
      const tooltip = `${conv.name}\n${conv.chat_messages?.length || 0} messages\nTopics: ${hoveredNode.topics.join(', ')}`;
      
      ctx.font = '12px Inter, sans-serif';
      const lines = tooltip.split('\n');
      const lineHeight = 16;
      const padding = 10;
      const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
      const height = lines.length * lineHeight + padding * 2;
      
      const x = hoveredNode.x + 15;
      const y = hoveredNode.y - 15;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(x, y, maxWidth, height);
      ctx.strokeStyle = hoveredNode.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, maxWidth, height);

      ctx.fillStyle = '#ffffff';
      lines.forEach((line, idx) => {
        ctx.fillText(line, x + padding, y + padding + (idx + 1) * lineHeight - 4);
      });
    }

    requestAnimationFrame(animate);
  }

  animate();
  console.log(`✅ Brain network initialized with ${nodes.length} conversation nodes`);
  
  updateBrainStats(nodes.length);
  
  // Setup legend click handlers
  setupLegendFilter(nodes, ctx);
}

/**
 * Setup legend topic filtering
 */
function setupLegendFilter(nodes, ctx) {
  const legendItems = document.querySelectorAll('.legend-item');
  let activeFilter = null;
  
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const topic = item.dataset.topic;
      
      // Toggle filter
      if (activeFilter === topic) {
        activeFilter = null;
        item.classList.remove('active');
      } else {
        activeFilter = topic;
        legendItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
      
      // Update node visibility
      nodes.forEach(node => {
        if (activeFilter) {
          const matches = node.topics.includes(activeFilter);
          node.visible = matches;
          node.opacity = matches ? 1 : 0.2;
        } else {
          node.visible = true;
          node.opacity = 1;
        }
      });
      
      console.log(`🔍 Filter: ${activeFilter || 'All topics'}`);
    });
  });
}

/**
 * Update brain visualization stats
 */
function updateBrainStats(nodeCount = 0) {
  const nodesEl = document.getElementById('active-nodes');
  const connectionsEl = document.getElementById('active-connections');
  
  if (nodesEl && connectionsEl) {
    nodesEl.textContent = nodeCount || 0;
    connectionsEl.textContent = Math.floor(nodeCount * 1.5);
  }
}

/**
 * Settings Management
 */
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');

// Open settings modal
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    if (settingsModal) {
      settingsModal.classList.remove('hidden');
      loadApiKeys();
    }
  });
}

// Close settings modal
if (settingsModal) {
  const settingsCloseBtn = settingsModal.querySelector('.modal-close');
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
}

// API Key Management
async function saveApiKey(provider, key) {
  const keys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
  keys[provider] = key;
  localStorage.setItem('apiKeys', JSON.stringify(keys));
}

async function getApiKey(provider) {
  const keys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
  return keys[provider];
}

async function deleteApiKey(provider) {
  const keys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
  delete keys[provider];
  localStorage.setItem('apiKeys', JSON.stringify(keys));
}

async function loadApiKeys() {
  const anthropicKey = await getApiKey('anthropic');
  const openRouterKey = await getApiKey('openrouter');

  const anthropicInput = document.getElementById('anthropic-key');
  const openRouterInput = document.getElementById('openrouter-key');
  const anthropicStatus = document.getElementById('anthropic-status');
  const openRouterStatus = document.getElementById('openrouter-status');

  if (anthropicInput) {
    anthropicInput.value = anthropicKey || '';
    anthropicStatus.textContent = anthropicKey ? '✓ Configured' : 'Not configured';
    anthropicStatus.className = anthropicKey ? 'api-key-status configured' : 'api-key-status';
  }

  if (openRouterInput) {
    openRouterInput.value = openRouterKey || '';
    openRouterStatus.textContent = openRouterKey ? '✓ Configured' : 'Not configured';
    openRouterStatus.className = openRouterKey ? 'api-key-status configured' : 'api-key-status';
  }
}

// Save Anthropic key
document.getElementById('save-anthropic-key')?.addEventListener('click', async () => {
  const input = document.getElementById('anthropic-key');
  const status = document.getElementById('anthropic-status');
  
  if (input && input.value) {
    await saveApiKey('anthropic', input.value);
    status.textContent = '✓ Saved';
    status.className = 'api-key-status configured';
    setTimeout(() => {
      status.textContent = '✓ Configured';
    }, 2000);
  }
});

// Save OpenRouter key with validation
document.getElementById('save-openrouter-key')?.addEventListener('click', async () => {
  const input = document.getElementById('openrouter-key');
  const status = document.getElementById('openrouter-status');
  
  if (input && input.value) {
    status.textContent = 'Validating...';
    status.className = 'api-key-status';
    
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openrouter', apiKey: input.value }),
      });
      
      const data = await response.json();
      
      if (data.valid) {
        await saveApiKey('openrouter', input.value);
        status.textContent = '✓ Valid & Saved - Loading models...';
        status.className = 'api-key-status configured';
        await loadModelOptions();
        status.textContent = '✓ Valid & Saved - Models loaded!';
        setTimeout(() => {
          status.textContent = '✓ Configured';
        }, 2000);
      } else {
        status.textContent = '✗ Invalid key';
        status.className = 'api-key-status error';
      }
    } catch (error) {
      status.textContent = '✗ Validation failed';
      status.className = 'api-key-status error';
    }
  }
});

// Clear API keys
document.getElementById('clear-anthropic-key')?.addEventListener('click', async () => {
  await deleteApiKey('anthropic');
  const input = document.getElementById('anthropic-key');
  const status = document.getElementById('anthropic-status');
  if (input) input.value = '';
  if (status) {
    status.textContent = 'Not configured';
    status.className = 'api-key-status';
  }
});

document.getElementById('clear-openrouter-key')?.addEventListener('click', async () => {
  await deleteApiKey('openrouter');
  const input = document.getElementById('openrouter-key');
  const status = document.getElementById('openrouter-status');
  if (input) input.value = '';
  if (status) {
    status.textContent = 'Not configured';
    status.className = 'api-key-status';
  }
  await loadModelOptions();
});

/**
 * Model Selection
 */
const modelSelector = document.getElementById('model-selector');

async function loadModelOptions() {
  const openRouterKey = await getApiKey('openrouter');
  
  // Show loading state
  if (modelSelector) {
    modelSelector.innerHTML = '<option value="">Loading models...</option>';
    modelSelector.disabled = true;
  }
  
  try {
    // Send the key in a header — query strings leak into logs and history
    const response = await fetch('/api/models', {
      headers: openRouterKey ? { 'x-openrouter-key': openRouterKey } : {},
    });
    const data = await response.json();
    
    if (modelSelector && data.models) {
      modelSelector.innerHTML = '';
      
      // Group by provider
      const anthropicModels = data.models.filter(m => m.provider === 'anthropic');
      const openRouterModels = data.models.filter(m => m.provider === 'openrouter');
      
      if (anthropicModels.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Anthropic';
        anthropicModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          optgroup.appendChild(option);
        });
        modelSelector.appendChild(optgroup);
      }
      
      if (openRouterModels.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `OpenRouter (${openRouterModels.length} models)`;
        openRouterModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          optgroup.appendChild(option);
        });
        modelSelector.appendChild(optgroup);
        
        console.log(`✓ Loaded ${anthropicModels.length} Anthropic + ${openRouterModels.length} OpenRouter models`);
      } else if (openRouterKey) {
        console.log('⚠ OpenRouter key saved but no models loaded');
      }
      
      // Restore saved model selection
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel) {
        modelSelector.value = savedModel;
      }
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    if (modelSelector) {
      modelSelector.innerHTML = '<option value="">Failed to load models</option>';
    }
  } finally {
    if (modelSelector) {
      modelSelector.disabled = false;
    }
  }
}

// Save selected model
if (modelSelector) {
  modelSelector.addEventListener('change', () => {
    localStorage.setItem('selectedModel', modelSelector.value);
    console.log(`✓ Model changed to: ${modelSelector.value}`);
  });
}

/**
 * Clear All Data
 */
document.getElementById('clear-all-data')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear ALL data? This will delete:\n\n• API keys\n• Chat history\n• Settings\n• Uploaded data\n\nThis cannot be undone!')) {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear uploaded data
      await fetch('/api/upload/clear', { method: 'POST' });
      
      // Clear chat history
      clearChat();
      
      alert('All data cleared successfully!');
      
      // Close settings modal
      if (settingsModal) {
        settingsModal.classList.add('hidden');
      }
      
      // Reload page
      location.reload();
    } catch (error) {
      alert('Failed to clear data: ' + error.message);
    }
  }
});

/**
 * Export/Import Settings
 */
document.getElementById('export-settings')?.addEventListener('click', () => {
  const settings = {
    apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
    selectedModel: localStorage.getItem('selectedModel'),
  };
  
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claude-explorer-settings-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-settings')?.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      if (settings.apiKeys) {
        localStorage.setItem('apiKeys', JSON.stringify(settings.apiKeys));
      }
      if (settings.selectedModel) {
        localStorage.setItem('selectedModel', settings.selectedModel);
      }
      
      alert('Settings imported successfully!');
      loadApiKeys();
      await loadModelOptions();
    } catch (error) {
      alert('Failed to import settings: ' + error.message);
    }
  };
  
  input.click();
});

/**
 * Initialize on page load
 */
(async function initializeOnLoad() {
  // Load API keys
  await loadApiKeys();
  
  // Load model options
  await loadModelOptions();
  
  // Initialize brain particles when assistant tab is opened
  const assistantTab = document.querySelector('[data-tab="assistant"]');
  if (assistantTab) {
    assistantTab.addEventListener('click', () => {
      setTimeout(() => {
        initBrainParticles();
      }, 100);
    });
  }
})();
