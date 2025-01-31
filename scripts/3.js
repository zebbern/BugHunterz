(() => {
    const injectionPatterns = [
      "search=", "q=", "query=", "id=", "page=", "redirect=", "ref=", 
      "next=", "url=", "callback=", "continue=", "path=", "file=", 
      "keyword=", "key=", "doc=", "debug=", "dir=", "folder=", "action=", 
      "login=", "logout=", "username=", "email=", "user=", "view=", 
      "lang=", "name=", "title=", "content=", "code=", "message=", 
      "token=", "csrf=", "sso=", "session=", "param="
    ];
  
    const regex = new RegExp(`(${injectionPatterns.join('|')})`, 'gi');
    const baseUrl = location.origin;
    const results = new Set();
  
    // 1. Search all visible attributes (e.g., href, src, data-href, action)
    document.querySelectorAll('[href],[src],[data-href],[action]').forEach(el => {
      const attrValue = el.href || el.src || el.getAttribute('data-href') || el.getAttribute('action');
      if (attrValue && regex.test(attrValue)) {
        const fullLink = attrValue.startsWith("http") ? attrValue : `${baseUrl}${attrValue}`;
        results.add(fullLink);
      }
    });
  
    // 2. Search inline scripts or text nodes for query parameters
    [...document.querySelectorAll('script')].forEach(el => {
      const textContent = el.innerHTML || el.textContent;
      if (textContent) {
        const matches = textContent.match(regex);
        if (matches) {
          matches.forEach(match => results.add(`${baseUrl} (Inline Script or Text Node): ${match}`));
        }
      }
    });
  
    // 3. Search comments for hidden query parameters
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
    let currentNode = walker.nextNode();
    while (currentNode) {
      const commentMatches = currentNode.nodeValue.match(regex);
      if (commentMatches) {
        commentMatches.forEach(match => results.add(`${baseUrl} (HTML Comment): ${match}`));
      }
      currentNode = walker.nextNode();
    }
  
    // Combine and print results
    console.log('All Detected URLs and Parameters:', [...results]);
    return [...results];
  })();