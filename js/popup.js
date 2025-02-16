// /js/popup.js

let background = chrome.extension.getBackgroundPage() || null;

// Predefined scripts for the Custom Script tab
const predefinedScripts = [
  { name: "Search For Panels", filename: "1.js" },
  { name: "Subdomain Finder", filename: "2.js" },
  { name: "Url Search For ?=", filename: "3.js" },
  { name: "Search For Everything/Phone/Mails ++", filename: "4.js" },
  { name: "Fill Login/Signup Any Form Then Run (All Links/++)", filename: "5.js" },
  { name: "Sensetive Data/Make Hidden Elements Show", filename: "6.js" },
  { name: "", filename: "7.js" },
  { name: "", filename: "8.js" },
  { name: "", filename: "9.js" },
  { name: "", filename: "10.js" }
];
// Pagination for the Requests Log
const REQUESTS_PER_PAGE = 30;
let currentRequestPage = 1;
let totalRequestPages = 1;

window.onload = function() {
  // --------------------------------
  // TAB SWITCHING
  // --------------------------------
  document.getElementById("tab-cookies").addEventListener("click", () => showTab("cookies"));
  document.getElementById("tab-requests").addEventListener("click", () => showTab("requests"));
  document.getElementById("tab-extradata").addEventListener("click", () => showTab("extradata"));
  document.getElementById("tab-gencode").addEventListener("click", () => showTab("gencode"));
  document.getElementById("tab-customscript").addEventListener("click", () => showTab("customscript"));
  document.getElementById("tab-archivesearch").addEventListener("click", () => showTab("archivesearch"));

  // Cookies Tab
  document.getElementById("cookiesDomainSelect").addEventListener("change", populateCookiesTable);
  document.getElementById("exportCookiesBtn").addEventListener("click", exportCookiesOnly);

  // Requests Log Tab
  document.getElementById("requestsDomainSelect").addEventListener("change", () => {
    currentRequestPage = 1;
    populateRequestsTable();
  });
  document.getElementById("downloadDomainRequestsBtn").addEventListener("click", downloadSelectedLogs);
  [
    "toggleStatus","toggleUrl","toggleName","toggleCacheControl",
    "toggleServer","toggleUserAgent","toggleCookies","toggleType","toggleSize"
  ].forEach(id => {
    let checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", updateRequestTableVisibility);
    }
  });
  document.getElementById("requestSearchInput").addEventListener("input", filterRequests);
  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentRequestPage > 1) {
      currentRequestPage--;
      populateRequestsTable();
    }
  });
  document.getElementById("nextPageBtn").addEventListener("click", () => {
    if (currentRequestPage < totalRequestPages) {
      currentRequestPage++;
      populateRequestsTable();
    }
  });

  // Extra Data Tab
  [
    "chkPageCookies","chkLocalStorage","chkSessionStorage","chkFormData",
    "chkInputFields","chkHiddenElements","chkLinks","chkImages","chkVideos"
  ].forEach(id => {
    let checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", runExtraDataScript);
    }
  });
  document.getElementById("downloadExtraDataBtn").addEventListener("click", downloadExtraDataResults);

  // Gen cURL Tab
  document.getElementById("advancedModeToggle").addEventListener("change", toggleAdvancedMode);
  document.getElementById("addCommonHeaderBtn").addEventListener("click", addCommonHeader);
  document.getElementById("addQueryParamBtn").addEventListener("click", addQueryParamRow);
  document.getElementById("applyTemplateBtn").addEventListener("click", applySelectedTemplate);
  document.getElementById("generateCurlButton").addEventListener("click", generateCurlCommand);
  document.getElementById("copyCurlButton").addEventListener("click", copyCurlToClipboard);

  if (document.getElementById("curlUrlSelect")) {
    document.getElementById("curlUrlSelect").addEventListener("change", handleCurlUrlSelect);
  }

  // Custom Script Tab
  document.getElementById("runCustomScriptBtn").addEventListener("click", runCustomScript);
  document.getElementById("predefinedScripts").addEventListener("change", loadPredefinedScript);

  // Archive Search Tab - Sub-views (Archive, DNS, IP, PassiveDNS, CertSpotter, OpenPorts)
  document.getElementById("btnArchive").addEventListener("click", () => {
    setActiveArchiveButton("btnArchive");
    activateContainer("containerArchive");
  });
  document.getElementById("btnDNS").addEventListener("click", () => {
    setActiveArchiveButton("btnDNS");
    activateContainer("containerDNS");
  });
  document.getElementById("btnIPLookup").addEventListener("click", () => {
    setActiveArchiveButton("btnIPLookup");
    activateContainer("containerIPLookup");
  });
  document.getElementById("btnPassiveDNS").addEventListener("click", () => {
    setActiveArchiveButton("btnPassiveDNS");
    activateContainer("containerPassiveDNS");
  });
  document.getElementById("btnCertSpotter").addEventListener("click", () => {
    setActiveArchiveButton("btnCertSpotter");
    activateContainer("containerCertSpotter");
  });
  document.getElementById("btnOpenPorts").addEventListener("click", () => {
    setActiveArchiveButton("btnOpenPorts");
    activateContainer("containerOpenPorts");
  });

  // Archive / DNS / etc.
  document.getElementById("fetchArchiveBtn").addEventListener("click", fetchArchiveURLs);
  document.getElementById("dnsLookupBtn").addEventListener("click", performDNSLookup);
  document.getElementById("archiveSearchInput").addEventListener("input", filterArchiveResults);
  document.getElementById("downloadAllArchiveBtn").addEventListener("click", downloadAllArchiveURLs);
  document.getElementById("enableCORS").addEventListener("change", toggleCORS);

  // Additional lookups
  document.getElementById("ipLookupBtn").addEventListener("click", performIPLookup);
  document.getElementById("passiveDNSBtn").addEventListener("click", performPassiveDNSLookup);
  document.getElementById("certSpotterBtn").addEventListener("click", performCertSpotterLookup);
  document.getElementById("openPortsBtn").addEventListener("click", performOpenPortsLookup);

  // Footer
  document.getElementById("reloadSiteBtn").addEventListener("click", reloadActiveSite);
  document.getElementById("clearAllDataBtn").addEventListener("click", clearAllData);

  // Populate predefined scripts
  populatePredefinedScripts();

  // Check stored CORS
  // Force Enable CORS Bypass on popup open
  chrome.storage.local.set({ corsEnabled: true }, () => {

  });

  // Initialize arrays
  window.fetchedURLs = [];
  window.displayedURLs = [];
  window.archiveResults = [];

  // Default Tab
  showTab("cookies");
  loadData();
};

// ------------------------------
// TAB SWITCHING
// ------------------------------
function showTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("tab-active"));
  document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

  document.getElementById(`${tabName}-content`).style.display = "block";
  document.getElementById(`tab-${tabName}`).classList.add("tab-active");
}

