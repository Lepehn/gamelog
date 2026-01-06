/* ---------- configuration ---------- */
const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];
const YEAR_START = 1980;
const YEAR_END = new Date().getFullYear();

/* ---------- storage ---------- */
const gameData = JSON.parse(localStorage.getItem('gameData')) || { prefix: 'gameBacklog', epic: [], nintendo: [], playstation: [], steam: [], xbox: [], wishlist: [] };
function saveGames(){ localStorage.setItem('gameData', JSON.stringify(gameData)); }

/* ---------- helpers ---------- */
function escapeHtml(str){
  return String(str || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function makeMonthOptions(selectedMonth) {
  let opts = `<option value="">Month</option>`;
  MONTHS.forEach(m => {
    opts += `<option value="${m}" ${m===selectedMonth ? 'selected' : ''}>${m}</option>`;
  });
  return opts;
}

function makeYearOptions(selectedYear) {
  let opts = `<option value="">Year</option>`;
  for (let y = YEAR_END; y >= YEAR_START; --y) {
    opts += `<option value="${y}" ${String(y)===String(selectedYear) ? 'selected' : ''}>${y}</option>`;
  }
  return opts;
}

/*----------- stats ----------*/
let statusChart, platformChart, yearChart, monthChart;

function updateStats() {
  const statusCount = { Completed:0, InProgress:0, NotStarted:0, OnHold:0, Hundred:0};
  const platformCount = {};
  const yearCount = {};
  const monthCount = {};
  
  Object.keys(gameData).forEach(platform=>{
    if(platform==='prefix') return;
    platformCount[platform] = gameData[platform].length || 0;
    gameData[platform].forEach(g=>{
      statusCount[g.status] = (statusCount[g.status]||0)+1;
      if(g.year) yearCount[g.year] = (yearCount[g.year]||0)+1;
      if(g.month) monthCount[g.month] = (monthCount[g.month]||0)+1;
    });
  });

  const statusLabels = Object.keys(statusCount).map(label =>
  label === "Hundred" ? "100%" : label
);
  const statusValues = Object.values(statusCount);

  const platformLabels = Object.keys(platformCount);
  const platformValues = Object.values(platformCount);

  const yearLabels = Object.keys(yearCount).sort((a,b)=>b-a);
  const yearValues = yearLabels.map(y=>yearCount[y]);

  const MONTHS_FULL =["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const currentYear = new Date().getFullYear().toString();
  document.getElementById("currentYear").textContent = `(${new Date().getFullYear()})`;

  const monthValues = MONTHS_SHORT.map(short => {
    let count = 0;

    Object.keys(gameData).forEach(platform => {
      if(platform === 'prefix') return;

      gameData[platform].forEach(g => {
        if (g.year === currentYear && g.month === short) {
          count++;
        }
      });
    });

    return count;
  });
  
  const monthLabels = MONTHS_FULL; // Add this line before creating monthChart

  // Destroy previous charts if they exist
  if(statusChart) statusChart.destroy();
  if(platformChart) platformChart.destroy();
  if(yearChart) yearChart.destroy();
  if(monthChart) monthChart.destroy();

  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  const ctxPlatform = document.getElementById('platformChart').getContext('2d');
  const ctxYear = document.getElementById('yearChart').getContext('2d');
  const ctxMonth = document.getElementById('monthChart').getContext('2d');
  
  const cardInlay = getComputedStyle(document.documentElement).getPropertyValue('--card-inlay').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
  
  Chart.defaults.color = textColor;
  
  statusChart = new Chart(ctxStatus, {
    type:'doughnut',
    data:{ labels:statusLabels, datasets:[{ data:statusValues, backgroundColor:['#278041','#1177a3','#616161','#a62327', '#689a2e'] }]},
    options:{ responsive:true, plugins:{ legend:{ position:'right' } } }
  });

  platformChart = new Chart(ctxPlatform, {
    type:'doughnut',
    data:{ labels:platformLabels, datasets:[{ data:platformValues, backgroundColor:['#ff5722','#2196f3','#4caf50','#9c27b0','#00bcd4'] }]},
    options:{ responsive:true, plugins:{ legend:{ position:'right' } } }
  });

  yearChart = new Chart(ctxYear, {
  type: 'bar',
  data: { labels: yearLabels, datasets: [{ label: 'Games', data: yearValues, backgroundColor: '#1177a3' }]},
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0, callback: value => Number.isInteger(value) ? value : null }, grid: { color: gridColor }}, x: { grid: { color: gridColor } } } },
  plugins: [{ beforeDraw: (chart) => { const ctx = chart.ctx; ctx.save(); ctx.fillStyle = cardInlay; ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore(); } } ]
  });

  monthChart = new Chart(ctxMonth, {
    type: 'bar',
    data: { labels: monthLabels, datasets: [{ label: 'Games', data: monthValues, backgroundColor: '#1177a3' }]},
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0, callback: value => Number.isInteger(value) ? value : null }, grid: { color: gridColor }}, x: { grid: { color: gridColor } } } },
    plugins: [{ beforeDraw: (chart) => { const ctx = chart.ctx; ctx.save(); ctx.fillStyle = cardInlay; ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore(); } } ]
    });
 }

