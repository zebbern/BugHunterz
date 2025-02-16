// extension/js/contentScript.js

// Immediately Invoked Function Expression (IIFE) to avoid polluting the global namespace
(() => {
    /**
     * Resource Extraction Function
     * Extracts various resource URLs from the webpage, including those in Shadow DOMs.
     * @returns {Array<string>} - An array of unique resource URLs.
     */
    const extractResources = (root = document) => {
      const resources = new Set();
      const stack = [root];
  
      while (stack.length) {
        const currentRoot = stack.pop();
  
        // Define the attributes to scan
        const attributes = [
          'href', 'src', 'data-src', 'action', 'poster', 'codebase', 'data',
          'content', 'formaction', 'ping', 'cite', 'manifest', 'archive',
          'profile', 'longdesc', 'usemap', 'itemtype', 'itemscope', 'itemid',
          'itemprop', 'icon', 'srcset', 'imagesrcset', 'image', 'preload',
          'download', 'integrity', 'canonical', 'opener', 'frameborder',
          'marginwidth', 'marginheight', 'background', 'value', 'placeholder',
          'alt', 'title', 'onerror', 'onclick', 'onload'
        ];
  
        // Build the attribute selector string
        const attributeSelector = attributes.map(attr => `[${attr}]`).join(', ');
        const elements = currentRoot.querySelectorAll(attributeSelector);
  
        elements.forEach(el => {
          attributes.forEach(attr => {
            const attrValue = el.getAttribute(attr);
            if (attrValue && typeof attrValue === 'string' && attrValue.trim().startsWith('http')) {
              resources.add(attrValue.trim());
            }
          });
        });
  
        // Traverse Shadow DOMs
        const shadowHosts = currentRoot.querySelectorAll('*');
        shadowHosts.forEach(host => {
          if (host.shadowRoot && !host.shadowRoot.__resourceExtracted) {
            host.shadowRoot.__resourceExtracted = true; // Prevent reprocessing
            stack.push(host.shadowRoot);
          }
        });
      }
  
      return Array.from(resources);
    };
  
    /**
     * Listener for Messages from Popup
     * Listens for 'EXTRACT_RESOURCES' messages and responds with extracted data.
     */
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if(request.action === "resolveIP") {
        const domain = request.domain;
        if(!domain) {
          sendResponse({ ip: null });
          return;
        }
    
        // Use DNS over HTTPS (DoH) to resolve domain to IP
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`)
          .then(response => response.json())
          .then(data => {
            if(data.Answer && data.Answer.length > 0) {
              // Extract the first A record
              const aRecord = data.Answer.find(record => record.type === 1);
              if(aRecord) {
                sendResponse({ ip: aRecord.data });
                return;
              }
            }
            sendResponse({ ip: null });
          })
          .catch(error => {
            sendResponse({ ip: null });
          });
    
        // Return true to indicate you wish to send a response asynchronously
        return true;
      }
    });
  })();
  