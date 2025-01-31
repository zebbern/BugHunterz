// ExportThisCookie/js/popup.js

let background = chrome.extension.getBackgroundPage();

// Predefined Scripts Mapping
// Map each script's filename to its display name
const predefinedScripts = [
  { name: "Get Page Title", filename: "1.js" },
  { name: "List All Links", filename: "2.js" },
  { name: "Get All Cookies", filename: "3.js" },
  { name: "Get Page URL", filename: "4.js" },
  { name: "List All Images", filename: "5.js" },
  { name: "List All Scripts", filename: "6.js" },
  { name: "Extract Local Storage Data", filename: "7.js" },
  { name: "Extract Session Storage Data", filename: "8.js" },
  { name: "List All Forms", filename: "9.js" },
  { name: "Get Current User-Agent", filename: "10.js" }
];

window.onload = function() {
  // Setup tab switching
  document.getElementById("tab-cookies").addEventListener("click", () => showTab("cookies"));
  document.getElementById("tab-requests").addEventListener("click", () => showTab("requests"));
  document.getElementById("tab-extradata").addEventListener("click", () => showTab("extradata"));
  document.getElementById("tab-gencode").addEventListener("click", () => showTab("gencode"));
  document.getElementById("tab-customscript").addEventListener("click", () => showTab("customscript"));
  document.getElementById("tab-archivesearch").addEventListener("click", () => showTab("archivesearch")); // New Tab Event Listener

  // Cookies tab
  document.getElementById("cookiesDomainSelect").addEventListener("change", populateCookiesTable);
  document.getElementById("exportCookiesBtn").addEventListener("click", exportCookiesOnly);

  // Requests Log tab
  document.getElementById("requestsDomainSelect").addEventListener("change", populateRequestsTable);
  document.getElementById("downloadDomainRequestsBtn").addEventListener("click", downloadSelectedLogs);

  // Extra Data tab: each checkbox triggers an instant run
  ["chkPageCookies","chkLocalStorage","chkSessionStorage","chkFormData","chkInputFields","chkHiddenElements","chkLinks","chkPotentialAttributes","chkFormEndpoints","chkScripts","chkStylesheets","chkMedia","chkAnchorLinks","chkIframes","chkSensitiveComments"]
    .forEach(id => {
      document.getElementById(id).addEventListener("change", runExtraDataScript);
    });

  // Extra Data download button
  document.getElementById("downloadExtraDataBtn").addEventListener("click", downloadExtraDataResults);

  // Gen cURL tab
  document.getElementById("advancedModeToggle").addEventListener("change", toggleAdvancedMode);
  document.getElementById("addCommonHeaderBtn").addEventListener("click", addCommonHeader);
  document.getElementById("addQueryParamBtn").addEventListener("click", addQueryParamRow);
  document.getElementById("applyTemplateBtn").addEventListener("click", applySelectedTemplate);
  document.getElementById("generateCurlButton").addEventListener("click", generateCurlCommand);
  document.getElementById("copyCurlButton").addEventListener("click", copyCurlToClipboard);

  // Handle URL dropdown for Gen cURL
  document.getElementById("curlUrlSelect").addEventListener("change", handleCurlUrlSelect);

  // Footer buttons
  document.getElementById("reloadSiteBtn").addEventListener("click", reloadActiveSite);
  document.getElementById("clearAllDataBtn").addEventListener("click", clearAllData);

  // Custom Script tab
  document.getElementById("runCustomScriptBtn").addEventListener("click", runCustomScript);
  document.getElementById("predefinedScripts").addEventListener("change", loadPredefinedScript);

  // Archive Search tab
  document.getElementById("archiveSearchBtn").addEventListener("click", performArchiveSearch); // New Event Listener

  // Populate predefined scripts dropdown
  populatePredefinedScripts();

  // Default tab
  showTab("cookies");
  loadData(); // load cookies & requests
};

/** Tab switching */
function showTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("tab-active"));
  document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

  document.getElementById(`${tabName}-content`).style.display = "block";
  document.getElementById(`tab-${tabName}`).classList.add("tab-active");
}