// ------------------------------
// LOAD DATA (COOKIES & REQUESTS)
// ------------------------------
function loadData() {
  chrome.storage.local.get(["capturedCookiesByDomain","requestsByDomain","lastVisitedUrl"], (data) => {
    window.cookiesByDomain = data.capturedCookiesByDomain || {};
    window.requestsByDomain = data.requestsByDomain || {};
    window.lastVisitedUrl = data.lastVisitedUrl || "";

    let sortedDomains = Object.keys(window.requestsByDomain).sort((a,b)=>{
      let arrA = window.requestsByDomain[a];
      let arrB = window.requestsByDomain[b];
      let tA = new Date(arrA[arrA.length - 1].time).getTime() || 0;
      let tB = new Date(arrB[arrB.length - 1].time).getTime() || 0;
      return tB - tA; // newest first
    });

    // Cookies Domain
    let cookieSel = document.getElementById("cookiesDomainSelect");
    cookieSel.innerHTML = `<option value="all" selected>All</option>`;
    sortedDomains.forEach(d=>{
      let opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      cookieSel.appendChild(opt);
    });

    // Requests Domain
    let reqSel = document.getElementById("requestsDomainSelect");
    reqSel.innerHTML = `<option value="all" selected>All</option>`;
    sortedDomains.forEach(d=>{
      let opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      reqSel.appendChild(opt);
    });

    // cURL Domain
    let codeSel = document.getElementById("curlUrlSelect");
    if (codeSel) {
      codeSel.innerHTML = ``;
      sortedDomains.forEach(d=>{
        let opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        codeSel.appendChild(opt);
      });
      codeSel.innerHTML += `<option value="custom">Custom</option>`;
    }

    // Populate
    populateCookiesTable();
    populateRequestsTable();
    setDefaultCurlURL();
  });
}

// ------------------------------
// SET DEFAULT CURL URL
// ------------------------------
function setDefaultCurlURL() {
  if(!window.requestsByDomain) return;
  let sortedDomains = Object.keys(window.requestsByDomain).sort((a,b)=>{
    let arrA = window.requestsByDomain[a];
    let arrB = window.requestsByDomain[b];
    let tA = new Date(arrA[arrA.length - 1].time).getTime() || 0;
    let tB = new Date(arrB[arrB.length - 1].time).getTime() || 0;
    return tB - tA;
  });
  if(sortedDomains.length === 0) return;
  let newestDomain = sortedDomains[0];
  let codeSel = document.getElementById("curlUrlSelect");
  if(codeSel && newestDomain) {
    codeSel.value = newestDomain;
    handleCurlUrlSelect();
  }
}

// ------------------------------
// COOKIES TAB
// ------------------------------
function populateCookiesTable() {
  let domain = document.getElementById("cookiesDomainSelect").value;
  let tbody = document.getElementById("cookieListBody");
  tbody.innerHTML = "";

  if(domain === "all") {
    for(let d in window.cookiesByDomain) {
      let domainEntry = window.cookiesByDomain[d];
      if(!domainEntry) continue;
      let row = document.createElement("tr");

      let domainTd = document.createElement("td");
      domainTd.textContent = (domainEntry.metadata && domainEntry.metadata.url) || "";

      let cookiesTd = document.createElement("td");
      let cDiv = document.createElement("div");
      for(let [k,v] of Object.entries(domainEntry.cookies)) {
        cDiv.appendChild(createCookieLine(k,v));
      }
      cookiesTd.appendChild(cDiv);

      row.appendChild(domainTd);
      row.appendChild(cookiesTd);
      tbody.appendChild(row);
    }
  } else {
    let domainEntry = window.cookiesByDomain[domain];
    if(!domainEntry) return;
    let row = document.createElement("tr");

    let domainTd = document.createElement("td");
    domainTd.textContent = (domainEntry.metadata && domainEntry.metadata.url) || "";

    let cookiesTd = document.createElement("td");
    let cDiv = document.createElement("div");
    for(let [k,v] of Object.entries(domainEntry.cookies)) {
      cDiv.appendChild(createCookieLine(k,v));
    }
    cookiesTd.appendChild(cDiv);

    row.appendChild(domainTd);
    row.appendChild(cookiesTd);
    tbody.appendChild(row);
  }
}
function createCookieLine(name, value) {
  let container = document.createElement("div");
  container.classList.add("cookie-line");

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("cookie-key");
  nameSpan.textContent = name + ":";

  let valueSpan = document.createElement("span");
  valueSpan.classList.add("cookie-value");
  valueSpan.textContent = value;

  container.appendChild(nameSpan);
  container.appendChild(valueSpan);

  let copyBtn = document.createElement("button");
  copyBtn.classList.add("copy-button");
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click",()=>{
    let cookieString = `${name}=${value}`;
    navigator.clipboard.writeText(cookieString).then(()=>{
      alert(`Copied: ${cookieString}`);
    });
  });
  container.appendChild(copyBtn);
  return container;
}
function exportCookiesOnly() {
  chrome.storage.local.get("capturedCookiesByDomain",(data)=>{
    let cookies = data.capturedCookiesByDomain || {};
    let text = JSON.stringify(cookies,null,2);
    saveText(text, "cookies.json");
  });
}

