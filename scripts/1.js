(() => {
    const patterns = [
      "/login", "/signin", "/auth", "/dashboard", "/admin", "/panel", "/control",
      "/cpanel", "/register", "/signup", "/createaccount", "/user", "/manager",
      "/portal", "/backend", "/console", "/auth/login", "/admin/login",
      "/register/new", "/admin/panel", "/account/login", "/management",
      "/auth/panel", "/admincp", "/admin-console", "/admin-dashboard", "/secure-login",
      "/secure-register", "/user-login", "/account-management", "/account/panel",
      "/user-management", "/admin/auth", "/auth/account", "/admin/access",
      "/admin/secure", "/auth/dashboard", "/admin-login", "/access/login",
      "/secure/auth", "/register/user", "/new-account", "/user/signup", "/join-now",
      "/create-account", "/join", "/access/panel", "/secure/dashboard", "/auth/register",
      "/secure/panel", "/admin/user", "/auth/console", "/admin/console",
      "/cp/admin", "/dashboard/auth", "/dashboard/login", "/login-panel",
      "/login-console", "/panel-login", "/user-panel", "/admincp/console",
      "/secure-console", "/management/login", "/management-panel", "/dashboard/register",
      "/dashboard/panel", "/auth-management", "/admin-signin", "/account/signin",
      "/member-login", "/signin-panel", "/admin-dashboard/login", "/controlpanel",
      "/authportal", "/register-panel", "/signup-panel", "/user-signin",
      "/user-dashboard", "/secure-access", "/root-admin", "/backend-console",
      "/management-console", "/admin-access", "/secure-admin", "/root-panel",
      "/admin-console/auth", "/management-dashboard", "/admincontrol", "/dashboard-user",
      "/console-panel", "/register/secure", "/secure-management", "/auth-control",
      "/admin-control", "/admin-control-panel", "/user-console", "/secure-login-panel",
      "/signup-now", "/join-account", "/authuser", "/cp-management", "/root-login",
      "/management-access", "/secure/auth/login", "/admincp/dashboard", "/usercontrol",
      "/root-dashboard", "/admin/dashboard/login", "/auth/admin/panel",
      "/admin/auth/console", "/admin/login/secure", "/console/login", "/cp/dashboard",
      "/register/user-panel", "/root-access", "/admin/auth-control"
    ];
  
    // Convert the patterns list into a regex for matching
    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  
    const results = new Set();
  
    // 1. Search all visible attributes (e.g., href, src, data-href, action)
    document.querySelectorAll('[href],[src],[data-href],[action]').forEach(el => {
      const attrValue = el.href || el.src || el.getAttribute('data-href') || el.getAttribute('action');
      if (attrValue && regex.test(attrValue)) {
        results.add(attrValue.match(regex)[0]); // Add the matched part only
      }
    });
  
    // 2. Search inline scripts or text nodes for embedded paths
    [...document.querySelectorAll('script, *')].forEach(el => {
      const textContent = el.innerHTML || el.textContent;
      if (textContent) {
        const matches = textContent.match(regex);
        if (matches) matches.forEach(match => results.add(match));
      }
    });
  
    // 3. Search comments for hidden paths
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
    let currentNode = walker.nextNode();
    while (currentNode) {
      const commentPaths = currentNode.nodeValue.match(regex);
      if (commentPaths) commentPaths.forEach(match => results.add(match));
      currentNode = walker.nextNode();
    }
  
    // Print matched paths
    console.log('Matched Paths:', [...results]);
    return [...results];
  })();
  