/* ---------- update UI ---------- */
function updateUI() {
  const tbody = document.querySelector('#gamesTable tbody');
  const recentList = document.getElementById('recentlyPlayed');
  const inProgressList = document.getElementById('inProgress');
  const summaryBox = document.getElementById('summary');
  const completionText = document.getElementById('completionText');
  const completionBar = document.getElementById('completionBar');
  const completionTextStats = document.getElementById('completionTextStats');
  const completionBarStats = document.getElementById('completionBarStats');

  // clear old content
  tbody.innerHTML = '';
  recentList.innerHTML = '';
  inProgressList.innerHTML = '';
  summaryBox.innerHTML = '';

  let totalGames = 0;
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  let onHold = 0;
  let hundred = 0;

  // prebuild month/year options for reuse
  const monthOptionsHTML = makeMonthOptions('');
  const yearOptionsHTML = makeYearOptions('');

  const tbodyFrag = document.createDocumentFragment();
  const recentFrag = document.createDocumentFragment();
  const inProgressFrag = document.createDocumentFragment();

  Object.keys(gameData).forEach(platform => {
    if (platform === 'prefix'|| platform === 'wishlist') return;

    gameData[platform].forEach((g, index) => {
      totalGames++;

      const month = g.month || '';
      const year = g.year || '';

      // create table row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(g.title)}</td>
        <td>${platform}</td>
        <td>
          <select class="statusSelect status${g.status}" data-platform="${platform}" data-index="${index}">
            <option value="NotStarted" ${g.status==='NotStarted'?'selected':''}>Not Started</option>
            <option value="InProgress" ${g.status==='InProgress'?'selected':''}>In Progress</option>
            <option value="OnHold" ${g.status==='OnHold'?'selected':''}>On Hold</option>
            <option value="Completed" ${g.status==='Completed'?'selected':''}>Completed</option>
            <option value="Hundred" ${g.status==='Hundred'?'selected':''}>100%</option>
          </select>
        </td>
        <td>
          <select class="monthSelect" data-platform="${platform}" data-index="${index}">
            ${makeMonthOptions(month)}
          </select>
        </td>
        <td>
          <select class="yearSelect" data-platform="${platform}" data-index="${index}">
            ${makeYearOptions(year)}
          </select>
        </td>
        <td>
          <span class="button-delete" data-platform="${platform}" data-index="${index}"><span class="material-symbols-outlined">delete</span>
          </span>
        </td>
      `;
      tbodyFrag.appendChild(tr);
      
      // count statuses and append to fragments
      switch(g.status) {
        case 'Completed':
          completed++;
          const recentLi = document.createElement('li');
          recentLi.textContent = month && year ? `${g.title} — ${month} ${year}` : g.title;
          recentFrag.appendChild(recentLi);
          break;
        case 'InProgress':
          inProgress++;
          const inProgressLi = document.createElement('li');
          inProgressLi.textContent = g.title;
          inProgressFrag.appendChild(inProgressLi);
          break;
        case 'NotStarted': notStarted++; break;
        case 'OnHold': onHold++; break;
        case 'Hundred':
          completed++;
          hundred++;
          const recentLi2 = document.createElement('li');
          recentLi2.textContent = month && year ? `${g.title} — ${month} ${year}` : g.title;
          recentFrag.appendChild(recentLi2);
          break;
      }
    });
  });

  // append fragments to DOM in one go
  tbody.appendChild(tbodyFrag);
  recentList.appendChild(recentFrag);
  inProgressList.appendChild(inProgressFrag);
  
  applyFilters();

  // completion bar
  const percent = totalGames ? (completed/totalGames)*100 : 0;
  if(completionBar) completionBar.style.width = percent+'%';
  if(completionText) completionText.textContent = `${completed} / ${totalGames} Completed`;

  if(completionBarStats) completionBarStats.style.width = percent+'%';
  if(completionTextStats) completionTextStats.textContent = `${completed} / ${totalGames} Completed`;

  // summary
  if(summaryBox){
    summaryBox.innerHTML = `
      <li>Total Games: ${totalGames}</li>
      <li>100%: ${hundred}</li>
      <li>Completed: ${completed}</li>
      <li>In Progress: ${inProgress}</li>
      <li>Not Started: ${notStarted}</li>
      <li>On Hold: ${onHold}</li>
    `;
  }
}

// Update Wishlist
function updateWishlistUI() {
  const tbody = document.querySelector('#gamesWishlistTable tbody');
  tbody.innerHTML = '';

  gameData.wishlist.forEach((g, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(g.title)}</td>
      <td>
        <span class="button-delete" data-type="wishlist" data-index="${index}"><span class="material-symbols-outlined">delete</span>
        </span>
      </td>
    `;
    tbody.appendChild(tr);
    applyFiltersWishlist();
  });
}

/* ---------- search -----------*/
function applyFilters() {
  const query = searchInput.value.toLowerCase();
  const tbody = document.querySelector('#gamesTable tbody');

  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    const title = row.cells[0]?.textContent.toLowerCase() || '';
    const platform = row.cells[1]?.textContent.toLowerCase() || '';

    const statusSelect = row.cells[2]?.querySelector('select');
    const monthSelect = row.cells[3]?.querySelector('select');
    const yearSelect = row.cells[4]?.querySelector('select');
    const statusVal = (statusSelect?.value || '').toLowerCase();

    // human-readable aliases
    let statusLabel = statusVal;
    if (statusVal === 'hundred')     statusLabel = '100%';
    if (statusVal === 'inprogress')  statusLabel = 'in progress';
    if (statusVal === 'notstarted')  statusLabel = 'not started';
    if (statusVal === 'onhold')      statusLabel = 'on hold';

    const month = (monthSelect?.value || '').toLowerCase();
    const year = (yearSelect?.value || '').toLowerCase();

    const match =
      !query ||
      title.includes(query) ||
      platform.includes(query) ||
      statusVal.includes(query) ||
      statusLabel.includes(query) ||
      month.includes(query) ||
      year.includes(query);

    row.style.display = match ? '' : 'none';
  });
}