// ------------------------------
// REQUESTS LOG TAB
// ------------------------------
function populateRequestsTable() {
  let domain = document.getElementById("requestsDomainSelect").value;
  let tbody = document.getElementById("requestListBody");
  tbody.innerHTML = "";

  let requestsToShow = [];
  if(domain === "all") {
    for(let d in window.requestsByDomain) {
      requestsToShow.push(...window.requestsByDomain[d]);
    }
  } else {
    requestsToShow = window.requestsByDomain[domain] || [];
  }

  let arr = [...requestsToShow].reverse();
  totalRequestPages = Math.ceil(arr.length / REQUESTS_PER_PAGE);
  currentRequestPage = Math.min(currentRequestPage, totalRequestPages) || 1;

  let startIdx = (currentRequestPage -1)*REQUESTS_PER_PAGE;
  let endIdx = startIdx + REQUESTS_PER_PAGE;
  let paginatedRequests = arr.slice(startIdx, endIdx);

  paginatedRequests.forEach(req => {
    if(req.url.startsWith("chrome-extension://")) return;

    let row = document.createElement("tr");

    // Status / Method
    let statusTd = document.createElement("td");
    statusTd.textContent = `${req.status||"N/A"} / ${req.method||"N/A"}`;

    let urlTd = document.createElement("td");
    urlTd.textContent = req.url || "N/A";

    let nameTd = document.createElement("td");
    nameTd.textContent = req.name || "N/A";

    let cacheTd = document.createElement("td");
    cacheTd.textContent = req.cacheControl || "N/A";

    let serverTd = document.createElement("td");
    serverTd.textContent = req.server || "N/A";

    // User-Agent with Show More
    let userAgentTd = document.createElement("td");
    let uaShort = shortenText(req.userAgent || "N/A", 30);
    let uaSpan = document.createElement("span");
    uaSpan.textContent = uaShort;
    userAgentTd.appendChild(uaSpan);
    if(req.userAgent && req.userAgent.length > 30) {
      let showAllBtn = document.createElement("button");
      showAllBtn.classList.add("show-all-btn");
      showAllBtn.textContent = "Show More";
      showAllBtn.addEventListener("click", () => {
        if(uaSpan.textContent === uaShort) {
          uaSpan.textContent = req.userAgent;
          showAllBtn.textContent = "Show Less";
        } else {
          uaSpan.textContent = uaShort;
          showAllBtn.textContent = "Show More";
        }
      });
      userAgentTd.appendChild(showAllBtn);
    }

    let cookiesTd = document.createElement("td");
    let cookiesStr = req.cookies
      ? Object.entries(req.cookies).map(([k,v]) => `${k}=${v}`).join("; ")
      : "N/A";
    cookiesTd.textContent = cookiesStr;

    let typeTd = document.createElement("td");
    typeTd.textContent = req.type || "N/A";

    let sizeTd = document.createElement("td");
    let sizeVal = parseInt(req.size,10) || 0;
    let sizeDisplay = sizeVal>=1024 ? `${(sizeVal/1024).toFixed(2)} KB` : `${sizeVal} B`;
    sizeTd.textContent = sizeDisplay;

    row.appendChild(statusTd);
    row.appendChild(urlTd);
    row.appendChild(nameTd);
    row.appendChild(cacheTd);
    row.appendChild(serverTd);
    row.appendChild(userAgentTd);
    row.appendChild(cookiesTd);
    row.appendChild(typeTd);
    row.appendChild(sizeTd);

    tbody.appendChild(row);
  });

  updateRequestTableVisibility();
  updatePaginationControls();
}

function downloadSelectedLogs() {
  let domain = document.getElementById("requestsDomainSelect").value;
  let allData = [];
  if(domain === "all") {
    for(let d in window.requestsByDomain) {
      allData.push(...window.requestsByDomain[d]);
    }
  } else {
    allData = window.requestsByDomain[domain] || [];
  }
  if(allData.length === 0) {
    alert("No requests to download for the selected domain.");
    return;
  }

  let fields = {
    status: document.getElementById("toggleStatus").checked,
    url: document.getElementById("toggleUrl").checked,
    name: document.getElementById("toggleName").checked,
    cacheControl: document.getElementById("toggleCacheControl").checked,
    server: document.getElementById("toggleServer").checked,
    userAgent: document.getElementById("toggleUserAgent").checked,
    cookies: document.getElementById("toggleCookies").checked,
    type: document.getElementById("toggleType").checked,
    size: document.getElementById("toggleSize").checked
  };

  let dataToDownload = allData.map(req => {
    let obj = {};
    if(fields.status) obj.Status = req.status||"N/A";
    if(fields.url) obj.Url = req.url||"N/A";
    if(fields.name) obj.Name = req.name||"N/A";
    if(fields.cacheControl) obj["Cache-Control"] = req.cacheControl||"N/A";
    if(fields.server) obj.Server = req.server||"N/A";
    if(fields.userAgent) obj["User-Agent"] = req.userAgent||"N/A";
    if(fields.cookies) {
      obj.Cookies = req.cookies
        ? Object.entries(req.cookies).map(([k,v])=>`${k}=${v}`).join("; ")
        : "N/A";
    }
    if(fields.type) obj.Type = req.type||"N/A";
    if(fields.size) {
      let sz = parseInt(req.size,10)||0;
      obj.Size = sz>=1024 ? `${(sz/1024).toFixed(2)} KB` : `${sz} B`;
    }
    return obj;
  });

  let text = JSON.stringify(dataToDownload,null,2);
  let filename = domain==="all" ? "all_requests.json" : `${domain}_requests.json`;
  saveText(text, filename);
}

function updateRequestTableVisibility() {
  const toggleStatus = document.getElementById("toggleStatus").checked;
  const toggleUrl = document.getElementById("toggleUrl").checked;
  const toggleName = document.getElementById("toggleName").checked;
  const toggleCacheControl = document.getElementById("toggleCacheControl").checked;
  const toggleServer = document.getElementById("toggleServer").checked;
  const toggleUserAgent = document.getElementById("toggleUserAgent").checked;
  const toggleCookies = document.getElementById("toggleCookies").checked;
  const toggleType = document.getElementById("toggleType").checked;
  const toggleSize = document.getElementById("toggleSize").checked;

  document.querySelectorAll("#requestListTable th").forEach(th=>{
    let header = th.textContent.trim();
    if(header==="Status") th.style.display = toggleStatus?"table-cell":"none";
    else if(header==="Url") th.style.display = toggleUrl?"table-cell":"none";
    else if(header==="Name") th.style.display = toggleName?"table-cell":"none";
    else if(header==="Cache-Control") th.style.display = toggleCacheControl?"table-cell":"none";
    else if(header==="Server") th.style.display = toggleServer?"table-cell":"none";
    else if(header==="User-Agent") th.style.display = toggleUserAgent?"table-cell":"none";
    else if(header==="Cookies") th.style.display = toggleCookies?"table-cell":"none";
    else if(header==="Type") th.style.display = toggleType?"table-cell":"none";
    else if(header==="Size") th.style.display = toggleSize?"table-cell":"none";
  });

  document.querySelectorAll("#requestListTable tbody tr").forEach(tr=>{
    tr.children[0].style.display = toggleStatus?"table-cell":"none";
    tr.children[1].style.display = toggleUrl?"table-cell":"none";
    tr.children[2].style.display = toggleName?"table-cell":"none";
    tr.children[3].style.display = toggleCacheControl?"table-cell":"none";
    tr.children[4].style.display = toggleServer?"table-cell":"none";
    tr.children[5].style.display = toggleUserAgent?"table-cell":"none";
    tr.children[6].style.display = toggleCookies?"table-cell":"none";
    tr.children[7].style.display = toggleType?"table-cell":"none";
    tr.children[8].style.display = toggleSize?"table-cell":"none";
  });
}

function filterRequests() {
  let searchTerm = document.getElementById("requestSearchInput").value.trim().toLowerCase();
  let rows = document.getElementById("requestListBody").getElementsByTagName("tr");

  for(let row of rows) {
    let txt = row.textContent.toLowerCase();

    // If it includes "chrome-extension://" or the extension ID, hide it
    if(txt.includes("chrome-extension://") || txt.includes("bjcmibkfggekceiinllpahdkklbnkhil")) {
      row.style.display = "none";
      continue;
    }

    // Otherwise, do your normal search filter
    row.style.display = txt.includes(searchTerm) ? "" : "none";
  }
}

