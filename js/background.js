// ExportThisCookie/background.js

// Function to modify headers for CORS
function modifyHeaders(details) {
    const headers = details.responseHeaders;

    // Modify headers to allow CORS
    headers.push(
        { name: "Access-Control-Allow-Origin", value: "*" },
        { name: "Access-Control-Allow-Methods", value: "GET, OPTIONS, POST" },
        { name: "Access-Control-Allow-Headers", value: "*" }
    );

    return { responseHeaders: headers };
}

// Keep track of connected ports
let ports = [];

// Listen for connections (for Archive Search)
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "archiveSearch") {
        ports.push(port);
        console.log("Archive Search connected.");

        port.onDisconnect.addListener(function() {
            console.log("Archive Search disconnected.");
            ports = ports.filter(p => p !== port);
        });

        port.onMessage.addListener(function(message) {
            if (message.action === "fetchWaybackURLs") {
                console.log(`Received request to fetch URLs for domain: ${message.domain}`);
                fetchWaybackURLs(message.domain, port);
            }
        });
    }
});

// Function to enable CORS bypass
function enableCORSSupport() {
    chrome.webRequest.onHeadersReceived.addListener(
        modifyHeaders,
        { urls: ["https://web.archive.org/*"] }, // Restricting to web.archive.org for security
        ["blocking", "responseHeaders", "extraHeaders"]
    );

    console.log("CORS bypass enabled for web.archive.org.");
}

// Function to disable CORS bypass
function disableCORSSupport() {
    chrome.webRequest.onHeadersReceived.removeListener(modifyHeaders);
    console.log("CORS bypass disabled.");
}

// Initialize CORS setting based on storage
chrome.storage.local.get(['corsEnabled'], (data) => {
    if (data.corsEnabled) {
        enableCORSSupport();
    } else {
        disableCORSSupport();
    }
});

// Listen for changes in CORS setting
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.corsEnabled) {
        if (changes.corsEnabled.newValue) {
            enableCORSSupport();
        } else {
            disableCORSSupport();
        }
    }
});

