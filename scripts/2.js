(() => {
    const subdomainRegex = /\b([a-z0-9-]+\.)+[a-z]{2,}\b/gi; // Matches subdomains
    const baseDomain = location.hostname.split('.').slice(-2).join('.'); // Extract base domain
    const results = new Set();
  
    // 1. Search all visible attributes (e.g., href, src, data-href, action)
    document.querySelectorAll('[href],[src],[data-href]').forEach(el => {
      const attrValue = el.href || el.src || el.getAttribute('data-href');
      if (attrValue && subdomainRegex.test(attrValue)) {
        const match = attrValue.match(subdomainRegex).filter(sub => sub.includes(baseDomain));
        match.forEach(sub => results.add(sub));
      }
    });
  
    // 2. Search inline scripts or text nodes for embedded subdomains
    [...document.querySelectorAll('script, *')].forEach(el => {
      const textContent = el.innerHTML || el.textContent;
      if (textContent) {
        const matches = textContent.match(subdomainRegex);
        if (matches) {
          matches.filter(sub => sub.includes(baseDomain)).forEach(match => results.add(match));
        }
      }
    });
  
    // 3. Search comments for hidden subdomains
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
    let currentNode = walker.nextNode();
    while (currentNode) {
      const commentMatches = currentNode.nodeValue.match(subdomainRegex);
      if (commentMatches) {
        commentMatches.filter(sub => sub.includes(baseDomain)).forEach(match => results.add(match));
      }
      currentNode = walker.nextNode();
    }
  
    // Print matched subdomains
    console.log('Subdomains Found:', [...results]);
    return [...results];
  })();
  