function updatePaginationControls() {
  let currentPageSpan = document.getElementById("currentPage");
  let prevBtn = document.getElementById("prevPageBtn");
  let nextBtn = document.getElementById("nextPageBtn");

  currentPageSpan.textContent = `${currentRequestPage}`;
  prevBtn.disabled = currentRequestPage <= 1;
  nextBtn.disabled = currentRequestPage >= totalRequestPages;
}

function shortenText(text, maxLength) {
  if(text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// ------------------------------
// EXTRA DATA TAB
// ------------------------------
function runExtraDataScript() {
  const opts = {
    pageCookies: document.getElementById("chkPageCookies").checked,
    localStorage: document.getElementById("chkLocalStorage").checked,
    sessionStorage: document.getElementById("chkSessionStorage").checked,
    formData: document.getElementById("chkFormData").checked,
    inputFields: document.getElementById("chkInputFields").checked,
    hiddenElements: document.getElementById("chkHiddenElements").checked,
    links: document.getElementById("chkLinks").checked,
    images: document.getElementById("chkImages").checked,
    videos: document.getElementById("chkVideos").checked
  };

  const code = buildExtraDataScript(opts);
  // Clear old data
  document.getElementById("extraDataContainer").textContent = "Collecting data...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if(!tabs[0]) {
      document.getElementById("extraDataContainer").textContent = "No active tab found.";
      return;
    }
    // Inject the code
    chrome.tabs.executeScript(tabs[0].id, { code }, (results) => {
      if(chrome.runtime.lastError) {
        document.getElementById("extraDataContainer").textContent = 
          "Error: " + chrome.runtime.lastError.message;
        return;
      }
      const data = results && results[0] ? results[0] : {};
      // Parse and display
      displayExtraDataResults(data, opts);
    });
  });
}

// Build the script that runs in the page context
function buildExtraDataScript(opts) {
  return `
(function(){
  let output = {};

  if(${opts.pageCookies}) {
    output.pageCookies = {
      url: window.location.href,
      cookies: document.cookie
    };
  }
  if(${opts.localStorage}) {
    let ls = [];
    for(let i=0; i<localStorage.length; i++){
      let key = localStorage.key(i);
      ls.push(key + "=" + localStorage.getItem(key));
    }
    output.localStorage = ls;
  }
  if(${opts.sessionStorage}) {
    let ss = [];
    for(let i=0; i<sessionStorage.length; i++){
      let key = sessionStorage.key(i);
      ss.push(key + "=" + sessionStorage.getItem(key));
    }
    output.sessionStorage = ss;
  }
  if(${opts.formData}) {
    let formsData = [];
    document.querySelectorAll("form").forEach((f, idx)=>{
      let fd = new FormData(f);
      let obj = {};
      fd.forEach((val,k)=>obj[k]=val);
      formsData.push("Form #"+idx+" ("+(f.action||"")+"): "+JSON.stringify(obj));
    });
    output.forms = formsData;
  }
  if(${opts.inputFields}) {
    let inputs = [];
    document.querySelectorAll("input").forEach(inp=>{
      inputs.push("name="+(inp.name||"")+" type="+(inp.type||"")+" value="+(inp.value||""));
    });
    output.inputs = inputs;
  }
  if(${opts.hiddenElements}) {
    let hiddenEls = [];
    // Inputs with type=hidden
    document.querySelectorAll("input[type='hidden']").forEach(inp=>{
      hiddenEls.push("Hidden Input: name="+(inp.name||"")+" value="+(inp.value||""));
    });
    // style="display:none" or "visibility:hidden"
    document.querySelectorAll("[style]").forEach(el=>{
      let style = el.getAttribute("style").toLowerCase();
      if(style.includes("display:none") || style.includes("visibility:hidden")) {
        hiddenEls.push("Hidden Element: <" + el.tagName.toLowerCase() + "> " + el.outerHTML);
      }
    });
    output.hiddenElements = hiddenEls;
  }
  if(${opts.links}) {
    output.links = [...document.querySelectorAll('[href],[src]')]
      .map(el=> el.href||el.src)
      .filter(Boolean);
  }
  if(${opts.images}) {
    output.images = [...document.querySelectorAll('img')].map(img=> img.src).filter(Boolean);
  }
  if(${opts.videos}) {
    output.videos = [...document.querySelectorAll('video, source')].map(v=> v.src).filter(Boolean);
  }

  return output;
})();
`;
}

function displayExtraDataResults(data, opts) {
  let container = document.getElementById("extraDataContainer");
  
  // If pageCookies is enabled, update storage
  if(opts.pageCookies && data.pageCookies && data.pageCookies.cookies) {
    try {
      let url = data.pageCookies.url || window.lastVisitedUrl || "http://unknown";
      let domain = new URL(url).hostname;
      let cookieObj = {};
      data.pageCookies.cookies.split("; ").forEach(pair=>{
        let [k,v] = pair.split("=");
        if(k&&v) cookieObj[k]=v;
      });

      // Update capturedCookiesByDomain
      chrome.storage.local.get(["capturedCookiesByDomain","requestsByDomain"], (storeData)=>{
        let cByDomain = storeData.capturedCookiesByDomain || {};
        let rByDomain = storeData.requestsByDomain || {};
        
        if(!cByDomain[domain]) {
          cByDomain[domain] = {
            cookies: cookieObj,
            metadata: {
              time: new Date().toLocaleString(),
              url: url
            }
          };
        } else {
          cByDomain[domain].cookies = {
            ...cByDomain[domain].cookies,
            ...cookieObj
          };
          cByDomain[domain].metadata.time = new Date().toLocaleString();
          cByDomain[domain].metadata.url = url;
        }

        // Add request to requestsByDomain
        if(!rByDomain[domain]) {
          rByDomain[domain] = [];
        }
        let reqEntry = {
          url,
          name: "N/A",
          cacheControl: "N/A",
          server: "N/A",
          userAgent: "Unknown",
          status: "N/A",
          type: "N/A",
          size: "0",
          method: "GET",
          time: new Date().toLocaleString(),
          cookies: cookieObj
        };
        rByDomain[domain].push(reqEntry);

        chrome.storage.local.set({
          capturedCookiesByDomain: cByDomain,
          requestsByDomain: rByDomain
        }, ()=>{
          // refresh cookies & requests if needed
          populateCookiesTable();
          populateRequestsTable();
        });
      });
    } catch(e) { /* ignore */ }
  }

  // Summarize data in text form
  let lines = [];
  let keys = Object.keys(data).sort();
  keys.forEach(key=>{
    let val = data[key];
    if(Array.isArray(val)) {
      lines.push(`${key}:`);
      if(val.length===0) {
        lines.push("  (none)");
      } else {
        val.forEach(item=>{
          lines.push("  "+item);
        });
      }
      lines.push("");
    } else if(typeof val==="object") {
      lines.push(`${key}:`);
      lines.push(JSON.stringify(val, null, 2));
      lines.push("");
    } else {
      lines.push(`${key}: ${val}`);
      lines.push("");
    }
  });
  if(lines.length===0) lines.push("No data found for the selected checkboxes.");

  container.textContent= lines.join("\n");
}

