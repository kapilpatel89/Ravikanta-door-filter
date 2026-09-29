/**
 * Ravikanta Doors - Production Order Slip Printing WebApp
 * Complete Client Logic: State Management, Dynamic Categories,
 * 1-by-1 Categorizer Wizard, and A4 Slip Generation
 */

// Helper: Get local today's date in YYYY-MM-DD
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Format date for display in DD/MM/YYYY
function formatDisplayDate(dateStr) {
  if (!dateStr) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Application State
const state = {
  orders: [],
  categories: [],
  categorized: { assignments: {}, updatedAt: '' },
  company: {
    companyName: 'Ravikanta Doors',
    tagline: 'Quality Door Manufacturing',
    address: '#76 Kattamnallur Village, Bidarahalli Hobli Banglore East Taluk-560049',
    phone: '+91 8884782543',
    gstin: '29AADFO4662K1ZU',
    printHeaderTitle: 'ORDER LIST'
  },
  currentWizardIndex: 0,
  activeFilterCategoryId: 'ALL',
  slipDate: getTodayDateString()
};

// ============================================================================
// DUAL-MODE API LAYER (PHP Server & Standalone LocalStorage / file:/// Support)
// ============================================================================
let isOfflineMode = (window.location.protocol === 'file:');

const LS_ORDERS_KEY = 'ravikanta_doors_orders';
const LS_CATS_KEY = 'ravikanta_doors_categories';
const LS_ASSIGNMENTS_KEY = 'ravikanta_doors_categorized';
const LS_COMPANY_KEY = 'ravikanta_doors_company';

function updateProtocolNotice(isConnectedToServer) {
  const banner = document.getElementById('fileProtocolNotice');
  const statusText = document.getElementById('fileProtocolStatusText');
  if (!banner) return;

  if (window.location.protocol === 'file:') {
    banner.style.display = 'flex';
    if (isConnectedToServer) {
      banner.style.background = '#f0fdf4';
      banner.style.borderBottom = '1.5px solid #16a34a';
      if (statusText) statusText.innerHTML = '🟢 Connected to local PHP server (http://localhost:8080).';
    } else {
      banner.style.background = '#fffbeb';
      banner.style.borderBottom = '1.5px solid #000000';
      if (statusText) statusText.innerHTML = '💾 Standalone Mode (localStorage active). Run start_server.bat for file-saving mode.';
    }
  } else {
    banner.style.display = 'none';
  }
}

function handleLocalStorageApi(action, method = 'GET', data = null) {
  const defaultData = window.DEFAULT_DATA || {
    orders: [],
    categories: [],
    categorized: { assignments: {} },
    company: {
      companyName: 'Ravikanta Doors',
      tagline: 'Quality Door Manufacturing',
      address: '#76 Kattamnallur Village, Bidarahalli Hobli Banglore East Taluk-560049',
      phone: '+91 8884782543',
      gstin: '29AADFO4662K1ZU',
      printHeaderTitle: 'ORDER LIST'
    }
  };

  switch (action) {
    case 'get_data': {
      let orders = null;
      let categories = null;
      let categorized = null;
      let company = null;

      try {
        const storedOrders = localStorage.getItem(LS_ORDERS_KEY);
        if (storedOrders) orders = JSON.parse(storedOrders);

        const storedCats = localStorage.getItem(LS_CATS_KEY);
        if (storedCats) categories = JSON.parse(storedCats);

        const storedAssigned = localStorage.getItem(LS_ASSIGNMENTS_KEY);
        if (storedAssigned) categorized = JSON.parse(storedAssigned);

        const storedComp = localStorage.getItem(LS_COMPANY_KEY);
        if (storedComp) company = JSON.parse(storedComp);
      } catch (e) {
        console.warn('LocalStorage read error:', e);
      }

      // Initialize with bundled default data if not yet in localStorage
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        orders = defaultData.orders || [];
        try { localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders)); } catch (e) {}
      }
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        categories = defaultData.categories || [];
        try { localStorage.setItem(LS_CATS_KEY, JSON.stringify(categories)); } catch (e) {}
      }
      if (!categorized || typeof categorized !== 'object' || !categorized.assignments) {
        categorized = defaultData.categorized || { assignments: {} };
        try { localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(categorized)); } catch (e) {}
      }
      if (!company || typeof company !== 'object' || !company.companyName) {
        company = defaultData.company || {};
        try { localStorage.setItem(LS_COMPANY_KEY, JSON.stringify(company)); } catch (e) {}
      }

      return {
        success: true,
        orders: orders,
        categories: categories,
        categorized: categorized,
        company: company,
        mode: 'localStorage'
      };
    }

    case 'save_categorized': {
      const assignments = (data && data.assignments) ? data.assignments : {};
      const categorizedObj = { assignments: assignments, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(categorizedObj));
      } catch (e) {}
      return { success: true, categorized: categorizedObj };
    }

    case 'save_categories': {
      const cats = (data && data.categories) ? data.categories : [];
      try {
        localStorage.setItem(LS_CATS_KEY, JSON.stringify(cats));
      } catch (e) {}
      return { success: true, categories: cats };
    }

    case 'save_company': {
      const comp = (data && data.company) ? data.company : {};
      try {
        localStorage.setItem(LS_COMPANY_KEY, JSON.stringify(comp));
      } catch (e) {}
      return { success: true, company: comp };
    }

    case 'save_orders': {
      const ords = (data && data.orders) ? data.orders : [];
      try {
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(ords));
      } catch (e) {}
      return { success: true, count: ords.length };
    }

    case 'reset_sample': {
      try {
        localStorage.removeItem(LS_ORDERS_KEY);
        localStorage.removeItem(LS_ASSIGNMENTS_KEY);
      } catch (e) {}
      return {
        success: true,
        orders: defaultData.orders,
        categorized: defaultData.categorized
      };
    }

    default:
      return { success: false, error: 'Unknown action' };
  }
}

