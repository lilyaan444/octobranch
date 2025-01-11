let authWindow = null;
let isFetching = false;

function handleLogin() {
  const width = 800;
  const height = 600;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  authWindow = window.open(
    "https://octobranch-cb873ad14131.herokuapp.com/auth/github",
    "GitHubAuth",
    `width=${width},height=${height},left=${left},top=${top}`
  );

  window.addEventListener("message", handleAuthMessage);
}

function handleAuthMessage(event) {
  if (event.origin !== "https://octobranch-cb873ad14131.herokuapp.com") return;

  if (event.data.type === "GITHUB_AUTH_SUCCESS" && event.data.token) {
    chrome.storage.local.set(
      {
        github_access_token: event.data.token,
      },
      () => {
        updateUI(true);

        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs
                .sendMessage(tabs[0].id, { type: "AUTH_SUCCESS" })
                .catch((error) => console.log("Tab not ready yet"));
            }
          }
        );
      }
    );

    window.removeEventListener("message", handleAuthMessage);
  }
}

function updateUI(isAuthenticated) {
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const status = document.getElementById("status");
  const settings = document.getElementById("settings");

  if (isAuthenticated) {
    loginButton.style.display = "none";
    logoutButton.style.display = "block";
    status.textContent = "Connecté";
    status.className = "status status-connected";
    settings.style.display = "block";
    loadSettings();
  } else {
    loginButton.style.display = "block";
    logoutButton.style.display = "none";
    status.textContent = "Déconnecté";
    status.className = "status status-disconnected";
    settings.style.display = "none";
  }
}

function handleLogout() {
  chrome.storage.local.remove("github_access_token", () => {
    updateUI(false);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs
          .sendMessage(tabs[0].id, { type: "LOGOUT" })
          .catch((error) => console.log("Tab not ready yet"));
      }
    });
  });
}

function loadSettings() {
  chrome.storage.local.get(
    ["commitsPerBranch", "theme", "fontSize"],
    (data) => {
      document.getElementById("commits-per-branch").value =
        data.commitsPerBranch || 1;
      document.getElementById("theme").value = data.theme || "light";
      document.getElementById("font-size").value = data.fontSize || 14;
    }
  );
}

function saveSettings(event) {
  event.preventDefault();

  const commitsPerBranch = document.getElementById("commits-per-branch").value;
  const theme = document.getElementById("theme").value;
  const fontSize = document.getElementById("font-size").value;

  chrome.storage.local.set(
    {
      commitsPerBranch,
      theme,
      fontSize,
    },
    () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs
            .sendMessage(tabs[0].id, { type: "SETTINGS_UPDATED" })
            .catch((error) => console.log("Tab not ready yet"));
        }
      });
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("github_access_token", (data) => {
    updateUI(!!data.github_access_token);
  });

  document
    .getElementById("login-button")
    .addEventListener("click", handleLogin);
  document
    .getElementById("logout-button")
    .addEventListener("click", handleLogout);
  document
    .getElementById("settings-form")
    .addEventListener("submit", saveSettings);
});

async function loadCommits() {
  if (isFetching) return;
  isFetching = true;

  try {
    const token = await new Promise((resolve) => {
      chrome.storage.local.get("github_access_token", (data) => {
        resolve(data.github_access_token);
      });
    });

    if (!token) return;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = new URL(tab.url);
    const pathParts = url.pathname.split("/");

    if (pathParts.length >= 3) {
      const owner = pathParts[1];
      const repo = pathParts[2];

      const response = await fetch(
        `https://octobranch-cb873ad14131.herokuapp.com/repo/${owner}/${repo}/commits?access_token=${token}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!response.ok) throw new Error("Fetch failed");

      const commits = await response.json();
      displayCommits(commits);
    }
  } catch (error) {
    console.error("Error loading commits:", error);
  } finally {
    isFetching = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("github_access_token", (data) => {
    updateUI(!!data.github_access_token);
  });

  document
    .getElementById("login-button")
    .addEventListener("click", handleLogin);
  document
    .getElementById("logout-button")
    .addEventListener("click", handleLogout);
});

function listenToNavigation() {
  let lastUrl = location.href;

  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      removeCommitsDisplay();
      loadCommits();
    }
  }).observe(document.querySelector("title"), {
    subtree: true,
    characterData: true,
    childList: true,
  });
}