function downloadExtraDataResults() {
  console.log("downloadExtraDataResults - implement logic to save #extraDataContainer content to file.");
}

// ------------------------------
// GEN cURL TAB
// ------------------------------
function toggleAdvancedMode() {
  let adv = document.getElementById("advancedModeToggle").checked;
  document.getElementById("advancedModeSection").style.display = adv ? "block" : "none";
}

function handleCurlUrlSelect() {
  let sel = document.getElementById("curlUrlSelect");
  let customUrl = document.getElementById("customCurlUrl");
  if(sel.value==="custom") {
    customUrl.style.display = "block";
  } else {
    customUrl.style.display = "none";
  }
}

function addCommonHeader() {
  let hdrSel = document.getElementById("commonHeaderSelect");
  let val = document.getElementById("commonHeaderValue").value.trim();
  if(hdrSel.value==="none" || !val) return;
  addHeaderLine(hdrSel.value, val);
}

function addHeaderLine(key, value) {
  let div = document.createElement("div");
  div.className = "addedHeaderLine";
  let span = document.createElement("span");
  span.textContent = `${key}: ${value}`;

  let delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.style.marginLeft = "10px";
  delBtn.style.backgroundColor = "#a00";
  delBtn.style.color = "#fff";
  delBtn.style.border = "none";
  delBtn.style.padding = "2px 5px";
  delBtn.style.cursor = "pointer";
  delBtn.style.borderRadius = "2px";
  delBtn.addEventListener("click",()=>{
    document.getElementById("headersList").removeChild(div);
  });

  div.appendChild(span);
  div.appendChild(delBtn);
  document.getElementById("headersList").appendChild(div);
}

function addQueryParamRow() {
  let c = document.getElementById("queryParamsContainer");
  let row = document.createElement("div");
  row.style.marginBottom = "5px";
  row.innerHTML = `
    <label>Key:</label> <input type="text" class="qpKey" style="width:80px;" />
    <label>Value:</label> <input type="text" class="qpVal" style="width:100px;" />
    <button class="removeQPBtn">Remove</button>
  `;
  c.appendChild(row);

  row.querySelector(".removeQPBtn").addEventListener("click", ()=>{
    c.removeChild(row);
  });
}

function applySelectedTemplate() {
  let template = document.getElementById("templateSelect").value;
  if(!template) return;
  if(template==="jsonPost") {
    document.getElementById("curlMethod").value = "POST";
    addHeaderLine("Content-Type","application/json");
  } else if(template==="multipart") {
    document.getElementById("curlMethod").value = "POST";
    addHeaderLine("Content-Type","multipart/form-data");
  } else if(template==="authGet") {
    document.getElementById("curlMethod").value = "GET";
    addHeaderLine("Authorization","Bearer <token>");
  }
}