/** Load cookiesByDomain & requestsByDomain from storage, build domain dropdowns (newest first). */
function loadData() {
  chrome.storage.local.get(["capturedCookiesByDomain","requestsByDomain","lastVisitedUrl"], (data)=>{
    window.cookiesByDomain = data.capturedCookiesByDomain || {};
    window.requestsByDomain = data.requestsByDomain || {};
    window.lastVisitedUrl = data.lastVisitedUrl || "";

    // Sort domains by newest request time
    let sortedDomains = Object.keys(window.requestsByDomain).sort((a,b)=>{
      let arrA = window.requestsByDomain[a];
      let arrB = window.requestsByDomain[b];
      let tA = arrA[arrA.length-1].time;
      let tB = arrB[arrB.length-1].time;
      return new Date(tB) - new Date(tA); // newest first
    });

    // Cookies domain dropdown
    let cookieSel = document.getElementById("cookiesDomainSelect");
    // Clear and add "All" as default
    cookieSel.innerHTML = `<option value="all" selected>All</option>`;
    sortedDomains.forEach(d=>{
      let opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      cookieSel.appendChild(opt);
    });

    // Requests Log domain dropdown
    let reqSel = document.getElementById("requestsDomainSelect");
    // Clear and add "All" as default
    reqSel.innerHTML = `<option value="all" selected>All</option>`;
    sortedDomains.forEach(d=>{
      let opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      reqSel.appendChild(opt);
    });

    // Gen cURL URL dropdown
    let codeSel = document.getElementById("curlUrlSelect");
    // Clear and add existing options
    // Only "Custom" option exists initially; add domains if needed
    codeSel.innerHTML = ``; // Remove existing options
    sortedDomains.forEach(d=>{
      let opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      codeSel.appendChild(opt);
    });
    codeSel.innerHTML += `<option value="custom">Custom</option>`;

    // Default selections
    populateCookiesTable();
    populateRequestsTable();

    // Automatically select "All" and display all data upon opening
  });
}