const searchInput = document.getElementById('gameSearch');
searchInput.addEventListener('input', applyFilters);

function applyFiltersWishlist() {
  const query = wishlistSearchInput.value.toLowerCase();
  const tbody = document.querySelector('#gamesWishlistTable tbody');

  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    const title = row.cells[0]?.textContent.toLowerCase() || '';
    const match = !query || title.includes(query);
    row.style.display = match ? '' : 'none';
  });
}

const wishlistSearchInput = document.getElementById('wishlistSearch');
wishlistSearchInput.addEventListener('input', applyFiltersWishlist);

/* ---------- tab handling -----------*/
const dashboardContent = document.getElementById('dashboardContent');
const statsContent = document.getElementById('statsContent');
const wishlistContent = document.getElementById('wishlistContent');

const menuLinks = document.querySelectorAll('.navbar .menu a');
const dashboardLink = [...menuLinks].find(a => a.textContent.trim() === 'Dashboard');
const statsLink = [...menuLinks].find(a => a.textContent.trim() === 'Stats');
const wishlistLink = [...menuLinks].find(a => a.textContent.trim() === 'Wishlist');

function showDashboard() {
  dashboardContent.style.display = 'block';
  statsContent.style.display = 'none';
  wishlistContent.style.display = 'none';
  dashboardLink.classList.add('active');
  statsLink.classList.remove('active');
  wishlistLink.classList.remove('active');
}

