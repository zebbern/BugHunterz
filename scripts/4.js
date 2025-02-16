(() => {


    const scanPageForSensitiveInfo = () => {
      const baseUrl = window.location.origin;
      const content = document.body.innerHTML;
  
      const patterns = {
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        gmails: /\b[A-Za-z0-9._%+-]+@gmail\.com\b/g,
        phoneNumbers: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,3}\)?[-.\s]?){1,4}\d{4}\b/g,
        loginUrls: /\b(?:login|signin|auth|dashboard|cpanel|portal|admin|user-login|access|secure-login|authenticate|users\/login|accounts\/login|auth\/login|session\/login|user\/auth|account\/login|auth\/session|member-login|secure-access|login-secure|.*\/login)\/?\b/gi,
        registerUrls: /\b(?:register|signup|createaccount|newuser|join|enroll|sign-up|subscribe|users\/register|accounts\/signup|auth\/signup|register\/new|member-register|secure-register|create-user|join-now|register-now|.*\/register)\/?\b/gi,
        adminPanels: /\b(?:admin|administrator|root|backend|control|cpanel|secure-admin|dashboard|manage|management|controlpanel|admin-panel|.*\/admin|.*\/administrator|admin\/login|admin\/auth|admin\/secure|admin\/console|secure\/admin|admincp|control-panel|.*\/admincp|.*\/secure-admin|.*\/root-admin|.*\/backend-admin|.*\/management)\/?\b/gi,
        socialMediaLinks: /\b(?:facebook|twitter|instagram|linkedin|youtube|tiktok|snapchat|pinterest|reddit|tumblr|discord|flickr|medium|vk|weibo|line|quora|twitch|telegram|dribbble|behance|vimeo|strava|github|gitlab|stackoverflow|bitbucket|producthunt|hackernews|rss)\.com\/[A-Za-z0-9._%-]+/gi,
        configFiles: /\b(?:config|settings|dbconfig|database|env|credentials|secrets|configfile|production|debug|log|error|backup|archive|auth|keyfile|config-backup|secret)\.(?:env|ini|conf|config|properties|yaml|yml|json|xml|log|txt|sql|db|sqlite|bak|php|html|js|py|rb|java|c|cpp|ts|jsx|tsx|css|scss|less|tmp|old|swp|orig|gz|tar|zip|trace|dump|csv|mdb|accdb|tsv|ndb|frm|ibd)\b/gi,
        sensitiveComments: /<!--.*?(?:password|key|token|secret|credentials|user|login|config|debug|api|aws|private|session).*?-->/gi,
        awsKeys: /\b(?:AKIA|ASIA|ANPA|A3T[A-Z0-9]{17}|[A-Z0-9]{20})\b/g,
        privateKeys: /-----BEGIN (?:RSA|EC|DSA)? PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA)? PRIVATE KEY-----/g,
        jwtTokens: /\beyJ[a-zA-Z0-9._-]+\b/g,
        subdomains: /\b(?:[A-Za-z0-9-]+\.)+(?:com|net|org|edu|gov|io|co|us|uk|de|fr|es|ru|cn|au|in|jp|br|it|ca|nl|se|no|fi|ch|be|pl|dk|cz|kr|tw|za|sg|nz|tr|mx|ar|sa|id|th|pt|gr|hk|il|ie|cl)\b/gi,
        pathTraversal: /(?:\/\.\.\/)+/gi,
        pathTraversalSensitiveFiles: /(?:\/\.\.\/)+.*\.(?:env|ini|conf|config|properties|yaml|yml|json|xml|log|txt|sql|db|sqlite|bak|php|html|js|py|rb|java|c|cpp|ts|jsx|tsx|css|scss|less|tmp|old|gz|tar|zip|trace|dump|csv|mdb|accdb|tsv|ndb|frm|ibd)\b/gi,
        deepPaths: /\/(?:[^\/]+\/){10,}/gi, // Paths with 10 or more directories
        hiddenElements: /<[^>]*(?:hidden|display\s*:\s*none|opacity\s*:\s*0|visibility\s*:\s*hidden)[^>]*>/gi
      };
  
   
      const getUniqueMatches = (pattern) => {
        const matches = content.match(pattern);
        return matches ? Array.from(new Set(matches)) : [];
      };
  
  
      const formatUrl = (path, base) => {
        return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
      };
  
  
      const scanContent = () => {
        return {
          emails: getUniqueMatches(patterns.emails),
          gmails: getUniqueMatches(patterns.gmails),
          phoneNumbers: getUniqueMatches(patterns.phoneNumbers),
          loginUrls: getUniqueMatches(patterns.loginUrls).map(path => formatUrl(path, baseUrl)),
          registerUrls: getUniqueMatches(patterns.registerUrls).map(path => formatUrl(path, baseUrl)),
          adminPanels: getUniqueMatches(patterns.adminPanels).map(path => formatUrl(path, baseUrl)),
          socialMediaLinks: getUniqueMatches(patterns.socialMediaLinks),
          configFiles: getUniqueMatches(patterns.configFiles).map(path => formatUrl(path, baseUrl)),
          sensitiveComments: getUniqueMatches(patterns.sensitiveComments),
          awsKeys: getUniqueMatches(patterns.awsKeys),
          privateKeys: getUniqueMatches(patterns.privateKeys),
          jwtTokens: getUniqueMatches(patterns.jwtTokens),
          subdomains: getUniqueMatches(patterns.subdomains),
          pathTraversal: getUniqueMatches(patterns.pathTraversal).map(path => `${baseUrl}${path}`),
          pathTraversalSensitiveFiles: getUniqueMatches(patterns.pathTraversalSensitiveFiles).map(path => `${baseUrl}${path}`),
          deepPaths: getUniqueMatches(patterns.deepPaths),
          hiddenElements: getUniqueMatches(patterns.hiddenElements)
        };
      };
  
  
      const sendResultsToExtension = (results) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'SENSITIVE_INFO_RESULTS', data: results }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
            } else {
              console.log('Message sent successfully:', response);
            }
          });
        } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
          browser.runtime.sendMessage({ type: 'SENSITIVE_INFO_RESULTS', data: results })
            .then(response => {
              console.log('Message sent successfully:', response);
            })
            .catch(error => {
              console.error('Error sending message:', error);
            });
        } else {
          console.error('Neither chrome.runtime.sendMessage nor browser.runtime.sendMessage is available.');
        }
      };
  
  
      const logResults = (results) => {
        console.group('Extracted Sensitive Information');
        for (const [key, value] of Object.entries(results)) {
          console.groupCollapsed(`${key} (${value.length})`);
          console.log(value);
          console.groupEnd();
        }
        console.groupEnd();
      };
  
  
      const exportResults = (data, filename = 'sensitive_info.json') => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      };
  
  
      const results = scanContent();
  
      logResults(results);
  
      sendResultsToExtension(results);
  
    };
  
  
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      scanPageForSensitiveInfo();
    } else {
      document.addEventListener('DOMContentLoaded', scanPageForSensitiveInfo);
    }
  })();
  