/** Cookies Tab: show cookies for selected domain or all. */
function populateCookiesTable() {
  let domain = document.getElementById("cookiesDomainSelect").value;
  let tbody = document.getElementById("cookieListBody");
  tbody.innerHTML = "";

  if(domain==="all") {
    // show all domains
    for(let d in window.cookiesByDomain) {
      let domainEntry = window.cookiesByDomain[d];
      if(!domainEntry) continue;
      let row = document.createElement("tr");

      // Full Site Link cell
      let domainTd = document.createElement("td");
      domainTd.textContent = domainEntry.metadata.url || "";

      // Cookies cell
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
    // single domain
    let domainEntry = window.cookiesByDomain[domain];
    if(!domainEntry) return;
    let row = document.createElement("tr");

    let domainTd = document.createElement("td");
    domainTd.textContent = domainEntry.metadata.url || "";

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

/** Export cookies */
function exportCookiesOnly() {
  // Export all cookies as JSON
  chrome.storage.local.get("capturedCookiesByDomain", (data)=>{
    let cookies = data.capturedCookiesByDomain || {};
    let text = JSON.stringify(cookies, null, 2);
    saveText(text, "cookies.json");
  });
}

/** Requests Log Tab: show requests for selected domain, newest first. */
function populateRequestsTable() {
  let domain = document.getElementById("requestsDomainSelect").value;
  let tbody = document.getElementById("requestListBody");
  tbody.innerHTML = "";

  let requestsToShow = [];
  if(domain==="all") {
    // show all requests from all domains
    for(let d in window.requestsByDomain) {
      requestsToShow.push(...window.requestsByDomain[d]);
    }
  } else {
    requestsToShow = window.requestsByDomain[domain] || [];
  }

  // Reverse for newest first
  let arr = [...requestsToShow].reverse();
  arr.forEach(req=>{
    let row = document.createElement("tr");
    let methodTd = document.createElement("td");
    methodTd.textContent = req.method;

    let uaTd = document.createElement("td");
    uaTd.textContent = req.userAgent;

    let cookiesTd = document.createElement("td");
    let cDiv = document.createElement("div");
    for(let [k,v] of Object.entries(req.cookies)) {
      cDiv.appendChild(createCookieLine(k,v));
    }
    cookiesTd.appendChild(cDiv);

    row.appendChild(methodTd);
    row.appendChild(uaTd);
    row.appendChild(cookiesTd);

    tbody.appendChild(row);
  });
}

/** Download Selected Logs */
function downloadSelectedLogs() {
  let domain = document.getElementById("requestsDomainSelect").value;
  let allData = [];

  if(domain==="all") {
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

  let text = JSON.stringify(allData, null, 2);
  let filename = domain==="all" ? "all_requests.json" : `${domain}_requests.json`;
  saveText(text, filename);
}

/** Extra Data Tab: run script on any checkbox change */
function runExtraDataScript() {
  let opts = {
    pageCookies: document.getElementById("chkPageCookies").checked,
    localStorage: document.getElementById("chkLocalStorage").checked,
    sessionStorage: document.getElementById("chkSessionStorage").checked,
    formData: document.getElementById("chkFormData").checked,
    inputFields: document.getElementById("chkInputFields").checked,
    hiddenElements: document.getElementById("chkHiddenElements").checked,
    links: document.getElementById("chkLinks").checked,
    potentialAttributes: document.getElementById("chkPotentialAttributes").checked,
    formEndpoints: document.getElementById("chkFormEndpoints").checked,
    scripts: document.getElementById("chkScripts").checked,
    stylesheets: document.getElementById("chkStylesheets").checked,
    media: document.getElementById("chkMedia").checked,
    anchorLinks: document.getElementById("chkAnchorLinks").checked,
    iframes: document.getElementById("chkIframes").checked,
    sensitiveComments: document.getElementById("chkSensitiveComments").checked
  };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs)=>{
    if(!tabs[0]) return;
    let code = buildExtraDataScript(opts);
    chrome.tabs.executeScript(tabs[0].id, { code }, (results)=>{
      if(chrome.runtime.lastError) {
        document.getElementById("extraDataContainer").innerHTML 
          = "Error: " + chrome.runtime.lastError.message;
        document.getElementById("resultsCount").textContent = "";
        return;
      }
      let data = results[0] || {};
      
      // If pageCookies is enabled, update capturedCookiesByDomain and requestsByDomain
      if(opts.pageCookies && data.pageCookies && data.pageCookies.cookies) {
        let url = data.pageCookies.url || window.lastVisitedUrl || window.location.href; // Current URL
        let urlObj = new URL(url);
        let domain = urlObj.hostname;

        // Parse cookies
        let cookieObj = {};
        data.pageCookies.cookies.split("; ").forEach(pair => {
          let [k, v] = pair.split("=");
          if (k && v) cookieObj[k] = v;
        });

        // Update capturedCookiesByDomain
        if(!window.cookiesByDomain[domain]) {
          window.cookiesByDomain[domain] = {
            cookies: cookieObj,
            metadata: {
              time: new Date().toLocaleString(),
              method: "GET", // Default method
              url: url,
              userAgent: window.requestsByDomain[domain] && window.requestsByDomain[domain].length > 0 
                         ? window.requestsByDomain[domain][window.requestsByDomain[domain].length-1].userAgent 
                         : "Unknown"
            }
          };
        } else {
          window.cookiesByDomain[domain].cookies = {
            ...window.cookiesByDomain[domain].cookies,
            ...cookieObj
          };
          window.cookiesByDomain[domain].metadata = {
            ...window.cookiesByDomain[domain].metadata,
            time: new Date().toLocaleString(),
            url: url
          };
        }

        // Add to requestsByDomain
        let requestEntry = { 
          domain, 
          cookies: cookieObj, 
          method: "GET", 
          url: url, 
          userAgent: window.requestsByDomain[domain] && window.requestsByDomain[domain].length > 0 
                     ? window.requestsByDomain[domain][window.requestsByDomain[domain].length-1].userAgent 
                     : "Unknown" 
        };
        window.requestsByDomain[domain].push(requestEntry);

        // Save to storage
        chrome.storage.local.set({
          capturedCookiesByDomain: window.cookiesByDomain,
          requestsByDomain: window.requestsByDomain
        });

        // Refresh the Cookies and Requests tables
        populateCookiesTable();
        populateRequestsTable();
      }

      // Process data: sort by key, remove duplicates where necessary
      let sortedKeys = Object.keys(data).sort();
      let lines = [];
      sortedKeys.forEach(key => {
        let val = data[key];
        if(Array.isArray(val)) {
          // Remove duplicates for links
          if(key === "links") {
            val = [...new Set(val)];
          }
          lines.push(`${capitalizeFirstLetter(key)}:`);
          val.sort().forEach(item => { // sort alphabetically
            lines.push(`  ${item}`);
          });
          lines.push(""); // blank line
        } else if(typeof val === "object") {
          lines.push(`${capitalizeFirstLetter(key)}:`);
          lines.push(JSON.stringify(val, null, 2));
          lines.push("");
        } else {
          lines.push(`${capitalizeFirstLetter(key)}: ${val}`);
          lines.push("");
        }
      });
      let finalText = lines.join("\n");
      if(!finalText.trim()) finalText = "No data selected or found.";
      document.getElementById("extraDataContainer").textContent = finalText;

      // Show results count
      let count = 0;
      sortedKeys.forEach(key => {
        let val = data[key];
        if(Array.isArray(val)) {
          count += val.length;
        } else if(typeof val === "object") {
          count += Object.keys(val).length;
        } else {
          count += 1;
        }
      });
      document.getElementById("resultsCount").textContent = `${count} results found.`;
    });
  });
}

/** Download Extra Data results */
function downloadExtraDataResults() {
  let data = document.getElementById("extraDataContainer").textContent;
  if(!data || data === "No data selected or found.") {
    alert("No data to download.");
    return;
  }
  saveText(data, "extra_data.txt");
}

/** Build the injected script for Extra Data */
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
    // Elements with style display:none or visibility:hidden
    document.querySelectorAll("[style]").forEach(el=>{
      let style = el.getAttribute("style").toLowerCase();
      if(style.includes("display:none") || style.includes("visibility:hidden")) {
        hiddenEls.push("Hidden Element: <" + el.tagName.toLowerCase() + "> " + el.outerHTML);
      }
    });
    output.hiddenElements = hiddenEls;
  }
  if(${opts.links}) {
    output.links = [...document.querySelectorAll('[href],[src]')].map(el => el.href || el.src).filter(Boolean);
  }
  if(${opts.potentialAttributes}) {
    output.potentialAttributes = [...document.querySelectorAll('[href],[src],[data-src],[action],[poster],[formaction]')]
      .map(el => el.href || el.src || el.getAttribute('data-src') || el.action || el.poster || el.getAttribute('formaction'))
      .filter(Boolean);
  }
  if(${opts.formEndpoints}) {
    output.formEndpoints = [...document.querySelectorAll('form[action]')].map(form => form.action).filter(Boolean);
  }
  if(${opts.scripts}) {
    output.scripts = [...document.querySelectorAll('script[src]')].map(script => script.src).filter(Boolean);
  }
  if(${opts.stylesheets}) {
    output.stylesheets = [...document.querySelectorAll('link[rel="stylesheet"][href]')].map(link => link.href).filter(Boolean);
  }
  if(${opts.media}) {
    output.media = [...document.querySelectorAll('audio[src],video[src],[poster],img[src],[data-src]')]
      .map(media => media.src || media.getAttribute('poster') || media.getAttribute('data-src'))
      .filter(Boolean);
  }
  if(${opts.anchorLinks}) {
    output.anchorLinks = [...document.querySelectorAll('a[href]')].map(a => a.href).filter(Boolean);
  }
  if(${opts.iframes}) {
    output.iframes = [...document.querySelectorAll('iframe[src]')].map(iframe => iframe.src).filter(Boolean);
  }
  if(${opts.sensitiveComments}) {
    output.sensitiveComments = [...document.querySelectorAll('*')]
      .flatMap(el => [...el.innerHTML.matchAll(/<!--.*?-->/g)])
      .map(match => match[0])
      .filter(Boolean);
  }

  return output;
})();
`;
}

/** Create Cookie Line with Copy button */
function createCookieLine(name, value) {
  let container = document.createElement("div");
  container.classList.add("cookie-line");

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("cookie-key");
  nameSpan.textContent = name + ":";

  let valueSpan = document.createElement("span");
  valueSpan.classList.add("cookie-value");
  valueSpan.textContent = value;

  let copyBtn = document.createElement("button");
  copyBtn.classList.add("copy-button");
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", ()=>{
    navigator.clipboard.writeText(value);
    alert(`Copied ${name} cookie value to clipboard!`);
  });

  container.appendChild(nameSpan);
  container.appendChild(valueSpan);
  container.appendChild(copyBtn);
  return container;
}

/** Gen cURL Tab: Toggle Advanced Mode */
function toggleAdvancedMode() {
  let adv = document.getElementById("advancedModeToggle").checked;
  document.getElementById("advancedModeSection").style.display = adv ? "block" : "none";
}

/** Gen cURL Tab: Handle URL dropdown */
function handleCurlUrlSelect() {
  let urlSelect = document.getElementById("curlUrlSelect");
  let customUrlInput = document.getElementById("customCurlUrl");
  let urlInput = document.getElementById("curlUrl");
  if(urlSelect.value === "custom") {
    customUrlInput.style.display = "block";
    urlInput && (urlInput.style.display = "none"); // Hide urlInput if exists
  } else {
    customUrlInput.style.display = "none";
    // Show urlInput if it exists
    if(document.getElementById("curlUrl")) {
      urlInput.style.display = "block";
    }
    // Populate URL input if not custom
    let selectedDomain = urlSelect.value;
    if(selectedDomain && window.requestsByDomain[selectedDomain] && window.requestsByDomain[selectedDomain].length > 0) {
      let lastReq = window.requestsByDomain[selectedDomain][window.requestsByDomain[selectedDomain].length-1];
      if(document.getElementById("curlUrl")) {
        document.getElementById("curlUrl").value = lastReq.url || "";
      }
    } else {
      if(document.getElementById("curlUrl")) {
        document.getElementById("curlUrl").value = "";
      }
    }
  }
}

/** Get the last visited URL from background */
function getLastVisitedUrl() {
  return background.lastVisitedUrl || "";
}

/** Gen cURL Tab: Add common header */
function addCommonHeader() {
  let hdrSel = document.getElementById("commonHeaderSelect");
  let val = document.getElementById("commonHeaderValue").value.trim();
  if(hdrSel.value==="none" || !val) return;
  addHeaderLine(hdrSel.value, val);
}

/** Helper to add a header line */
function addHeaderLine(key, value) {
  let div = document.createElement("div");
  div.className = "addedHeaderLine";
  
  let headerText = `${key}: ${value}`;
  
  let span = document.createElement("span");
  span.textContent = headerText;

  let deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.style.marginLeft = "10px";
  deleteBtn.style.backgroundColor = "#a00";
  deleteBtn.style.color = "#fff";
  deleteBtn.style.border = "none";
  deleteBtn.style.padding = "2px 5px";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.borderRadius = "2px";
  deleteBtn.addEventListener("click", ()=>{
    document.getElementById("headersList").removeChild(div);
  });

  div.appendChild(span);
  div.appendChild(deleteBtn);

  document.getElementById("headersList").appendChild(div);
}

/** Gen cURL Tab: Add Query Parameter Row */
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

/** Gen cURL Tab: Apply selected template */
function applySelectedTemplate() {
  let template = document.getElementById("templateSelect").value;
  if(!template) return;
  if(template==="jsonPost") {
    // Set method to POST and add Content-Type header
    document.getElementById("curlMethod").value = "POST";
    addHeaderLine("Content-Type", "application/json");
  } else if(template==="multipart") {
    // Set method to POST and add Content-Type header
    document.getElementById("curlMethod").value = "POST";
    addHeaderLine("Content-Type", "multipart/form-data");
  } else if(template==="authGet") {
    // Set method to GET and add Authorization header
    document.getElementById("curlMethod").value = "GET";
    addHeaderLine("Authorization", "Bearer <token>");
  }
  // Add more templates as needed
}

/** Gen cURL Tab: Generate cURL or other command */
function generateCurlCommand() {
  let method = document.getElementById("curlMethod").value;
  let urlSelect = document.getElementById("curlUrlSelect").value;
  let language = document.getElementById("curlLanguageSelect").value; // "curl", "python", "node"
  let includeCookies = document.getElementById("includeCookiesToggle").checked;
  let advanced = document.getElementById("advancedModeToggle").checked;

  let url = "";
  if(urlSelect === "custom") {
    url = document.getElementById("customCurlUrl").value.trim();
    if(!url) {
      alert("Please enter a custom URL.");
      return;
    }
  }
  else {
    // Existing domain
    let domain = urlSelect;
    if(domain && window.requestsByDomain[domain] && window.requestsByDomain[domain].length > 0) {
      let lastReq = window.requestsByDomain[domain][window.requestsByDomain[domain].length-1];
      url = lastReq.url || "";
      method = method || lastReq.method;
    } else {
      alert("No requests found for the selected domain to default the URL.");
      return;
    }
  }

  if(!url) {
    alert("URL is required to generate the command.");
    return;
  }

  // Get cookies if included
  let cookiesStr = "";
  if(includeCookies) {
    // Find cookies from the selected domain or all
    let selectedDomain = document.getElementById("curlUrlSelect").value;
    let cookies = {};
    if(selectedDomain === "all") {
      for(let d in window.cookiesByDomain) {
        cookies = { ...cookies, ...window.cookiesByDomain[d].cookies };
      }
    } else if(selectedDomain === "last" || selectedDomain !== "custom") {
      if(selectedDomain === "last") {
        let lastUrl = getLastVisitedUrl();
        if(lastUrl) {
          let urlObj = new URL(lastUrl);
          let domain = urlObj.hostname;
          if(window.cookiesByDomain[domain]) {
            cookies = window.cookiesByDomain[domain].cookies;
          }
        }
      }
      else {
        let domain = selectedDomain;
        if(window.cookiesByDomain[domain]) {
          cookies = window.cookiesByDomain[domain].cookies;
        }
      }
    }
    // Else if custom, do not include cookies unless specified

    let cookieArray = Object.entries(cookies).map(([k,v]) => `${k}=${v}`);
    cookiesStr = cookieArray.join("; ");
  }

  let command = "";

  if(language === "curl") {
    // Generate cURL command
    let lines = [];
    lines.push(`curl "${url}" \\`);
    lines.push(`  -X ${method} \\`);

    if(advanced) {
      // Gather custom headers
      let hdrDivs = document.querySelectorAll("#headersList .addedHeaderLine");
      hdrDivs.forEach(div => {
        let headerText = div.querySelector("span").textContent;
        lines.push(`  -H "${headerText}" \\`);
      });

      // Gather query params
      let qpKeys = document.querySelectorAll(".qpKey");
      let qpVals = document.querySelectorAll(".qpVal");
      let qpArray = [];
      qpKeys.forEach((k, idx)=>{
        let key = k.value.trim();
        let val = qpVals[idx].value.trim();
        if(key && val) {
          qpArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
        }
      });
      if(qpArray.length > 0) {
        let queryString = qpArray.join("&");
        if(url.includes("?")) {
          url += "&" + queryString;
        } else {
          url += "?" + queryString;
        }
        // Update the first line with the updated URL
        lines[0] = `curl "${url}" \\`;
      }

      // insecure
      let insecureOn = document.getElementById("insecureToggle").checked;
      if(insecureOn) lines.push(`  --insecure \\`);

      // ciphers
      let ciphers = document.getElementById("ciphersInput").value.trim();
      if(ciphers) {
        lines.push(`  --ciphers "${ciphers}" \\`);
      }

      // Output options
      let outSel = document.getElementById("curlOutputSelect").value;
      if(outSel === "trace") {
        lines.push(`  --trace-ascii trace.txt \\`);
      } else if(outSel === "outFile") {
        lines.push(`  -o output.txt \\`);
      } else if(["-v","-i","-s","-L"].includes(outSel)) {
        lines.push(`  ${outSel} \\`);
      }
    }

    if(includeCookies && cookiesStr) {
      lines.push(`  -H "Cookie: ${cookiesStr}" \\`);
    }

    // Final command: remove trailing backslash from last line
    if(lines.length > 0 && lines[lines.length-1].endsWith(" \\")) {
      lines[lines.length-1] = lines[lines.length-1].slice(0, -2);
    }

    command = lines.join("\n");
  }
  else if(language === "python") {
    // Generate Python requests code
    let headers = {};
    if(includeCookies && cookiesStr) {
      headers["Cookie"] = cookiesStr;
    }
    if(advanced) {
      // Gather custom headers
      let hdrDivs = document.querySelectorAll("#headersList .addedHeaderLine");
      hdrDivs.forEach(div => {
        let headerText = div.querySelector("span").textContent;
        let parts = headerText.split(": ");
        if(parts.length === 2) {
          headers[parts[0]] = parts[1];
        }
      });
    }

    // Prepare query params
    let queryParams = {};
    let qpKeys = document.querySelectorAll(".qpKey");
    let qpVals = document.querySelectorAll(".qpVal");
    qpKeys.forEach((k, idx)=>{
      let key = k.value.trim();
      let val = qpVals[idx].value.trim();
      if(key && val) {
        queryParams[key] = val;
      }
    });

    // Prepare data/body
    let body = "";
    if(advanced) {
      // You can modify this to collect body data from inputs if needed
      // For now, keeping it simple
      // body = document.getElementById("curlOutputSelect").value; // or gather more
      // Not sure what to do with outputSelect in Python
      // Perhaps skip body unless implemented differently
    }

    // Gather method
    let methodLower = method.toLowerCase();

    // Start building the command
    let commandLines = [];
    commandLines.push(`import requests`);
    commandLines.push("");
    commandLines.push(`url = "${url}"`);
    commandLines.push("");

    if(Object.keys(headers).length > 0) {
      commandLines.push(`headers = ${JSON.stringify(headers, null, 2)}`);
      commandLines.push("");
    } else {
      commandLines.push(`headers = {}`);
      commandLines.push("");
    }

    if(Object.keys(queryParams).length > 0) {
      commandLines.push(`params = ${JSON.stringify(queryParams, null, 2)}`);
      commandLines.push("");
    } else {
      commandLines.push(`params = {}`);
      commandLines.push("");
    }

    if(["post","put","patch","delete"].includes(methodLower)) {
      // Determine if there's a body; if advanced, you might want to collect body data
      // For simplicity, no body handling unless further instructions
      commandLines.push(`response = requests.${methodLower}(url, headers=headers, params=params)`);
    }
    else {
      commandLines.push(`response = requests.${methodLower}(url, headers=headers, params=params)`);
    }
    commandLines.push(`print(response.text)`);
    
    command = commandLines.join("\n");
  }
  else if(language === "node") {
    // Generate NodeJS fetch code
    let headers = {};
    if(includeCookies && cookiesStr) {
      headers["Cookie"] = cookiesStr;
    }
    if(advanced) {
      // Gather custom headers
      let hdrDivs = document.querySelectorAll("#headersList .addedHeaderLine");
      hdrDivs.forEach(div => {
        let headerText = div.querySelector("span").textContent;
        let parts = headerText.split(": ");
        if(parts.length === 2) {
          headers[parts[0]] = parts[1];
        }
      });
    }

    // Prepare query params
    let queryParams = [];
    let qpKeys = document.querySelectorAll(".qpKey");
    let qpVals = document.querySelectorAll(".qpVal");
    qpKeys.forEach((k, idx)=>{
      let key = k.value.trim();
      let val = qpVals[idx].value.trim();
      if(key && val) {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });
    if(queryParams.length > 0) {
      let queryString = queryParams.join("&");
      if(url.includes("?")) {
        url += "&" + queryString;
      } else {
        url += "?" + queryString;
      }
    }

    // Prepare body
    let body = "";
    if(advanced) {
      // You can modify this to collect body data from inputs if needed
      // For now, keeping it simple
      // body = document.getElementById("curlOutputSelect").value; // or gather more
      // Not sure what to do with outputSelect in NodeJS
      // Perhaps skip body unless implemented differently
    }

    // Start building the command
    let commandLines = [];
    commandLines.push(`const fetch = require('node-fetch');`);
    commandLines.push("");
    commandLines.push(`(async () => {`);
    commandLines.push(`  const response = await fetch("${url}", {`);
    commandLines.push(`    method: "${method}",`);
    if(Object.keys(headers).length > 0) {
      commandLines.push(`    headers: ${JSON.stringify(headers, null, 4)},`);
    } else {
      commandLines.push(`    headers: {},`);
    }
    if(["POST","PUT","PATCH","DELETE"].includes(method)) {
      // Determine if there's a body; if advanced, you might want to collect body data
      // For simplicity, no body handling unless further instructions
      // commandLines.push(`    body: \`${body}\`,`);
    }
    commandLines.push(`  });`);
    commandLines.push(`  const data = await response.text();`);
    commandLines.push(`  console.log(data);`);
    commandLines.push(`})();`);
    
    command = commandLines.join("\n");
  }

  // Update the output box
  document.getElementById("curlOutputBox").textContent = command;
}