async function apiRequest(action, method = 'GET', data = null) {
  // If running via file:/// protocol, attempt local server http://localhost:8080/ first
  if (window.location.protocol === 'file:') {
    try {
      const url = `http://localhost:8080/api.php?action=${action}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      };
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      if (response.ok) {
        const json = await response.json();
        isOfflineMode = false;
        updateProtocolNotice(true);
        return json;
      }
    } catch (err) {
      // Local PHP server not reachable, silently fall back to localStorage
    }

    isOfflineMode = true;
    updateProtocolNotice(false);
    return handleLocalStorageApi(action, method, data);
  }

  // Standard web server execution (http:// or https://)
  try {
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`api.php?action=${action}`, options);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    updateProtocolNotice(true);
    return await response.json();
  } catch (err) {
    console.warn(`Server request failed for action "${action}", falling back to LocalStorage:`, err);
    isOfflineMode = true;
    updateProtocolNotice(false);
    return handleLocalStorageApi(action, method, data);
  }
}

// Initial Data Load
async function loadInitialData() {
  updateProtocolNotice(false);
  const res = await apiRequest('get_data');
  if (res && res.success) {
    state.orders = res.orders || [];
    state.categories = res.categories || [];
    if (res.categorized && res.categorized.assignments && typeof res.categorized.assignments === 'object' && !Array.isArray(res.categorized.assignments)) {
      state.categorized = res.categorized;
    } else {
      state.categorized = { assignments: {} };
    }
    if (res.company) state.company = res.company;

    // Set today's date into picker
    const dateInput = document.getElementById('slipDatePicker');
    if (dateInput) {
      dateInput.value = state.slipDate;
    }

    updateHeaderUI();
    renderOrdersOverview();
    renderWizardOrderPills();
    renderCurrentWizardOrder();
    renderPrintView();

    if (res.mode === 'localStorage' || isOfflineMode) {
      showToast('Loaded orders & categories in Standalone Mode', 'info');
    } else {
      showToast('Connected to local database', 'success');
    }
  }
}

// Save categorized data to backend JSON
async function saveCategorizedData() {
  if (!state.categorized || !state.categorized.assignments || Array.isArray(state.categorized.assignments)) {
    state.categorized = { assignments: {} };
  }
  const plainAssignments = {};
  for (const [k, v] of Object.entries(state.categorized.assignments)) {
    if (v) plainAssignments[k] = v;
  }
  const res = await apiRequest('save_categorized', 'POST', {
    assignments: plainAssignments
  });
  if (res && res.success && res.categorized) {
    state.categorized = res.categorized;
    if (!state.categorized.assignments || Array.isArray(state.categorized.assignments)) {
      state.categorized.assignments = {};
    }
  }
}

// Save categories to backend JSON
async function saveCategoriesData() {
  const res = await apiRequest('save_categories', 'POST', {
    categories: state.categories
  });
  if (res && res.success) {
    showToast('Categories updated successfully', 'success');
  }
}

// Save company profile to backend JSON
async function saveCompanyData() {
  const res = await apiRequest('save_company', 'POST', {
    company: state.company
  });
  if (res && res.success) {
    showToast('Company settings saved', 'success');
  }
}

// Reset to original sample data
async function resetSampleData() {
  if (!confirm('Are you sure you want to reset orders to the original sample dataset? Any unsaved changes will be lost.')) {
    return;
  }
  const res = await apiRequest('reset_sample', 'POST');
  if (res && res.success) {
    state.orders = res.orders || [];
    state.categorized = { assignments: {} };
    state.currentWizardIndex = 0;
    renderOrdersOverview();
    renderWizardOrderPills();
    renderCurrentWizardOrder();
    renderPrintView();
    showToast('Restored original sample orders', 'success');
  }
}

// ============================================================================
// AUTO-CATEGORIZATION ENGINE
// ============================================================================
function findMatchingCategoryId(item, isFrame = false) {
  if (!item) return '';

  if (isFrame) {
    const frameCat = state.categories.find(c => c.id === 'cat-wpc-frame' || c.name.toLowerCase().includes('frame'));
    if (frameCat) return frameCat.id;
  }

  const textToSearch = [
    item.doorType || '',
    item.frameType || '',
    item.flushDoorType || '',
    item.designNo || '',
    item.section || '',
    item.notes || ''
  ].join(' ').toLowerCase();

  // If contains frame keyword
  if (textToSearch.includes('frame')) {
    const frameCat = state.categories.find(c => c.id === 'cat-wpc-frame' || c.name.toLowerCase().includes('frame'));
    if (frameCat) return frameCat.id;
  }

  for (const cat of state.categories) {
    if (cat.keywords && Array.isArray(cat.keywords)) {
      for (const kw of cat.keywords) {
        if (kw && textToSearch.includes(kw.toLowerCase())) {
          return cat.id;
        }
      }
    }
  }

  // Fallback checks
  if (textToSearch.includes('micro') || textToSearch.includes('coated')) {
    const found = state.categories.find(c => c.name.toLowerCase().includes('micro'));
    if (found) return found.id;
  }
  if (textToSearch.includes('laminat')) {
    const found = state.categories.find(c => c.name.toLowerCase().includes('laminate'));
    if (found) return found.id;
  }
  if (textToSearch.includes('teak') || textToSearch.includes('ghana')) {
    const found = state.categories.find(c => c.name.toLowerCase().includes('teak'));
    if (found) return found.id;
  }
  if (textToSearch.includes('uv') || textToSearch.includes('wpc') || textToSearch.includes('printed')) {
    const found = state.categories.find(c => c.name.toLowerCase().includes('uv'));
    if (found) return found.id;
  }

  return '';
}

function getItemKey(orderId, item, index, isFrame = false) {
  if (isFrame) {
    return `${orderId}__frame_${item.id || ('fidx_' + index)}`;
  }
  return `${orderId}__${item.id || ('idx_' + index)}`;
}

function autoDetectInitialAssignments() {
  let changed = false;
  state.orders.forEach(order => {
    // Process Doors
    if (order.doors && Array.isArray(order.doors)) {
      order.doors.forEach((door, idx) => {
        const key = getItemKey(order.id, door, idx, false);
        if (!state.categorized.assignments[key]) {
          const matchId = findMatchingCategoryId(door, false);
          if (matchId) {
            state.categorized.assignments[key] = matchId;
            changed = true;
          }
        }
      });
    }
    // Process WPC Frames
    if (order.wpcFrames && Array.isArray(order.wpcFrames)) {
      order.wpcFrames.forEach((frame, idx) => {
        const key = getItemKey(order.id, frame, idx, true);
        if (!state.categorized.assignments[key]) {
          const matchId = findMatchingCategoryId(frame, true);
          if (matchId) {
            state.categorized.assignments[key] = matchId;
            changed = true;
          }
        }
      });
    }
  });
  if (changed) {
    saveCategorizedData();
  }
}

// ============================================================================
// NAVIGATION & VIEW SWITCHING
// ============================================================================
function switchView(viewName) {
  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  if (viewName === 'orders') {
    document.getElementById('view-orders').classList.add('active');
    document.getElementById('tabBtnOrders').classList.add('active');
    renderOrdersOverview();
  } else if (viewName === 'wizard') {
    document.getElementById('view-wizard').classList.add('active');
    document.getElementById('tabBtnWizard').classList.add('active');
    renderWizardOrderPills();
    renderCurrentWizardOrder();
  } else if (viewName === 'print') {
    document.getElementById('view-print').classList.add('active');
    document.getElementById('tabBtnPrint').classList.add('active');
    renderPrintView();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateHeaderUI() {
  if (document.getElementById('headerCompanyName')) {
    document.getElementById('headerCompanyName').textContent = state.company.companyName;
  }
  if (document.getElementById('headerTagline')) {
    document.getElementById('headerTagline').textContent = state.company.address;
  }
}

// ============================================================================
// VIEW 1: ORDERS OVERVIEW LOGIC
// ============================================================================
function renderOrdersOverview() {
  const totalOrders = state.orders.length;
  let totalDoors = 0;
  let totalFrames = 0;
  let totalItems = 0;
  let categorizedItems = 0;

  state.orders.forEach(order => {
    // Count doors
    if (order.doors && Array.isArray(order.doors)) {
      order.doors.forEach((door, idx) => {
        totalItems++;
        totalDoors += Number(door.quantity) || 0;
        const key = getItemKey(order.id, door, idx, false);
        if (state.categorized.assignments[key]) {
          categorizedItems++;
        }
      });
    }
    // Count WPC frames
    if (order.wpcFrames && Array.isArray(order.wpcFrames)) {
      order.wpcFrames.forEach((frame, idx) => {
        totalItems++;
        totalFrames += Number(frame.quantity) || 0;
        const key = getItemKey(order.id, frame, idx, true);
        if (state.categorized.assignments[key]) {
          categorizedItems++;
        }
      });
    }
  });

  document.getElementById('statTotalOrders').textContent = totalOrders;
  document.getElementById('statTotalDoors').textContent = totalDoors;
  const framesStatEl = document.getElementById('statTotalFrames');
  if (framesStatEl) framesStatEl.textContent = totalFrames;
  document.getElementById('statCategorizedItems').textContent = `${categorizedItems} / ${totalItems}`;
  document.getElementById('statTotalCategories').textContent = state.categories.length;

  document.getElementById('navBadgeOrdersCount').textContent = totalOrders;
  document.getElementById('navBadgeWizardProgress').textContent = `${categorizedItems}/${totalItems}`;
  document.getElementById('orderCountBadge').textContent = `${totalOrders} Orders`;

  const tbody = document.getElementById('ordersOverviewTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No orders found. Click "Import JSON" or "Reset Sample" to load orders.</td></tr>`;
    return;
  }

  state.orders.forEach((order, index) => {
    const tr = document.createElement('tr');
    const doorsCount = (order.doors && order.doors.length) || 0;
    const framesCount = (order.wpcFrames && order.wpcFrames.length) || 0;
    const totalOrderItems = doorsCount + framesCount;
    
    // Check categorization status for this order (both doors and frames)
    let orderCategorizedCount = 0;
    if (order.doors) {
      order.doors.forEach((door, idx) => {
        const key = getItemKey(order.id, door, idx, false);
        if (state.categorized.assignments[key]) orderCategorizedCount++;
      });
    }
    if (order.wpcFrames) {
      order.wpcFrames.forEach((frame, idx) => {
        const key = getItemKey(order.id, frame, idx, true);
        if (state.categorized.assignments[key]) orderCategorizedCount++;
      });
    }

    const isFullyCategorized = totalOrderItems > 0 && orderCategorizedCount === totalOrderItems;
    const statusBadge = isFullyCategorized
      ? `<span class="category-tag" style="background:#16a34a;">✅ All ${totalOrderItems} Categorized</span>`
      : `<span class="category-tag" style="background:#d97706;">⚠️ ${orderCategorizedCount}/${totalOrderItems} Categorized</span>`;

    // Sizes summary
    let sizeDetails = [];
    if (order.doors && order.doors.length > 0) {
      const doorSizes = order.doors.map(d => d.dimensions).filter(Boolean).slice(0, 2).join(', ');
      sizeDetails.push(`<strong>${doorSizes}${order.doors.length > 2 ? '...' : ''}</strong>`);
    }
    if (order.wpcFrames && order.wpcFrames.length > 0) {
      const frameSizes = order.wpcFrames.map(f => f.dimensions || `${f.section}×${f.lengthFeet}ft`).join(', ');
      sizeDetails.push(`<span style="color:#0891b2; font-size:0.75rem; font-weight:700;">🪟 ${frameSizes}</span>`);
    }

    const orderDoorsQty = order.doorsCount || order.totalDoors || 0;
    const orderFramesQty = order.totalFrames || (order.wpcFrames ? order.wpcFrames.reduce((s,f)=>s+(Number(f.quantity)||0), 0) : 0);

    const framesCell = orderFramesQty > 0
      ? `<span class="category-tag" style="background:#0891b2;">🪟 ${orderFramesQty} Frames</span>`
      : `<span style="color:#94a3b8;">—</span>`;

    tr.innerHTML = `
      <td><span class="order-id-badge">${escapeHtml(order.id || order.orderNumber)}</span></td>
      <td class="party-cell">
        <div class="party-name">${escapeHtml(order.partyName || '-')}</div>
      </td>
      <td>${escapeHtml(order.orderDate || '-')}</td>
      <td><strong>${orderDoorsQty}</strong></td>
      <td>${framesCell}</td>
      <td>${sizeDetails.join('<br>') || '-'}</td>
      <td>${totalOrderItems} item${totalOrderItems > 1 ? 's' : ''}</td>
      <td>${statusBadge}</td>
      <td style="text-align: right;">
        <button class="btn btn-outline-primary btn-sm" onclick="startWizardAt(${index})">
          Categorize ✏️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function startWizardAt(index) {
  state.currentWizardIndex = Math.max(0, Math.min(index, state.orders.length - 1));
  switchView('wizard');
}

// ============================================================================
// VIEW 2: 1-BY-1 CATEGORIZER WIZARD LOGIC
// ============================================================================
function renderWizardOrderPills() {
  const container = document.getElementById('wizardOrderPills');
  if (!container) return;
  container.innerHTML = '';

  state.orders.forEach((order, index) => {
    const btn = document.createElement('button');
    btn.className = 'order-step-btn';
    if (index === state.currentWizardIndex) {
      btn.classList.add('current');
    }

    // Check if fully categorized (both doors and frames)
    const doorsCount = (order.doors && order.doors.length) || 0;
    const framesCount = (order.wpcFrames && order.wpcFrames.length) || 0;
    const totalItems = doorsCount + framesCount;
    let orderCategorizedCount = 0;

    if (order.doors) {
      order.doors.forEach((door, idx) => {
        const key = getItemKey(order.id, door, idx, false);
        if (state.categorized.assignments[key]) orderCategorizedCount++;
      });
    }
    if (order.wpcFrames) {
      order.wpcFrames.forEach((frame, idx) => {
        const key = getItemKey(order.id, frame, idx, true);
        if (state.categorized.assignments[key]) orderCategorizedCount++;
      });
    }

    const isDone = totalItems > 0 && orderCategorizedCount === totalItems;
    if (isDone && index !== state.currentWizardIndex) {
      btn.classList.add('completed');
    }

    const hasFramesIcon = (order.hasWpcFrames || framesCount > 0) ? ' 🪟' : '';
    btn.innerHTML = `${isDone ? '✓ ' : ''}${order.id || ('Order #' + (index + 1))}${hasFramesIcon}`;
    btn.onclick = () => {
      state.currentWizardIndex = index;
      renderWizardOrderPills();
      renderCurrentWizardOrder();
    };
    container.appendChild(btn);
  });
}

function renderCurrentWizardOrder() {
  if (state.orders.length === 0) {
    document.getElementById('wizardStepCounter').textContent = 'No orders available';
    document.getElementById('wizardItemsTableBody').innerHTML = `<tr><td colspan="9" class="empty-state">No orders to categorize.</td></tr>`;
    return;
  }

  const orderIndex = state.currentWizardIndex;
  const order = state.orders[orderIndex];
  const totalOrders = state.orders.length;

  // Header & Step counters
  document.getElementById('wizardStepCounter').textContent = `Order ${orderIndex + 1} of ${totalOrders}`;
  document.getElementById('wizardCurrentOrderTitle').textContent = order.id || order.orderNumber;
  document.getElementById('currentOrderId').textContent = order.id || order.orderNumber;
  document.getElementById('currentOrderStatus').textContent = (order.status || 'Confirmed').toUpperCase();
  document.getElementById('currentOrderDate').textContent = order.orderDate || state.slipDate;
  document.getElementById('currentOrderDoors').textContent = order.doorsCount || order.totalDoors || 0;
  
  // WPC Frames chip in header
  const framesChip = document.getElementById('currentOrderFramesChip');
  const framesCountEl = document.getElementById('currentOrderFrames');
  const orderFramesTotal = order.totalFrames || (order.wpcFrames ? order.wpcFrames.reduce((s,f)=>s+(Number(f.quantity)||0), 0) : 0);
  if (framesChip && framesCountEl) {
    if (orderFramesTotal > 0 || order.hasWpcFrames) {
      framesChip.style.display = 'inline-flex';
      framesCountEl.textContent = orderFramesTotal;
    } else {
      framesChip.style.display = 'none';
    }
  }

  document.getElementById('currentPartyName').textContent = order.partyName || 'Unknown Party';
  const partyMobileEl = document.getElementById('currentPartyMobile');
  if (partyMobileEl) partyMobileEl.style.display = 'none';

  // Overall Progress (Doors + Frames)
  let totalItems = 0;
  let categorizedItems = 0;
  state.orders.forEach(o => {
    if (o.doors) {
      o.doors.forEach((d, idx) => {
        totalItems++;
        const key = getItemKey(o.id, d, idx, false);
        if (state.categorized.assignments[key]) categorizedItems++;
      });
    }
    if (o.wpcFrames) {
      o.wpcFrames.forEach((f, idx) => {
        totalItems++;
        const key = getItemKey(o.id, f, idx, true);
        if (state.categorized.assignments[key]) categorizedItems++;
      });
    }
  });
  const overallPercent = totalItems > 0 ? Math.round((categorizedItems / totalItems) * 100) : 0;
  document.getElementById('wizardOverallStats').textContent = `Overall: ${categorizedItems}/${totalItems} items (${overallPercent}%)`;
  document.getElementById('wizardProgressBar').style.width = `${overallPercent}%`;

  // Populate Quick Assign Select Dropdown
  const quickSelect = document.getElementById('quickAssignSelect');
  if (quickSelect) {
    quickSelect.innerHTML = '<option value="">-- Choose Department --</option>';
    state.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      quickSelect.appendChild(opt);
    });
  }

  // 1. Render Door Line Items Table
  const tbody = document.getElementById('wizardItemsTableBody');
  tbody.innerHTML = '';

  const doors = order.doors || [];
  let unassignedCount = 0;

  doors.forEach((door, idx) => {
    const key = getItemKey(order.id, door, idx, false);
    const assignedCatId = state.categorized.assignments[key] || '';
    if (!assignedCatId) unassignedCount++;

    const tr = document.createElement('tr');
    tr.id = `row-${key}`;

    let optionsHtml = '<option value="">-- Select Department --</option>';
    state.categories.forEach(cat => {
      const isSelected = cat.id === assignedCatId ? 'selected' : '';
      optionsHtml += `<option value="${cat.id}" ${isSelected}>${escapeHtml(cat.name)}</option>`;
    });

    const statusClass = assignedCatId ? 'selected-good' : 'unselected';

    tr.innerHTML = `
      <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
      <td><span class="item-size-badge">${escapeHtml(door.dimensions || `${door.height}" × ${door.width}"`)}</span></td>
      <td><span class="item-design">${escapeHtml(door.designNo || '-')}</span></td>
      <td><span class="item-flush">${escapeHtml(door.flushDoorType || '-')}</span></td>
      <td><span style="font-size: 0.8rem; color: #475569;">${escapeHtml(door.doorType || '-')}</span></td>
      <td>${escapeHtml(door.thickness || '30 MM')}</td>
      <td style="text-align: center;"><span class="item-qty-badge">${door.quantity || 1}</span></td>
      <td style="font-size: 0.8rem; color: #64748b;">${escapeHtml(door.notes || '—')}</td>
      <td>
        <div class="category-select-wrapper">
          <select class="category-dropdown ${statusClass}" onchange="handleItemCategoryChange('${order.id}', '${door.id || ('idx_' + idx)}', ${idx}, this.value, false)">
            ${optionsHtml}
          </select>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 2. Render WPC Frames Section (if frames exist in this order)
  const framesSection = document.getElementById('wizardFramesSection');
  const framesTbody = document.getElementById('wizardFramesTableBody');
  const frames = order.wpcFrames || [];

  if (frames.length > 0) {
    framesSection.style.display = 'block';
    const badgeCount = document.getElementById('wizardFramesCountBadge');
    if (badgeCount) badgeCount.textContent = `${orderFramesTotal} Frames (${frames.length} sizes)`;

    framesTbody.innerHTML = '';
    frames.forEach((frame, fidx) => {
      const key = getItemKey(order.id, frame, fidx, true);
      const assignedCatId = state.categorized.assignments[key] || '';
      if (!assignedCatId) unassignedCount++;

      const ftr = document.createElement('tr');
      ftr.id = `row-${key}`;

      let optionsHtml = '<option value="">-- Select Department --</option>';
      state.categories.forEach(cat => {
        const isSelected = cat.id === assignedCatId ? 'selected' : '';
        optionsHtml += `<option value="${cat.id}" ${isSelected}>${escapeHtml(cat.name)}</option>`;
      });

      const statusClass = assignedCatId ? 'selected-good' : 'unselected';

      ftr.innerHTML = `
        <td style="text-align: center; font-weight: 700;">${fidx + 1}</td>
        <td><strong style="color:#0f766e;">${escapeHtml(frame.section || 'WPC')}</strong></td>
        <td><span class="item-size-badge" style="color:#0e7490;">${escapeHtml(frame.dimensions || `${frame.section} × ${frame.lengthFeet} ft`)}</span></td>
        <td><span class="item-flush" style="color:#0891b2;">${escapeHtml(frame.frameType || 'WPC FRAME')}</span></td>
        <td style="text-align: center;"><span class="item-qty-badge" style="background:#ecfeff; color:#0e7490;">${frame.quantity || 1}</span></td>
        <td style="font-size: 0.8rem; color: #64748b;">${escapeHtml(frame.notes || 'WPC Frame')}</td>
        <td>
          <div class="category-select-wrapper">
            <select class="category-dropdown ${statusClass}" onchange="handleItemCategoryChange('${order.id}', '${frame.id || ('fidx_' + fidx)}', ${fidx}, this.value, true)">
              ${optionsHtml}
            </select>
          </div>
        </td>
      `;
      framesTbody.appendChild(ftr);
    });
  } else {
    framesSection.style.display = 'none';
  }

  // Validation Check (considers doors AND frames)
  const totalItemsInOrder = doors.length + frames.length;
  updateWizardValidationState(unassignedCount, totalItemsInOrder);

  // Prev / Next button states
  document.getElementById('btnPrevOrder').disabled = orderIndex === 0;
  
  // Finish button visibility
  const isLastOrder = orderIndex === totalOrders - 1;
  const btnFinish = document.getElementById('btnFinishWizard');
  if (btnFinish) {
    btnFinish.style.display = isLastOrder || overallPercent === 100 ? 'inline-flex' : 'none';
  }
}

function handleItemCategoryChange(orderId, itemId, itemIndex, categoryId, isFrame = false) {
  if (!state.categorized.assignments || Array.isArray(state.categorized.assignments)) {
    state.categorized.assignments = {};
  }
  const key = isFrame ? `${orderId}__frame_${itemId}` : `${orderId}__${itemId}`;
  if (categoryId) {
    state.categorized.assignments[key] = categoryId;
  } else {
    delete state.categorized.assignments[key];
  }
  saveCategorizedData();
  renderWizardOrderPills();
  renderCurrentWizardOrder();
  renderPrintView();
}

function applyCategoryToCurrentOrder() {
  const select = document.getElementById('quickAssignSelect');
  const catId = select.value;
  if (!catId) {
    showToast('Please select a department first', 'error');
    return;
  }
  const order = state.orders[state.currentWizardIndex];
  if (!order) return;

  if (!state.categorized.assignments || Array.isArray(state.categorized.assignments)) {
    state.categorized.assignments = {};
  }

  if (order.doors) {
    order.doors.forEach((door, idx) => {
      const key = getItemKey(order.id, door, idx, false);
      state.categorized.assignments[key] = catId;
    });
  }
  if (order.wpcFrames) {
    order.wpcFrames.forEach((frame, idx) => {
      const key = getItemKey(order.id, frame, idx, true);
      state.categorized.assignments[key] = catId;
    });
  }

  saveCategorizedData();
  renderWizardOrderPills();
  renderCurrentWizardOrder();
  renderPrintView();
  showToast(`Applied department to all items in ${order.id}`, 'success');
}

function updateWizardValidationState(unassignedCount, totalItemsInOrder) {
  const indicator = document.getElementById('wizardValidationIndicator');
  const icon = document.getElementById('validationIcon');
  const msg = document.getElementById('validationMessage');
  const btnNext = document.getElementById('btnNextOrder');

  if (unassignedCount > 0) {
    indicator.className = 'validation-indicator pending';
    icon.textContent = '⚠️';
    msg.textContent = `${unassignedCount} of ${totalItemsInOrder} line-items still uncategorized in this order. Please assign all to proceed.`;
    // Prevent moving forward if any item remains unassigned
    btnNext.disabled = true;
    btnNext.title = 'Assign all items in this order before proceeding';
  } else {
    indicator.className = 'validation-indicator ready';
    icon.textContent = '✅';
    msg.textContent = `All items in this order have been categorized! You can proceed to the next order.`;
    btnNext.disabled = false;
    btnNext.title = 'Proceed to next order';
  }
}

function navigateWizard(direction) {
  const newIndex = state.currentWizardIndex + direction;
  if (newIndex >= 0 && newIndex < state.orders.length) {
    state.currentWizardIndex = newIndex;
    renderWizardOrderPills();
    renderCurrentWizardOrder();
    window.scrollTo({ top: 180, behavior: 'smooth' });
  } else if (newIndex >= state.orders.length) {
    finishWizardAndPrint();
  }
}

function finishWizardAndPrint() {
  switchView('print');
  showToast('Orders categorized! Review and print production slips below.', 'success');
}

// ============================================================================
// VIEW 3: A4 SLIPS & PRINT RENDERING (EXACT REPLICA OF USER REFERENCE IMAGE)
// ============================================================================
function updateSlipDate() {
  const picker = document.getElementById('slipDatePicker');
  if (picker && picker.value) {
    state.slipDate = picker.value;
    renderPrintView();
  }
}

function renderPrintView() {
  renderPrintFilterPills();
  renderA4Slips();
}

function renderPrintFilterPills() {
  const container = document.getElementById('printCategoryFilterPills');
  if (!container) return;
  container.innerHTML = '';

  // Calculate detailed counts per department (doors count and frames count)
  const deptDoorCounts = {};
  const deptFrameCounts = {};
  let totalAssignedDoors = 0;
  let totalAssignedFrames = 0;

  state.orders.forEach(order => {
    // Count doors
    if (order.doors) {
      order.doors.forEach((door, idx) => {
        const key = getItemKey(order.id, door, idx, false);
        const catId = state.categorized.assignments[key];
        const qty = Number(door.quantity) || 0;
        if (catId) {
          deptDoorCounts[catId] = (deptDoorCounts[catId] || 0) + qty;
          totalAssignedDoors += qty;
        }
      });
    }
    // Count frames
    if (order.wpcFrames) {
      order.wpcFrames.forEach((frame, idx) => {
        const key = getItemKey(order.id, frame, idx, true);
        const catId = state.categorized.assignments[key];
        const qty = Number(frame.quantity) || 0;
        if (catId) {
          deptFrameCounts[catId] = (deptFrameCounts[catId] || 0) + qty;
          totalAssignedFrames += qty;
        }
      });
    }
  });

  const totalAllAssigned = totalAssignedDoors + totalAssignedFrames;

  // Identify departments that currently have assigned items
  const activeDepartments = state.categories.filter(cat => {
    const dCount = deptDoorCounts[cat.id] || 0;
    const fCount = deptFrameCounts[cat.id] || 0;
    return (dCount + fCount) > 0;
  });

  if (totalAllAssigned === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.cssText = 'font-size: 0.85rem; color: #b45309; background: #fffbeb; padding: 6px 14px; border-radius: 6px; border: 1px solid #fde68a; display: flex; align-items: center; gap: 8px; font-weight: 600;';
    emptyNotice.innerHTML = '<span>⚠️ No door orders assigned to departments yet. Go to 1-by-1 Categorizer to assign doors & frames.</span>';
    container.appendChild(emptyNotice);
    return;
  }

  // Ensure activeFilterCategoryId is valid
  if (state.activeFilterCategoryId !== 'ALL') {
    const exists = activeDepartments.some(c => c.id === state.activeFilterCategoryId);
    if (!exists) {
      state.activeFilterCategoryId = 'ALL';
    }
  }

  // 1. Master "All Assigned Departments" Button
  const allBtn = document.createElement('button');
  allBtn.className = `category-filter-pill ${state.activeFilterCategoryId === 'ALL' ? 'active' : ''}`;
  let allCountText = `${totalAssignedDoors} Doors`;
  if (totalAssignedFrames > 0) {
    allCountText = `${totalAssignedDoors} Doors + ${totalAssignedFrames} Frames`;
  }
  allBtn.innerHTML = `
    <span>🏢 All Assigned Departments</span>
    <span class="pill-count" style="font-weight: 800;">${allCountText} • ${activeDepartments.length} Dept Slips</span>
  `;
  allBtn.onclick = () => {
    state.activeFilterCategoryId = 'ALL';
    renderPrintView();
  };
  container.appendChild(allBtn);

  // 2. Individual Department Buttons with exact Door / Frame Counting
  activeDepartments.forEach(cat => {
    const dCount = deptDoorCounts[cat.id] || 0;
    const fCount = deptFrameCounts[cat.id] || 0;
    const isFrameCat = cat.id === 'cat-wpc-frame' || cat.name.toLowerCase().includes('frame');

    let countText = '';
    if (dCount > 0 && fCount > 0) {
      countText = `${dCount} Doors + ${fCount} Frames`;
    } else if (fCount > 0) {
      countText = `${fCount} Frame${fCount > 1 ? 's' : ''}`;
    } else {
      countText = `${dCount} Door${dCount > 1 ? 's' : ''}`;
    }

    const pill = document.createElement('button');
    pill.className = `category-filter-pill ${state.activeFilterCategoryId === cat.id ? 'active' : ''}`;
    pill.innerHTML = `
      <span style="width: 9px; height: 9px; border-radius: 50%; background: ${cat.badgeColor || '#2563eb'};"></span>
      <span>${isFrameCat ? '🪟 ' : '🚪 '}${escapeHtml(cat.name)}</span>
      <span class="pill-count" style="font-weight: 800;">${countText}</span>
    `;
    pill.onclick = () => {
      state.activeFilterCategoryId = cat.id;
      renderPrintView();
    };
    container.appendChild(pill);
  });
}

/**
 * Calculates cross-department coordination breakdown for an order
 * Identifies other items in the same order belonging to other departments/categories
 */
function getOrderCrossDeptSummary(order, currentItemCategoryId) {
  if (!order) {
    return {
      html: '<span class="cross-dept-pill none" style="color: #000000; font-weight: 600;">— Single Dept</span>',
      hasOther: false,
      summaryText: ''
    };
  }

  const otherDepts = {};

  // 1. Inspect doors in the same order
  if (order.doors && Array.isArray(order.doors)) {
    order.doors.forEach((door, idx) => {
      const key = getItemKey(order.id, door, idx, false);
      const catId = state.categorized.assignments[key];
      // Only include items that are assigned to a DIFFERENT department
      if (catId && catId !== currentItemCategoryId) {
        const cat = state.categories.find(c => c.id === catId);
        const catName = cat ? cat.name : 'Other Door';
        const qty = Number(door.quantity) || 1;
        otherDepts[catName] = (otherDepts[catName] || 0) + qty;
      }
    });
  }

  // 2. Inspect WPC frames in the same order
  if (order.wpcFrames && Array.isArray(order.wpcFrames)) {
    order.wpcFrames.forEach((frame, idx) => {
      const key = getItemKey(order.id, frame, idx, true);
      const catId = state.categorized.assignments[key];
      // Only include frames that are assigned to a DIFFERENT department
      if (catId && catId !== currentItemCategoryId) {
        const cat = state.categories.find(c => c.id === catId);
        const catName = cat ? cat.name : 'WPC Frame';
        const qty = Number(frame.quantity) || 1;
        otherDepts[catName] = (otherDepts[catName] || 0) + qty;
      }
    });
  }

  const entries = Object.entries(otherDepts);
  if (entries.length === 0) {
    return {
      html: '<span class="cross-dept-pill none" style="color: #000000; font-size: 0.67rem; font-weight: 600;">— Single Dept</span>',
      hasOther: false,
      summaryText: ''
    };
  }

  // Example summary: "2 Laminate Door, 15 WPC Frame"
  const summaryText = entries
    .map(([name, qty]) => `${qty} ${name}`)
    .join(', ');

  const html = `
    <div class="cross-dept-container">
      <span class="cross-dept-pill" style="color: #000000; border: 1.5px solid #000000; background: #ffffff;" title="Order ${escapeHtml(order.id)} also includes ${escapeHtml(summaryText)}. Coordinate packing & dispatch!">
        ⚡ Order with other: <strong>${escapeHtml(summaryText)}</strong>
      </span>
    </div>
  `;

  return {
    html: html,
    hasOther: true,
    summaryText: summaryText
  };
}

/**
 * Builds flattened item list for a given category (or ALL)
 * Includes cross-department coordination metadata for each item
 */
function getItemsForCategory(categoryId) {
  const items = [];
  state.orders.forEach(order => {
    // 1. Process Door items
    if (order.doors) {
      order.doors.forEach((door, idx) => {
        const key = getItemKey(order.id, door, idx, false);
        const assignedCatId = state.categorized.assignments[key];

        // Only include if assigned, and matches categoryId (or categoryId === 'ALL')
        if (assignedCatId && (categoryId === 'ALL' || assignedCatId === categoryId)) {
          const cat = state.categories.find(c => c.id === assignedCatId);
          // Calculate cross-department summary for this order relative to this door's department
          const crossDept = getOrderCrossDeptSummary(order, assignedCatId);

          items.push({
            orderId: order.id || order.orderNumber,
            partyName: order.partyName || '-',
            dimensions: door.dimensions || `${door.height}" × ${door.width}"`,
            designNo: door.designNo || '—',
            flushDoorType: door.flushDoorType || '—',
            doorType: door.doorType || (cat ? cat.name : '—'),
            thickness: door.thickness || '30 MM',
            quantity: Number(door.quantity) || 1,
            notes: door.notes || '—',
            categoryName: cat ? cat.name : 'Uncategorized',
            categoryId: assignedCatId,
            isFrame: false,
            crossDeptHtml: crossDept.html,
            hasOtherDepts: crossDept.hasOther,
            crossDeptSummary: crossDept.summaryText
          });
        }
      });
    }

    // 2. Process WPC Frame items
    if (order.wpcFrames) {
      order.wpcFrames.forEach((frame, idx) => {
        const key = getItemKey(order.id, frame, idx, true);
        const assignedCatId = state.categorized.assignments[key];

        // Only include if assigned, and matches categoryId (or categoryId === 'ALL')
        if (assignedCatId && (categoryId === 'ALL' || assignedCatId === categoryId)) {
          const cat = state.categories.find(c => c.id === assignedCatId);
          // Calculate cross-department summary for this order relative to this frame's department
          const crossDept = getOrderCrossDeptSummary(order, assignedCatId);

          items.push({
            orderId: order.id || order.orderNumber,
            partyName: order.partyName || '-',
            dimensions: frame.dimensions || `${frame.section} × ${frame.lengthFeet} ft`,
            designNo: '—',
            flushDoorType: `${frame.section || 'WPC'} FRAME`,
            doorType: frame.frameType || 'WPC FRAME',
            thickness: '—',
            quantity: Number(frame.quantity) || 1,
            notes: frame.notes ? `${frame.notes} (FRAME)` : 'WPC FRAME',
            categoryName: cat ? cat.name : 'WPC Frame',
            categoryId: assignedCatId,
            isFrame: true,
            crossDeptHtml: crossDept.html,
            hasOtherDepts: crossDept.hasOther,
            crossDeptSummary: crossDept.summaryText
          });
        }
      });
    }
  });
  return items;
}

/**
 * Generates an A4 Production Slip HTML element matching the exact layout
 * of the user's reference image, with the 11th Cross-Dept Co-ordination column
 */
function buildA4SlipHtml(categoryTitle, itemsList, badgeTextOverride = null) {
  if (itemsList.length === 0) {
    return `
      <div class="a4-sheet" style="padding: 40px; text-align: center;">
        <h3 style="color: #000000; font-weight: 800;">No production door or frame orders found for "${escapeHtml(categoryTitle)}"</h3>
        <p style="color: #000000; font-size: 0.85rem; margin-top: 8px; font-weight: 600;">Use the 1-by-1 Categorizer to assign items to this department.</p>
      </div>
    `;
  }

  // Calculate aggregates
  const uniqueOrders = new Set(itemsList.map(i => i.orderId)).size;
  const uniqueParties = Array.from(new Set(itemsList.map(i => i.partyName).filter(Boolean)));
  const totalDoors = itemsList.filter(i => !i.isFrame).reduce((sum, i) => sum + i.quantity, 0);
  const totalFrames = itemsList.filter(i => i.isFrame).reduce((sum, i) => sum + i.quantity, 0);
  const totalAllItems = totalDoors + totalFrames;
  const lineItemsCount = itemsList.length;

  const partiesString = uniqueParties.join(', ');
  const displayDate = formatDisplayDate(state.slipDate);

  // Badge text: e.g. "LAMINATE DOOR ORDER LIST"
  let badgeText = badgeTextOverride;
  if (!badgeText) {
    const isOrderListAlready = categoryTitle.toLowerCase().includes('order');
    badgeText = isOrderListAlready 
      ? categoryTitle.toUpperCase()
      : `${categoryTitle.toUpperCase()} ORDER LIST`;
  }

  // Stats summary text
  let statsSummaryText = '';
  if (totalDoors > 0 && totalFrames > 0) {
    statsSummaryText = `${uniqueOrders} Orders • ${uniqueParties.length} Parties • ${totalDoors} Doors • ${totalFrames} Frames`;
  } else if (totalFrames > 0) {
    statsSummaryText = `${uniqueOrders} Orders • ${uniqueParties.length} Parties • ${totalFrames} Frames`;
  } else {
    statsSummaryText = `${uniqueOrders} Orders • ${uniqueParties.length} Parties • ${totalDoors} Doors`;
  }

  let rowsHtml = '';
  itemsList.forEach((item, index) => {
    const sizeDisplay = item.isFrame
      ? `${escapeHtml(item.dimensions)} <span style="font-size:0.62rem; background:#ffffff; color:#000000; padding:1px 4px; border-radius:3px; font-weight:800; border:1.5px solid #000000;">FRAME</span>`
      : escapeHtml(item.dimensions);

    const qtyClass = 'col-qty';

    rowsHtml += `
      <tr>
        <td class="col-idx">${index + 1}</td>
        <td class="col-order-id">${escapeHtml(item.orderId)}</td>
        <td class="col-party">
          <div class="slip-party-name">${escapeHtml(item.partyName)}</div>
        </td>
        <td class="col-size">${sizeDisplay}</td>
        <td class="col-design">${escapeHtml(item.designNo)}</td>
        <td class="col-flush">${escapeHtml(item.flushDoorType)}</td>
        <td class="col-type">${escapeHtml(item.doorType)}</td>
        <td class="col-thk">${escapeHtml(item.thickness)}</td>
        <td class="${qtyClass}">${item.quantity}</td>
        <td class="col-notes">${escapeHtml(item.notes)}</td>
        <td class="col-cross-dept">${item.crossDeptHtml}</td>
      </tr>
    `;
  });

  return `
    <div class="a4-sheet">
      <!-- 1. Header with Logo, Company Details, Department Title and Date -->
      <div class="slip-header">
        <div class="slip-header-left">
          <div class="slip-company-row">
            <div class="slip-door-icon">
              <!-- Replicating door icon in reference image in solid black -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="3" width="16" height="18" rx="1"></rect>
                <line x1="8" y1="3" x2="8" y2="21"></line>
                <circle cx="14" cy="12" r="1" fill="#000000"></circle>
              </svg>
            </div>
            <div class="slip-company-name">${escapeHtml(state.company.companyName)}</div>
          </div>
          <div class="slip-company-details">
            ${escapeHtml(state.company.address)} • Ph: ${escapeHtml(state.company.phone)} • GSTIN: ${escapeHtml(state.company.gstin)}
          </div>
        </div>

        <div class="slip-header-right">
          <div class="slip-header-top-row">
            <div class="slip-badge">${escapeHtml(badgeText)}</div>
            <div class="slip-header-date-badge">
              Date: <strong>${escapeHtml(displayDate)}</strong>
            </div>
          </div>
          <div class="slip-stats-summary">${statsSummaryText}</div>
        </div>
      </div>

      <!-- 2. Secondary Bar (Parties Included & Date) -->
      <div class="slip-secondary-bar">
        <div class="parties-list-text" title="${escapeHtml(partiesString)}">
          <strong>Parties Included:</strong> ${escapeHtml(partiesString)}
        </div>
        <div class="slip-date-doors">
          Date: <strong>${escapeHtml(displayDate)}</strong> • Total Doors: <span class="total-highlight">${totalDoors}</span>${totalFrames > 0 ? ` • Total Frames: <span class="total-highlight">${totalFrames}</span>` : ''}
        </div>
      </div>

      <!-- 3. Production Table with 11 Columns matching Exact Reference Layout -->
      <table class="slip-table">
        <thead>
          <tr>
            <th class="col-idx">#</th>
            <th class="col-order-id">Order ID</th>
            <th class="col-party">Party / Client</th>
            <th class="col-size">Size (H×W)</th>
            <th class="col-design">Design No</th>
            <th class="col-flush">Flush Type</th>
            <th class="col-type">Door / Frame Type</th>
            <th class="col-thk">Thk</th>
            <th class="col-qty" style="text-align: center;">Qty</th>
            <th class="col-notes">Instructions / Notes</th>
            <th class="col-cross-dept" style="min-width: 155px;">Cross-Dept Co-ordination</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- 4. Grand Total Summary Footer -->
      <div class="slip-footer-bar">
        <div class="grand-total-text">
          GRAND TOTAL QUANTITY TO MANUFACTURE: <span class="grand-total-qty">${totalAllItems}${totalFrames > 0 ? ` (${totalDoors} Doors + ${totalFrames} Frames)` : ''}</span>
        </div>
        <div class="grand-total-summary">
          ${lineItemsCount} line-items across ${uniqueParties.length} parties
        </div>
      </div>
    </div>
  `;
}

function renderA4Slips() {
  const container = document.getElementById('a4SlipsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (state.activeFilterCategoryId === 'ALL') {
    // Render department-wise separate slips for every active department
    let multiSlipHtml = '';
    let activeDepts = 0;

    state.categories.forEach(cat => {
      const catItems = getItemsForCategory(cat.id);
      if (catItems.length > 0) {
        activeDepts++;
        const isOrderListAlready = cat.name.toLowerCase().includes('order');
        const deptTitle = isOrderListAlready
          ? cat.name.toUpperCase()
          : `${cat.name.toUpperCase()} ORDER LIST`;
        multiSlipHtml += buildA4SlipHtml(cat.name, catItems, deptTitle);
      }
    });

    if (activeDepts === 0) {
      container.innerHTML = `
        <div class="a4-sheet" style="padding: 40px; text-align: center;">
          <h3 style="color: #000000; font-weight: 800;">No department orders assigned yet</h3>
          <p style="color: #000000; font-size: 0.85rem; margin-top: 8px; font-weight: 600;">Please go to the 1-by-1 Categorizer to assign doors and frames to departments.</p>
          <button class="btn btn-primary" onclick="switchView('wizard')" style="margin-top: 14px;">Open 1-by-1 Categorizer ✏️</button>
        </div>
      `;
    } else {
      container.innerHTML = multiSlipHtml;
    }
  } else {
    // Single Selected Department Slip
    const cat = state.categories.find(c => c.id === state.activeFilterCategoryId);
    const catName = cat ? cat.name : 'Production Department';
    const catItems = getItemsForCategory(state.activeFilterCategoryId);
    const isOrderListAlready = catName.toLowerCase().includes('order');
    const deptTitle = isOrderListAlready
      ? catName.toUpperCase()
      : `${catName.toUpperCase()} ORDER LIST`;
    container.innerHTML = buildA4SlipHtml(catName, catItems, deptTitle);
  }
}

// Print currently active slip
function printActiveSlip() {
  window.print();
}

// Print all categorized department slips (each on its own separate A4 page)
function printAllSlips() {
  const container = document.getElementById('a4SlipsContainer');
  if (!container) return;

  // Build separate slips for every department that has at least 1 item
  let multiSlipHtml = '';
  let activeCategoriesFound = 0;

  state.categories.forEach(cat => {
    const items = getItemsForCategory(cat.id);
    if (items.length > 0) {
      activeCategoriesFound++;
      const isDeptAlready = cat.name.toLowerCase().includes('dept') || cat.name.toLowerCase().includes('department');
      const deptTitle = isDeptAlready
        ? `${cat.name.toUpperCase()} PRODUCTION SLIP`
        : `${cat.name.toUpperCase()} DEPARTMENT PRODUCTION SLIP`;
      multiSlipHtml += buildA4SlipHtml(cat.name, items, deptTitle);
    }
  });

  if (activeCategoriesFound === 0) {
    showToast('No categorized items to print yet. Please categorize orders first.', 'error');
    return;
  }

  // Set multi-slip in container temporarily and trigger print
  const originalHtml = container.innerHTML;
  container.innerHTML = multiSlipHtml;

  // Trigger print
  setTimeout(() => {
    window.print();
    // Restore previous view after print dialog closes
    setTimeout(() => {
      renderPrintView();
    }, 1000);
  }, 200);
}

// ============================================================================
// MODAL: CATEGORY MANAGER
// ============================================================================
function openCategoryModal() {
  renderCategoryManagerList();
  document.getElementById('modalCategoryManager').classList.add('open');
}

function closeCategoryModal() {
  document.getElementById('modalCategoryManager').classList.remove('open');
}

function renderCategoryManagerList() {
  const container = document.getElementById('categoryManagerList');
  if (!container) return;
  container.innerHTML = '';

  state.categories.forEach((cat, idx) => {
    const div = document.createElement('div');
    div.className = 'category-pill-item';
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 14px; height: 14px; border-radius: 4px; background: ${cat.badgeColor || '#2563eb'};"></span>
        <strong style="font-size: 0.85rem;">${escapeHtml(cat.name)}</strong>
        <span style="font-size: 0.72rem; color: #64748b;">(${cat.keywords ? cat.keywords.join(', ') : 'no keywords'})</span>
      </div>
      <button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="deleteCategory('${cat.id}')">
        Delete
      </button>
    `;
    container.appendChild(div);
  });
}

function addNewCategory() {
  const nameInput = document.getElementById('newCategoryName');
  const colorInput = document.getElementById('newCategoryColor');
  const kwInput = document.getElementById('newCategoryKeywords');

  const name = nameInput.value.trim();
  if (!name) {
    showToast('Please enter a category name', 'error');
    return;
  }

  const id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const keywords = kwInput.value.split(',').map(k => k.trim()).filter(Boolean);

  state.categories.push({
    id: id,
    name: name,
    slug: id,
    badgeColor: colorInput.value || '#2563eb',
    keywords: keywords
  });

  nameInput.value = '';
  kwInput.value = '';

  saveCategoriesData();
  renderCategoryManagerList();
  renderCurrentWizardOrder();
  renderPrintView();
  showToast(`Added new category: ${name}`, 'success');
}

function deleteCategory(categoryId) {
  if (state.categories.length <= 1) {
    showToast('Cannot delete the only remaining category', 'error');
    return;
  }
  if (!confirm('Are you sure you want to delete this category? Any items assigned to it will become uncategorized.')) {
    return;
  }

  state.categories = state.categories.filter(c => c.id !== categoryId);

  // Clean up assignments
  Object.keys(state.categorized.assignments).forEach(key => {
    if (state.categorized.assignments[key] === categoryId) {
      delete state.categorized.assignments[key];
    }
  });

  saveCategoriesData();
  saveCategorizedData();
  renderCategoryManagerList();
  renderOrdersOverview();
  renderWizardOrderPills();
  renderCurrentWizardOrder();
  renderPrintView();
  showToast('Category deleted', 'info');
}

// ============================================================================
// MODAL: COMPANY PROFILE
// ============================================================================
function openCompanyModal() {
  document.getElementById('companyInputName').value = state.company.companyName || '';
  document.getElementById('companyInputAddress').value = state.company.address || '';
  document.getElementById('companyInputPhone').value = state.company.phone || '';
  document.getElementById('companyInputGstin').value = state.company.gstin || '';
  document.getElementById('modalCompanySettings').classList.add('open');
}

function closeCompanyModal() {
  document.getElementById('modalCompanySettings').classList.remove('open');
}

function saveCompanySettings() {
  state.company.companyName = document.getElementById('companyInputName').value.trim() || 'Ravikanta Doors';
  state.company.address = document.getElementById('companyInputAddress').value.trim() || '';
  state.company.phone = document.getElementById('companyInputPhone').value.trim() || '';
  state.company.gstin = document.getElementById('companyInputGstin').value.trim() || '';

  saveCompanyData();
  updateHeaderUI();
  renderPrintView();
  closeCompanyModal();
}

// ============================================================================
// MODAL: IMPORT ORDERS JSON
// ============================================================================
function openImportModal() {
  document.getElementById('modalImportJson').classList.add('open');
}

function closeImportModal() {
  document.getElementById('modalImportJson').classList.remove('open');
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      processImportedOrders(parsed);
    } catch (err) {
      showToast('Invalid JSON file format', 'error');
    }
  };
  reader.readAsText(file);
}

function submitPastedJson() {
  const text = document.getElementById('jsonPasteInput').value.trim();
  if (!text) {
    showToast('Please paste JSON data first', 'error');
    return;
  }
  try {
    const parsed = JSON.parse(text);
    processImportedOrders(parsed);
  } catch (err) {
    showToast('Failed to parse JSON. Please check syntax.', 'error');
  }
}

async function processImportedOrders(parsedData) {
  const orderArray = Array.isArray(parsedData) ? parsedData : (parsedData.orders || [parsedData]);
  if (!Array.isArray(orderArray) || orderArray.length === 0) {
    showToast('No orders found in JSON', 'error');
    return;
  }

  state.orders = orderArray;
  // Clear previous categorizations for fresh import
  state.categorized = { assignments: {} };
  state.currentWizardIndex = 0;

  // Persist to server
  await apiRequest('save_orders', 'POST', { orders: state.orders });
  autoDetectInitialAssignments();

  closeImportModal();
  renderOrdersOverview();
  renderWizardOrderPills();
  renderCurrentWizardOrder();
  renderPrintView();
  showToast(`Successfully imported ${state.orders.length} orders!`, 'success');
}

// ============================================================================
// TOAST NOTIFICATION UTILITY
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// INITIALIZATION ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
});