function generateCurlCommand() {
  const method = document.getElementById("curlMethod").value;
  const urlSelect = document.getElementById("curlUrlSelect").value;
  const customUrl = document.getElementById("customCurlUrl").value.trim();
  const language = document.getElementById("curlLanguageSelect").value; // "curl", "python", "node"
  const includeCookies = document.getElementById("includeCookiesToggle").checked;
  const adv = document.getElementById("advancedModeToggle").checked;

  let url = "";
  if(urlSelect==="custom") {
    if(!customUrl) {
      alert("Please enter a custom URL.");
      return;
    }
    url = customUrl;
  } else {
    // Use domain from requestsByDomain
    if(!window.requestsByDomain[urlSelect] || window.requestsByDomain[urlSelect].length===0) {
      alert("No requests found for that domain, cannot auto-populate URL. Enter a custom URL or pick a domain with requests.");
      return;
    }
    // get last request
    const lastReq = window.requestsByDomain[urlSelect][window.requestsByDomain[urlSelect].length-1];
    url = lastReq.url || "";
  }

  if(!url) {
    alert("No valid URL found or entered.");
    return;
  }

  // Gather cookies if needed
  let cookiesStr = "";
  if(includeCookies) {
    cookiesStr = getCookiesForDomain(urlSelect);
  }

  // Collect advanced headers
  let headerLines = [];
  if(adv) {
    const headerDivs = document.querySelectorAll("#headersList .addedHeaderLine");
    headerDivs.forEach(div=>{
      const text = div.querySelector("span").textContent; // e.g. "Content-Type: application/json"
      headerLines.push(text);
    });
  }

  // Collect query params
  let queryArray = [];
  if(adv) {
    const qpKeys = document.querySelectorAll(".qpKey");
    const qpVals = document.querySelectorAll(".qpVal");
    qpKeys.forEach((k, i)=>{
      let key= k.value.trim();
      let val= qpVals[i].value.trim();
      if(key && val) {
        queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });
  }
  // If query params exist, add to URL
  let finalUrl= url;
  if(queryArray.length>0) {
    let qStr= queryArray.join("&");
    if(finalUrl.includes("?")) finalUrl+= "&"+qStr;
    else finalUrl+= "?"+qStr;
  }

  // Prepare final output
  let output= "";
  if(language==="curl") {
    // cURL example
    let lines= [];
    lines.push(`curl "${finalUrl}" \\`);
    lines.push(`  -X ${method} \\`);

    if(adv) {
      // advanced lines
      headerLines.forEach(hdr=>{
        lines.push(`  -H "${hdr}" \\`);
      });
      // insecure, ciphers, output modes
      const insecure = document.getElementById("insecureToggle").checked;
      if(insecure) lines.push(`  --insecure \\`);

      const ciphers = document.getElementById("ciphersInput").value.trim();
      if(ciphers) lines.push(`  --ciphers "${ciphers}" \\`);

      const outSel= document.getElementById("curlOutputSelect").value;
      if(outSel==="trace") {
        lines.push(`  --trace-ascii trace.txt \\`);
      } else if(outSel==="outFile") {
        lines.push(`  -o output.txt \\`);
      } else if(["-v","-i","-s","-L"].includes(outSel)) {
        lines.push(`  ${outSel} \\`);
      }
    }

    if(includeCookies && cookiesStr) {
      lines.push(`  -H "Cookie: ${cookiesStr}" \\`);
    }
    // remove trailing slash
    if(lines[lines.length-1].endsWith("\\")) {
      lines[lines.length-1] = lines[lines.length-1].slice(0, -2);
    }
    output = lines.join("\n");
  }
  else if(language==="python") {
    // minimal Python example
    output= generatePythonRequests(method, finalUrl, includeCookies? cookiesStr:"", headerLines, queryArray);
  }
  else if(language==="node") {
    // minimal Node fetch example
    output= generateNodeFetch(method, finalUrl, includeCookies? cookiesStr:"", headerLines, queryArray);
  }

  document.getElementById("curlOutputBox").textContent= output || "No command generated.";
}

// Helper to gather cookies for domain
function getCookiesForDomain(domainOrAll) {
  let cookiesObj= {};
  if(domainOrAll==="custom") return ""; // no domain
  if(domainOrAll==="all") {
    // combine cookies from all domains
    for(let d in window.cookiesByDomain) {
      cookiesObj= {...cookiesObj, ...window.cookiesByDomain[d].cookies};
    }
  } else {
    // single domain
    let domainData= window.cookiesByDomain[domainOrAll];
    if(domainData) {
      cookiesObj= domainData.cookies;
    }
  }
  let arr= Object.entries(cookiesObj).map(([k,v])=> `${k}=${v}`);
  return arr.join("; ");
}

// Minimal Python example
function generatePythonRequests(method, url, cookieStr, headerLines, queryArray) {
  let lines= [];
  lines.push(`import requests`);
  lines.push(``);
  lines.push(`url = "${url}"`);
  lines.push("");

  let headers= {};
  // from headerLines "Content-Type: application/json"
  headerLines.forEach(line=>{
    let idx= line.indexOf(":");
    if(idx>0) {
      let k= line.substring(0,idx).trim();
      let v= line.substring(idx+1).trim();
      headers[k]= v;
    }
  });
  if(cookieStr) {
    headers["Cookie"]= cookieStr;
  }

  // query params
  let queryObj= {};
  // we already appended them to the URL, but let's do a minimal approach
  if(queryArray && queryArray.length>0) {
    // no big difference, but you can keep them separate if you prefer
  }

  lines.push(`headers = ${JSON.stringify(headers,null,2)}`);
  lines.push(`params = {}`);
  lines.push("");

  let methodLower= method.toLowerCase();
  if(["post","put","patch","delete"].includes(methodLower)) {
    lines.push(`response = requests.${methodLower}(url, headers=headers, params=params)`);
  } else {
    lines.push(`response = requests.${methodLower}(url, headers=headers, params=params)`);
  }
  lines.push(`print(response.text)`);
  return lines.join("\n");
}

// Minimal Node fetch example
function generateNodeFetch(method, url, cookieStr, headerLines, queryArray) {
  let lines= [];
  lines.push(`const fetch = require('node-fetch');`);
  lines.push("");
  lines.push(`(async () => {`);
  lines.push(`  const headers = {}`);
  headerLines.forEach(line=>{
    let idx= line.indexOf(":");
    if(idx>0) {
      let k= line.substring(0,idx).trim();
      let v= line.substring(idx+1).trim();
      lines.push(`  headers["${k}"] = "${v}";`);
    }
  });
  if(cookieStr) {
    lines.push(`  headers["Cookie"] = "${cookieStr}";`);
  }
  lines.push(``);
  lines.push(`  const response = await fetch("${url}", {`);
  lines.push(`    method: "${method}",`);
  lines.push(`    headers,`);
  lines.push(`  });`);
  lines.push(`  const data = await response.text();`);
  lines.push(`  console.log(data);`);
  lines.push(`})();`);
  return lines.join("\n");
}

function copyCurlToClipboard() {
  let cmd = document.getElementById("curlOutputBox").textContent;
  if(!cmd || cmd.trim()==="") {
    alert("No command to copy.");
    return;
  }
  navigator.clipboard.writeText(cmd).then(()=>{
    alert("Copied command to clipboard!");
  });
}

// ------------------------------
// CUSTOM SCRIPT TAB
// ------------------------------
function populatePredefinedScripts() {
  let scriptSelect = document.getElementById("predefinedScripts");
  predefinedScripts.forEach(script=>{
    let opt = document.createElement("option");
    opt.value = script.filename;
    opt.textContent = script.name;
    scriptSelect.appendChild(opt);
  });
}

function loadPredefinedScript() {
  let selectedFile = document.getElementById("predefinedScripts").value;
  let textArea = document.getElementById("customScript");
  if(!selectedFile) {
    textArea.value="";
    return;
  }
  fetch(chrome.runtime.getURL(`scripts/${selectedFile}`))
    .then(r=>{
      if(!r.ok) throw new Error(`Failed to load script: ${selectedFile}`);
      return r.text();
    })
    .then(content=>{
      textArea.value = content;
    })
    .catch(err=>{
      alert(err.message);
      textArea.value="";
    });
}

function runCustomScript() {
  let script = document.getElementById("customScript").value.trim();
  let outputDiv = document.getElementById("customScriptOutput");
  let retryCount = parseInt(document.getElementById("retryCount").value, 10);
  let retryInterval = parseInt(document.getElementById("retryInterval").value, 10)*1000;

  if(!script) {
    alert("Please enter some JavaScript code to run.");
    return;
  }
  if(isNaN(retryCount) || retryCount<0) {
    alert("Invalid Retry Count.");
    return;
  }
  if(isNaN(retryInterval) || retryInterval<1000) {
    alert("Invalid Retry Interval (minimum 1 second).");
    return;
  }
  outputDiv.innerHTML="<em>Running script...</em>";
  let attempt=0;

  function executeScript() {
    chrome.tabs.query({ active:true, currentWindow:true}, (tabs)=>{
      if(!tabs[0]) {
        outputDiv.innerHTML="<em>No active tab found.</em>";
        return;
      }
      chrome.tabs.executeScript(tabs[0].id, { code: script }, (results)=>{
        if(chrome.runtime.lastError) {
          if(attempt<retryCount) {
            attempt++;
            setTimeout(executeScript, retryInterval);
          } else {
            outputDiv.textContent="Error: " + chrome.runtime.lastError.message;
          }
          return;
        }
        let result = results[0];
        try {
          outputDiv.textContent= JSON.stringify(result,null,2);
        } catch(e) {
          outputDiv.textContent= String(result);
        }
      });
    });
  }
  executeScript();
}

// ------------------------------
// FOOTER / GLOBAL
// ------------------------------
function reloadActiveSite() {
  chrome.tabs.query({active:true,currentWindow:true}, (tabs)=>{
    if(tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

function clearAllData() {
  if(!confirm("Are you sure you want to clear all data?")) return;
  chrome.storage.local.clear(()=>{
    if(background) {
      background.capturedCookiesByDomain = {};
      background.requestsByDomain = {};
      background.capturedRequests = [];
      background.write = "";
      background.lastVisitedUrl = "";
    }
    window.archiveResults = [];

    alert("All data cleared. Reload extension or site if needed.");
    loadData();
    document.getElementById("extraDataContainer").innerHTML="<em>No data yet.</em>";
    document.getElementById("resultsCount").textContent="";
    document.getElementById("archiveResults").innerHTML="<em>No archive results yet.</em>";
    document.getElementById("dnsLookupResults").innerHTML="<em>No DNS lookup performed yet.</em>";
    document.getElementById("archiveCount").innerHTML="<em>Fetched URLs: 0</em>";
    document.getElementById("requestSearchInput").value="";
  });
}

function saveText(text, filename) {
  let a= document.createElement("a");
  a.href= "data:text/plain,"+encodeURIComponent(text);
  a.download= filename;
  let evt= document.createEvent("MouseEvents");
  evt.initMouseEvent("click",true,true,window,0,0,0,0,0,false,true,false,false,0,null);
  a.dispatchEvent(evt);
}

// ------------------------------
// ARCHIVE SEARCH - Container Switch
// ------------------------------
function setActiveArchiveButton(btnId) {
  ["btnArchive","btnDNS","btnIPLookup","btnPassiveDNS","btnCertSpotter","btnOpenPorts"].forEach(b=>{
    document.getElementById(b).classList.remove("active");
  });
  document.getElementById(btnId).classList.add("active");
}
function activateContainer(containerId) {
  ["containerArchive","containerDNS","containerIPLookup","containerPassiveDNS","containerCertSpotter","containerOpenPorts"]
    .forEach(c => document.getElementById(c).classList.remove("active"));
  document.getElementById(containerId).classList.add("active");
}

// ------------------------------
// ARCHIVE: Fetch Archive URLs
// ------------------------------
function fetchArchiveURLs() {
  const domainInput = document.getElementById("archiveDomain").value.trim();
  const enableCORS = document.getElementById("enableCORS").checked;
  const archiveResultsContainer = document.getElementById("archiveResults");
  const countDisplay = document.getElementById("archiveCount");

  if(!domainInput) {
    alert("Please enter a domain in the 'Domain/IP' field.");
    return;
  }

  chrome.storage.local.set({ corsEnabled: enableCORS }, () => {
    console.log(`CORS Bypass is now ${enableCORS?"enabled":"disabled"}`);
  });

  countDisplay.innerHTML = "<em>Fetched URLs: 0</em>";
  window.fetchedURLs = [];

  // Connect to background or direct fetch for Wayback...
  let port = chrome.runtime.connect({ name: "archiveSearch" });
  port.onMessage.addListener((message) => {
    if(message.type==="url") {
      let url = message.url;
      window.fetchedURLs.push(url);
      let currentCount= window.fetchedURLs.length;
      countDisplay.innerHTML= `<em>Fetched URLs: ${currentCount}</em>`;
      if(currentCount<=300) {
        appendURLToList(archiveResultsContainer, url);
      } else {
        if(!document.getElementById("moreURLsNotice")) {
          let notice= document.createElement("div");
          notice.id="moreURLsNotice";
          notice.innerHTML= `<em>More URLs fetched. <a href="#" id="downloadAllNoticeLink">Download All</a></em>`;
          archiveResultsContainer.appendChild(notice);
          document.getElementById("downloadAllNoticeLink").addEventListener("click",(e)=>{
            e.preventDefault();
            downloadAllArchiveURLs();
          });
        }
      }
    }
    else if(message.type==="complete") {
      let total= message.total;
      console.log(`Fetch complete. Total: ${total}`);
      if(total>300) {
        let notice= document.getElementById("moreURLsNotice");
        if(notice) {
          notice.innerHTML= `<em>${total} URLs fetched. <a href="#" id="downloadAllNoticeLink">Download All</a></em>`;
          document.getElementById("downloadAllNoticeLink").addEventListener("click",(e)=>{
            e.preventDefault();
            downloadAllArchiveURLs();
          });
        }
      } else {
        let notice= document.getElementById("moreURLsNotice");
        if(notice) archiveResultsContainer.removeChild(notice);
      }
    }
    else if(message.type==="error") {
      archiveResultsContainer.innerHTML= `<em>Error: ${message.message}</em>`;
      countDisplay.innerHTML= "<em>Fetched URLs: 0</em>";
    }
  });

  port.postMessage({ action:"fetchWaybackURLs", domain: domainInput });
}

function appendURLToList(container, url) {
  let ul = container.querySelector("ul");
  if(!ul) {
    ul= document.createElement("ul");
    container.innerHTML="";
    container.appendChild(ul);
  }
  let li= document.createElement("li");
  li.style.marginBottom="5px";

  let link= document.createElement("a");
  link.href= url;
  link.textContent= url;
  link.target="_blank";
  link.style.color= "#4ea6ff";

  li.appendChild(link);
  ul.appendChild(li);
}

function filterArchiveResults() {
  const searchTerm= document.getElementById("archiveSearchInput").value.trim().toLowerCase();
  const container= document.getElementById("archiveResults");
  let ul= container.querySelector("ul");
  if(!ul) return;
  let listItems= ul.querySelectorAll("li");
  listItems.forEach(li=>{
    let link= li.querySelector("a");
    li.style.display= link.textContent.toLowerCase().includes(searchTerm) ? "block":"none";
  });
}

function downloadAllArchiveURLs() {
  if(window.fetchedURLs.length===0) {
    alert("No URLs to download.");
    return;
  }
  let text= window.fetchedURLs.join("\n");
  saveText(text, "archive_urls.txt");
}

function toggleCORS() {
  const enableCORS = document.getElementById("enableCORS").checked;
  chrome.storage.local.set({ corsEnabled: enableCORS }, ()=>{
    console.log(`CORS Bypass is now ${enableCORS?"enabled":"disabled"}`);
  });
}

// ------------------------------
// DNS LOOKUP
// ------------------------------
function performDNSLookup() {
  let domain = document.getElementById("archiveDomain").value.trim();
  let container = document.getElementById("dnsLookupResults");
  if(!domain) {
    alert("Please enter a domain in the 'Domain/IP' field.");
    return;
  }
  container.innerHTML= '<div class="spinner-container"><div class="spinner"></div></div>';

  let url= `https://www.whatsmydns.net/api/extension/lookup?query=${encodeURIComponent(domain)}&type=&server=google`;
  fetch(url)
    .then(res=>{
      if(!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.json();
    })
    .then(data=>{
      displayDNSResults(container, data);
    })
    .catch(err=>{
      container.innerHTML= `<em>Error: ${err.message}</em>`;
    });
}

function displayDNSResults(container, data) {
  container.innerHTML= "";
  if(!data||Object.keys(data).length===0) {
    container.innerHTML="<em>No DNS records found.</em>";
    return;
  }
  for(let recordType in data) {
    if(!data.hasOwnProperty(recordType)) continue;
    let records= data[recordType];
    if(!records||records.length===0) continue;

    let section= document.createElement("div");
    section.style.marginBottom="15px";

    let header= document.createElement("h4");
    header.textContent= recordType;
    header.style.color= "#fff";
    section.appendChild(header);

    let table= document.createElement("table");
    table.style.width="100%";
    table.style.borderCollapse="collapse";
    table.style.marginBottom="10px";

    let thead= document.createElement("thead");
    let headerRow= document.createElement("tr");
    ["Record","Type","Value","TTL"].forEach(txt=>{
      let th= document.createElement("th");
      th.textContent= txt;
      th.style.border="1px solid #444";
      th.style.padding="5px";
      th.style.backgroundColor="#555";
      th.style.textAlign="left";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    let tbody= document.createElement("tbody");
    records.forEach(rec=>{
      let tr= document.createElement("tr");
      ["record","type","value","ttl"].forEach(key=>{
        let td= document.createElement("td");
        td.textContent= rec[key]||"N/A";
        td.style.border="1px solid #444";
        td.style.padding="5px";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }
  if(container.innerHTML.trim()==="") {
    container.innerHTML="<em>No DNS records found.</em>";
  }
}

// ------------------------------
// IP LOOKUP
// (SANS)
// snippet: full usage

// 1) API_URLS + fetchDataForArchive + displayDataRecursive

const API_URLS = {
  ipLookup: "https://isc.sans.edu/api/ip/${query}?json",
  passiveDNS: "https://api.mnemonic.no/pdns/v3/${query}",
  certSpotter: "https://api.certspotter.com/v1/issuances?domain=${query}&include_subdomains=true&expand=dns_names&expand=issuer&expand=revocation&expand=problem_reporting&expand=cert_der",
  openPorts: "https://internetdb.shodan.io/${query}"
};

async function fetchDataForArchive(queryType, queryInput, resultsContainer) {
  if (!queryInput) {
    resultsContainer.innerHTML = "<em>Please enter a valid input.</em>";
    return;
  }
  const urlTemplate = API_URLS[queryType];
  if(!urlTemplate) {
    resultsContainer.innerHTML = `<em>Unknown query type: ${queryType}</em>`;
    return;
  }
  const apiUrl = urlTemplate.replace("${query}", encodeURIComponent(queryInput));

  resultsContainer.innerHTML = "<em>Loading...</em>";
  try {
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();

    resultsContainer.innerHTML = "";
    displayDataRecursive(data, resultsContainer);

  } catch(err) {
    resultsContainer.innerHTML= `<em>Error: ${err.message}</em>`;
  }
}

function displayDataRecursive(data, container) {
  if(Array.isArray(data)) {
    const ul= document.createElement("ul");
    data.forEach(item=>{
      const li= document.createElement("li");
      displayDataRecursive(item, li);
      ul.appendChild(li);
    });
    container.appendChild(ul);

  } else if (typeof data==="object" && data!==null) {
    const table= document.createElement("table");
    table.style.width="100%";
    table.style.borderCollapse="collapse";

    const tbody= document.createElement("tbody");
    for(let [key, value] of Object.entries(data)) {
      const row= document.createElement("tr");

      const keyCell= document.createElement("td");
      keyCell.style.fontWeight="bold";
      keyCell.style.border="1px solid #444";
      keyCell.style.padding="5px";
      keyCell.textContent= key;

      const valCell= document.createElement("td");
      valCell.style.border="1px solid #444";
      valCell.style.padding="5px";

      displayDataRecursive(value, valCell);

      row.appendChild(keyCell);
      row.appendChild(valCell);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    container.appendChild(table);

  } else {
    // primitive
    container.textContent= data!=null ? data : "N/A";
  }
}

// 2) Hook each button
function performIPLookup() {
  const ip = document.getElementById("archiveDomain").value.trim();
  const container = document.getElementById("ipLookupResults");
  fetchDataForArchive("ipLookup", ip, container);
}
function performPassiveDNSLookup() {
  const domain= document.getElementById("archiveDomain").value.trim();
  const container= document.getElementById("passiveDNSResults");
  fetchDataForArchive("passiveDNS", domain, container);
}
function performCertSpotterLookup() {
  const domain= document.getElementById("archiveDomain").value.trim();
  const container= document.getElementById("certSpotterResults");
  fetchDataForArchive("certSpotter", domain, container);
}
function performOpenPortsLookup() {
  const ip= document.getElementById("archiveDomain").value.trim();
  const container= document.getElementById("openPortsResults");
  fetchDataForArchive("openPorts", ip, container);
}

// The rest of your code...


// ------------------------------
// ARCHIVE SEARCH: Container Switch
// ------------------------------
function setActiveArchiveButton(btnId) {
  ["btnArchive","btnDNS","btnIPLookup","btnPassiveDNS","btnCertSpotter","btnOpenPorts"].forEach(b=>{
    document.getElementById(b).classList.remove("active");
  });
  document.getElementById(btnId).classList.add("active");
}
function activateContainer(containerId) {
  ["containerArchive","containerDNS","containerIPLookup","containerPassiveDNS","containerCertSpotter","containerOpenPorts"]
    .forEach(c => document.getElementById(c).classList.remove("active"));
  document.getElementById(containerId).classList.add("active");
}

// ------------------------------
// GLOBAL UTILS
// ------------------------------
function reloadActiveSite() {
  chrome.tabs.query({active:true, currentWindow:true}, (tabs)=>{
    if(tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

function clearAllData() {
  if(!confirm("Are you sure you want to clear all data?")) return;
  chrome.storage.local.clear(()=>{
    if(background) {
      background.capturedCookiesByDomain = {};
      background.requestsByDomain = {};
      background.capturedRequests = [];
      background.write = "";
      background.lastVisitedUrl = "";
    }
    window.archiveResults = [];

    alert("All data cleared. Reload extension or site if needed.");
    loadData();

    document.getElementById("extraDataContainer").innerHTML="<em>No data yet.</em>";
    document.getElementById("resultsCount").textContent="";
    document.getElementById("archiveResults").innerHTML="<em>No archive results yet.</em>";
    document.getElementById("dnsLookupResults").innerHTML="<em>No DNS lookup performed yet.</em>";
    document.getElementById("archiveCount").innerHTML="<em>Fetched URLs: 0</em>";
    document.getElementById("requestSearchInput").value="";
  });
}

function saveText(text, filename) {
  let a = document.createElement("a");
  a.href = "data:text/plain," + encodeURIComponent(text);
  a.download = filename;
  let evt = document.createEvent("MouseEvents");
  evt.initMouseEvent(
    "click",
    true,
    true,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    true,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(evt);
}