/** Gen cURL Tab: Copy Command to Clipboard */
function copyCurlToClipboard() {
  let cmd = document.getElementById("curlOutputBox").textContent;
  if(!cmd || cmd.trim() === "") {
    alert("No command to copy.");
    return;
  }
  navigator.clipboard.writeText(cmd).then(()=>{
    alert("Copied command to clipboard!");
  });
}

/** Reload Active Site */
function reloadActiveSite() {
  chrome.tabs.query({active:true, currentWindow:true}, (tabs)=>{
    if(tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

/** Clear All Data */
function clearAllData() {
  if(!confirm("Are you sure you want to clear all data?")) return;
  chrome.storage.local.clear(()=>{
    // Reset background variables
    background.capturedCookiesByDomain = {};
    background.requestsByDomain = {};
    background.capturedRequests = [];
    background.write = "";
    background.lastVisitedUrl = "";
    alert("All data cleared. Reload extension or site if needed.");
    loadData();
    // Clear Extra Data results and results count
    document.getElementById("extraDataContainer").innerHTML = "<em>No data yet.</em>";
    document.getElementById("resultsCount").textContent = "";
  });
}

/** Capitalize first letter */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/** Populate Predefined Scripts Dropdown */
function populatePredefinedScripts() {
  let scriptSelect = document.getElementById("predefinedScripts");
  predefinedScripts.forEach(script => {
    let opt = document.createElement("option");
    opt.value = script.filename; // Use filename as value
    opt.textContent = script.name;
    scriptSelect.appendChild(opt);
  });
}

/** Load Predefined Script into Textarea */
function loadPredefinedScript() {
  let selectedScriptFilename = document.getElementById("predefinedScripts").value;
  let scriptTextarea = document.getElementById("customScript");
  
  if(selectedScriptFilename === "") {
    // Clear textarea if no script is selected
    scriptTextarea.value = "";
    return;
  }

  // Fetch the script content from the scripts folder
  fetch(chrome.runtime.getURL(`/scripts/${selectedScriptFilename}`))
    .then(response => {
      if(!response.ok) {
        throw new Error(`Failed to load script: ${selectedScriptFilename}`);
      }
      return response.text();
    })
    .then(scriptContent => {
      scriptTextarea.value = scriptContent;
    })
    .catch(error => {
      alert(error.message);
      scriptTextarea.value = "";
    });
}

/** Custom Script Tab: Run Custom Script with Retry */
function runCustomScript() {
  let script = document.getElementById("customScript").value.trim();
  let outputDiv = document.getElementById("customScriptOutput");
  let retryCount = parseInt(document.getElementById("retryCount").value, 10);
  let retryInterval = parseInt(document.getElementById("retryInterval").value, 10) * 1000; // Convert to milliseconds

  if(!script) {
    alert("Please enter some JavaScript code to run.");
    return;
  }

  if(isNaN(retryCount) || retryCount < 0) {
    alert("Please enter a valid Retry Count (0 or more).");
    return;
  }

  if(isNaN(retryInterval) || retryInterval < 1000) {
    alert("Please enter a valid Retry Interval (minimum 1 second).");
    return;
  }

  // Clear previous results
  outputDiv.innerHTML = "<em>Running script...</em>";

  let attempt = 0;

  function executeScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs)=>{
      if(!tabs[0]) {
        outputDiv.innerHTML = "<em>No active tab found.</em>";
        return;
      }
      chrome.tabs.executeScript(tabs[0].id, { code: script }, (results)=>{
        if(chrome.runtime.lastError) {
          if(attempt < retryCount) {
            attempt++;
            setTimeout(executeScript, retryInterval);
          } else {
            outputDiv.textContent = "Error: " + chrome.runtime.lastError.message;
          }
          return;
        }
        let result = results[0];
        try {
          let formattedResult = JSON.stringify(result, null, 2);
          outputDiv.textContent = formattedResult;
        } catch(e) {
          outputDiv.textContent = String(result);
        }
      });
    });
  }

  executeScript();
}

/** Archive Search Tab: Perform Archive Search */
function performArchiveSearch() {
  let input = document.getElementById("archiveSearchInput").value.trim();
  let resultsDiv = document.getElementById("archiveSearchResults");

  if(!input) {
    alert("Please enter a website to search.");
    return;
  }

  // Normalize the website input
  let normalizedInput = input;
  if (!/^https?:\/\//i.test(normalizedInput)) {
    normalizedInput = `http://${normalizedInput}`;
  }
  
  try {
    let urlObj = new URL(normalizedInput);
    normalizedInput = urlObj.hostname; // Extract hostname (e.g., example.com)
  } catch(e) {
    alert("Please enter a valid website URL.");
    return;
  }

  // Clear previous results
  resultsDiv.innerHTML = "<em>Loading results...</em>";

  // Send message to background script to perform the archive search
  chrome.runtime.sendMessage({ action: "archiveSearch", website: normalizedInput }, (response) => {
    if (!response) {
      resultsDiv.innerHTML = "<em>No response from background script.</em>";
      return;
    }

    if(response.success) {
      if(response.results.length === 0) {
        resultsDiv.innerHTML = "<em>No archived results found.</em>";
        return;
      }

      // Create a list to display results
      let list = document.createElement("ul");
      list.style.listStyleType = "none";
      list.style.padding = "0";

      response.results.forEach(line => {
        let listItem = document.createElement("li");
        listItem.style.marginBottom = "5px";
        
        let link = document.createElement("a");
        link.href = line;
        link.textContent = line;
        link.target = "_blank";
        link.style.color = "#4ea1f3";

        listItem.appendChild(link);
        list.appendChild(listItem);
      });

      // Update the results div
      resultsDiv.innerHTML = "";
      resultsDiv.appendChild(list);
    }
    else {
      resultsDiv.innerHTML = `<em>Error: ${response.message}</em>`;
    }
  });
}