function showStats() {
  dashboardContent.style.display = 'none';
  statsContent.style.display = 'block';
  wishlistContent.style.display = 'none';
  statsLink.classList.add('active');
  dashboardLink.classList.remove('active');
  wishlistLink.classList.remove('active');
  updateStats();
}

function showWishlist() {
  dashboardContent.style.display = 'none';
  statsContent.style.display = 'none';
  wishlistContent.style.display = 'block';
  wishlistLink.classList.add('active');
  dashboardLink.classList.remove('active');
  statsLink.classList.remove('active');
  updateWishlistUI();
}

dashboardLink.addEventListener('click', e => { e.preventDefault(); showDashboard(); });
statsLink.addEventListener('click', e => { e.preventDefault(); showStats(); });
wishlistLink.addEventListener('click', e => { e.preventDefault(); showWishlist(); });

/* ---------- table change handling ---------- */
document.getElementById('gamesTable').addEventListener('change', e => {
  const sel = e.target.closest('.statusSelect, .monthSelect, .yearSelect');
  if(!sel) return;

  const platform = sel.dataset.platform;
  const idx = Number(sel.dataset.index);
  if(isNaN(idx)) return;

  const g = gameData[platform][idx];

  if(sel.classList.contains('statusSelect')) g.status = sel.value;
  else if(sel.classList.contains('monthSelect')) g.month = sel.value;
  else if(sel.classList.contains('yearSelect')) g.year = sel.value;

  saveGames();
  updateUI();
});

/* ---------- delete handling ---------- */
document.getElementById('gamesTable').addEventListener('click', e => {
  const btn = e.target.closest('.button-delete');
  if(!btn) return;

  const platform = btn.dataset.platform;
  const idx = Number(btn.dataset.index);
  if(isNaN(idx)) return;

  gameData[platform].splice(idx,1);
  saveGames();
  updateUI();
});

// Delete from wishlist
document.getElementById('gamesWishlistTable').addEventListener('click', e => {
  const btn = e.target.closest('.button-delete');
  if (!btn) return;

  const idx = Number(btn.dataset.index);
  if (isNaN(idx)) return;

  gameData.wishlist.splice(idx, 1);
  saveGames();
  updateWishlistUI();
});

/* ---------- profile handling ---------- */
const profileNameEl = document.querySelector('.navbar .profile span');
const profileAvatarEl = document.querySelector('.navbar .profile div');
const welcomeNameEl = document.getElementById('welcomeName');
const savedProfile = JSON.parse(localStorage.getItem('profileData'));
if (savedProfile) {
  profileNameEl.textContent = savedProfile.name || profileNameEl.textContent;
  profileAvatarEl.style.backgroundImage = savedProfile.avatar || profileAvatarEl.style.backgroundImage;
  welcomeNameEl.textContent = savedProfile.name || welcomeNameEl.textContent;
  const preview = document.getElementById('profilePreview');
  if (preview) preview.style.backgroundImage = savedProfile.avatar || preview.style.backgroundImage;
}

/* ---------- Account Modal Logic ---------- */
const accountModal = document.getElementById('accountModal');
const profileNameInput = document.getElementById('profileNameInput');
const profileImageInput = document.getElementById('profileImageInput');
const profilePreview = document.getElementById('profilePreview');
const saveProfileBtn = document.getElementById('saveProfile');
const closeAccountModal = document.getElementById('closeAccountModal');

// Open account modal
document.querySelector('.navbar .menu a[href="#"]:last-child').addEventListener('click', () => {
  profileNameInput.value = profileNameEl.textContent;
  accountModal.style.display = 'flex';
});

// Preview new image
profileImageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    profilePreview.style.backgroundImage = `url('${ev.target.result}')`;
  };
  reader.readAsDataURL(file);
});

// Save profile changes
saveProfileBtn.addEventListener('click', () => {
  const newName = profileNameInput.value.trim() || profileNameEl.textContent;
  const newAvatar = profilePreview.style.backgroundImage || profileAvatarEl.style.backgroundImage;

  profileNameEl.textContent = newName;
  profileAvatarEl.style.backgroundImage = newAvatar;
  welcomeNameEl.textContent = newName;

  localStorage.setItem('profileData', JSON.stringify({ name: newName, avatar: newAvatar }));
  accountModal.style.display = 'none';
});

