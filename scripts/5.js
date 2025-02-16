(() => {
    const extractResources = (root = document) => [
      ...root.querySelectorAll(`
        [href], [src], [data-src], [action], [poster], [codebase], [data], 
        [content], [formaction], [ping], [cite], [manifest], [archive], 
        [profile], [longdesc], [usemap], [itemtype], [itemscope], [itemid], 
        [itemprop], [icon], [srcset], [imagesrcset], [image], [preload], 
        [download], [integrity], [canonical], [opener], [frameborder], 
        [marginwidth], [marginheight], [background], [value], [placeholder], 
        [alt], [title], [onerror], [onclick], [onload]
      `),
      ...[...root.querySelectorAll('*')]
        .filter(el => el.shadowRoot) // Include shadow DOMs
        .flatMap(el => extractResources(el.shadowRoot))
    ]
      .filter(el => el && typeof el.getAttribute === 'function') // Validate nodes
      .map(el =>
        el.href || 
        el.src || 
        el.getAttribute('data-src') || 
        el.action || 
        el.poster || 
        el.codebase || 
        el.data || 
        el.content || 
        el.getAttribute('formaction') || 
        el.getAttribute('ping') || 
        el.cite || 
        el.getAttribute('manifest') || 
        el.getAttribute('archive') || 
        el.getAttribute('profile') || 
        el.getAttribute('longdesc') || 
        el.getAttribute('usemap') || 
        el.getAttribute('itemtype') || 
        el.getAttribute('itemscope') || 
        el.getAttribute('itemid') || 
        el.getAttribute('itemprop') || 
        el.getAttribute('icon') || 
        el.getAttribute('srcset') || 
        el.getAttribute('imagesrcset') || 
        el.getAttribute('image') || 
        el.getAttribute('preload') || 
        el.getAttribute('download') || 
        el.getAttribute('integrity') || 
        el.getAttribute('canonical') || 
        el.getAttribute('opener') || 
        el.getAttribute('frameborder') || 
        el.getAttribute('marginwidth') || 
        el.getAttribute('marginheight') || 
        el.getAttribute('background') || 
        el.getAttribute('value') || 
        el.getAttribute('placeholder') || 
        el.getAttribute('alt') || 
        el.getAttribute('title') || 
        el.getAttribute('onerror') || 
        el.getAttribute('onclick') || 
        el.getAttribute('onload')
      )
      .filter(Boolean);
  
    // Collect all static resources
    let resources = extractResources();
  
    // Monitor for dynamic content (XHR/Fetch requests)
    const interceptDynamicResources = () => {
      const originalXHR = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        console.log('XHR Request:', url);
        resources.push(url);
        originalXHR.apply(this, arguments);
      };
  
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('Fetch Request:', args[0]);
        resources.push(args[0]);
        return originalFetch.apply(this, args);
      };
    };
  
    interceptDynamicResources();
  
    // Extract JavaScript variables with URLs
    const extractJSVariables = () => {
      Object.keys(window).forEach(key => {
        try {
          const value = window[key];
          if (typeof value === 'string' && value.includes('http')) {
            console.log('JS Variable:', value);
            resources.push(value);
          }
        } catch {}
      });
    };
    extractJSVariables();
  
    // Simulate user interactions
    const simulateInteractions = () => {
      document.querySelectorAll('button, input[type="submit"], a').forEach(el => {
        try {
          el.click();
          console.log('Clicked:', el);
        } catch {}
      });
    };
    simulateInteractions();
  
    // Remove duplicates and output results
    resources = [...new Set(resources)]; // Remove duplicates
    console.log('Extracted Resources:', resources);
    return resources;
  })();
  