// Function to fetch URLs from the Wayback Machine API and send them via port
async function fetchWaybackURLs(domain, port) {
    // Ensure the domain is properly encoded
    const encodedDomain = encodeURIComponent(domain);
    const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${encodedDomain}*&output=text&fl=original&collapse=urlkey`;

    console.log(`Fetching archive URLs for domain: ${domain}`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Error fetching data: ${response.status}`);
            port.postMessage({ type: "error", message: `Error fetching data: ${response.status}` });
            return;
        }

        // Process the response as a stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let { value, done } = await reader.read();
        let buffer = "";
        let total = 0;

        while (!done) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split("\n");
            buffer = lines.pop(); // Last line may be incomplete

            for (let line of lines) {
                if (line.trim() !== "") {
                    port.postMessage({ type: "url", url: line.trim() });
                    total++;
                }
            }

            ({ value, done } = await reader.read());
        }

        // Process any remaining buffer
        if (buffer.trim() !== "") {
            port.postMessage({ type: "url", url: buffer.trim() });
            total++;
        }

        port.postMessage({ type: "complete", total: total });
        console.log(`Fetch complete. Total URLs fetched: ${total}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        port.postMessage({ type: "error", message: error.message });
    }
}

// WebRequest Listener for Capturing Cookies and Logging Requests (from Response 1)
chrome.webRequest.onBeforeSendHeaders.addListener(
    handleRequest,
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["blocking", "requestHeaders", "extraHeaders"]
);

// Data structures for Cookies and Requests Log
var capturedCookiesByDomain = {};
var capturedRequests = [];
var requestsByDomain = {};
var write = "";

/**
 * handleRequest: capture cookies, user-agent, domain logs, etc.
 */
function handleRequest(details) {
    let requestHeaders = details.requestHeaders;

    // Find Cookie header if present
    let cookieHeader = requestHeaders.find(h => h.name.toLowerCase() === "cookie");
    let cookieValue = cookieHeader ? cookieHeader.value : "";

    let userAgentHeader = requestHeaders.find(h => h.name.toLowerCase() === "user-agent");
    let userAgentValue = userAgentHeader ? userAgentHeader.value : "";

    let urlObj = new URL(details.url);
    let domain = urlObj.hostname;

    // Parse cookies
    let cookieObj = {};
    cookieValue.split("; ").forEach(pair => {
        let [k, v] = pair.split("=");
        if (k && v) cookieObj[k] = v;
    });

    let metaData = {
        time: new Date().toLocaleString(),
        method: details.method,
        url: details.url,
        userAgent: userAgentValue
    };

    // Update domain cookie tracking
    if (!capturedCookiesByDomain[domain]) {
        capturedCookiesByDomain[domain] = {
            cookies: cookieObj,
            metadata: metaData
        };
    } else {
        // Merge new cookies into existing
        capturedCookiesByDomain[domain].cookies = {
            ...capturedCookiesByDomain[domain].cookies,
            ...cookieObj
        };
        capturedCookiesByDomain[domain].metadata = metaData;
    }

    // Add request to logs
    let requestEntry = { domain, cookies: cookieObj, ...metaData };
    capturedRequests.push(requestEntry);

    if (!requestsByDomain[domain]) {
        requestsByDomain[domain] = [];
    }
    requestsByDomain[domain].push(requestEntry);

    // Save everything
    chrome.storage.local.set({
        capturedCookiesByDomain,
        capturedRequests,
        requestsByDomain
    });

    // For cookie export (compatibility with older code)
    write = "cookies = " + JSON.stringify(cookieObj, null, 2);

    return { requestHeaders };
}

// /js/background.js

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
      capturedCookiesByDomain: {},
      requestsByDomain: {},
      lastVisitedUrl: ""
    });
  });
  
  // Listen to web requests to capture request data
  chrome.webRequest.onCompleted.addListener(
    function(details) {
      const { url, method, statusCode, type, responseHeaders, requestHeaders } = details;
  
      // Extract user-agent, cache-control, server from response headers
      let userAgent = "Unknown";
      let cacheControl = "Unknown";
      let server = "Unknown";
      if(responseHeaders) {
        responseHeaders.forEach(header => {
          let name = header.name.toLowerCase();
          if(name === "user-agent") {
            userAgent = header.value;
          }
          else if(name === "cache-control") {
            cacheControl = header.value;
          }
          else if(name === "server") {
            server = header.value;
          }
        });
      }
  
      // Extract cookies from request headers
      let cookies = {};
      if(requestHeaders) {
        requestHeaders.forEach(header => {
          if(header.name.toLowerCase() === "cookie") {
            header.value.split("; ").forEach(cookie => {
              let [k,v] = cookie.split("=");
              if(k && v) {
                cookies[k] = v;
              }
            });
          }
        });
      }
  
      // Attempt to get response size
      let size = details.responseBodySize || 0;
  
      // Derive "name" from last segment of the URL
      let name = "N/A";
      try {
        let idx = url.lastIndexOf("/");
        if(idx >= 0) {
          name = url.substring(idx+1) || "N/A";
        }
      } catch(e) { /* fallback to N/A */ }
  
      // Save to storage
      chrome.storage.local.get(["requestsByDomain"], (data) => {
        let requestsByDomain = data.requestsByDomain || {};
        let urlObj;
        try {
          urlObj = new URL(url);
        } catch(e) {
          return; // invalid URL
        }
        let domain = urlObj.hostname;
  
        // Initialize domain array if needed
        if(!requestsByDomain[domain]) {
          requestsByDomain[domain] = [];
        }
  
        let requestEntry = {
          url: url,
          name: name,
          cacheControl: cacheControl,
          server: server,
          userAgent: userAgent,
          cookies: cookies,
          type: type,
          size: size,
          method: method,
          status: statusCode,
          time: new Date().toLocaleString()
        };
  
        requestsByDomain[domain].push(requestEntry);
        chrome.storage.local.set({ requestsByDomain });
      });
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders", "extraHeaders"]
  );
  
  // Track last visited URL
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(changeInfo.url) {
      chrome.storage.local.set({ lastVisitedUrl: changeInfo.url });
    }
  });
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if(tab && tab.url) {
        chrome.storage.local.set({ lastVisitedUrl: tab.url });
      }
    });
  });
  