// Close modal
closeAccountModal.addEventListener('click', () => accountModal.style.display = 'none');
accountModal.addEventListener('click', e => {
  if (e.target === accountModal) accountModal.style.display = 'none';
});

/* ---------- add game modal ---------- */
const modal = document.getElementById('addGameModal');
const openAddWishlistGameBtn = document.getElementById("openAddWishlistGame");
const openBtn = document.getElementById('openAddGame');
const closeBtn = document.getElementById('closeModal');
const confirmAdd = document.getElementById('confirmAddGame');
const modalName = document.getElementById('modalGameName');
const modalPlatform = document.getElementById('modalGamePlatform');
const modalStatus = document.getElementById('modalGameStatus');
const modalMonth = document.getElementById('modalGameMonth');
const modalYear = document.getElementById('modalGameYear');

let addingToWishlist = false;

modalMonth.innerHTML = makeMonthOptions('');
modalYear.innerHTML = makeYearOptions('');

openBtn.addEventListener('click', () => {
  addingToWishlist = false;
  modal.style.display = 'flex';
  modalName.value = '';
  modalPlatform.value = '';
  modalStatus.value = 'NotStarted';
  modalMonth.value = '';
  modalYear.value = '';
  modalPlatform.style.display = 'inline-block';
  modalStatus.style.display = 'inline-block';
  modalMonth.style.display = 'inline-block';
  modalYear.style.display = 'inline-block';
});

openAddWishlistGameBtn.addEventListener("click", () => {
  addingToWishlist = true;
  modal.style.display = "flex";
  modalName.value = '';
  modalPlatform.value = '';
  modalPlatform.style.display = 'none';
  modalStatus.style.display = 'none';
  modalMonth.style.display = 'none';
  modalYear.style.display = 'none';
});

closeBtn.addEventListener('click', () => modal.style.display = 'none');
modal.addEventListener('click', e => { if(e.target === modal) modal.style.display='none'; });

confirmAdd.addEventListener('click', () => {
  const name = modalName.value.trim();
  const platform = modalPlatform.value.trim();
  if (!name) return;
  if (!addingToWishlist && !platform) return;

if (addingToWishlist) {
  if (!gameData.wishlist) gameData.wishlist = [];
  gameData.wishlist.push({ title: name });
  saveGames();
  updateWishlistUI();
} else {
    const status = modalStatus.value;
    const month = modalMonth.value;
    const year = modalYear.value;
    gameData[platform.toLowerCase()].push({
      title: name, status, month, year
    });
    saveGames();
    updateUI();
  }

  modal.style.display = "none";
  addingToWishlist = false; // reset after adding
});

/* ---------- import/export ---------- */
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importJSON');
const exportBtn = document.getElementById('exportBtn');

importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', function(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    try{
      const data = JSON.parse(ev.target.result);
      ['epic','nintendo','playstation','steam','xbox', 'wishlist'].forEach(platform => {
        if(Array.isArray(data[platform])){
          data[platform].forEach(game => {
            const exists = gameData[platform]?.some(g=> g.title===game.title && g.month===game.month && g.year===game.year);
            if(!exists){
              if(!gameData[platform]) gameData[platform] = [];
              gameData[platform].push({
                title: game.title,
                status: game.status || 'NotStarted',
                month: game.month || '',
                year: game.year || ''
              });
            }
          });
        }
      });
      saveGames();
      updateUI();
    }catch(err){
      console.error(err);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

exportBtn.addEventListener('click', ()=>{
  const exportData = { prefix:'gameBacklog', epic:[], nintendo:[], playstation:[], steam:[], xbox:[], wishlist:[] };
  ['epic','nintendo','playstation','steam','xbox', 'wishlist'].forEach(platform=>{
    if(gameData[platform]) gameData[platform].forEach(g=>{
      exportData[platform].push({
        title: g.title,
        status: g.status,
        month: g.month || '',
        year: g.year || ''
      });
    });
  });
  const blob = new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download='gameBacklog.json';
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- init ---------- */

updateUI();
