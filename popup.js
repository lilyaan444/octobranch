// État global pour la fenêtre d'authentification
let authWindow = null;

// Fonction pour gérer la connexion
function handleLogin() {
  const width = 800;
  const height = 600;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  authWindow = window.open(
    "https://octobranch-server.onrender.com/auth/github",
    "GitHubAuth",
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Écouter le message de la fenêtre d'authentification
  window.addEventListener("message", handleAuthMessage);
}

// Gérer le message reçu de la fenêtre d'authentification
function handleAuthMessage(event) {
  // Vérifier l'origine pour la sécurité
  if (event.origin !== "https://octobranch-server.onrender.com") return;

  if (event.data.type === "GITHUB_AUTH_SUCCESS" && event.data.token) {
    // Stocker le token
    chrome.storage.local.set(
      {
        github_access_token: event.data.token,
      },
      () => {
        // Mettre à jour l'interface
        updateUI(true);

        // Informer content.js
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

    // Retirer l'écouteur d'événements
    window.removeEventListener("message", handleAuthMessage);
  }
}

// Mettre à jour l'interface utilisateur
function updateUI(isAuthenticated) {
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const status = document.getElementById("status");
  const commitsContainer = document.getElementById("commits-container");

  if (isAuthenticated) {
    loginButton.style.display = "none";
    logoutButton.style.display = "block";
    status.textContent = "Connecté";
    status.className = "status status-connected";
    commitsContainer.style.display = "block";
    loadCommits();
  } else {
    loginButton.style.display = "block";
    logoutButton.style.display = "none";
    status.textContent = "Déconnecté";
    status.className = "status status-disconnected";
    commitsContainer.style.display = "none";
  }
}

// Gérer la déconnexion
function handleLogout() {
  chrome.storage.local.remove("github_access_token", () => {
    updateUI(false);

    // Informer content.js
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs
          .sendMessage(tabs[0].id, { type: "LOGOUT" })
          .catch((error) => console.log("Tab not ready yet"));
      }
    });
  });
}

// Charger les commits pour la page actuelle
async function loadCommits() {
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
        `https://octobranch-server.onrender.com/repo/${owner}/${repo}/commits?access_token=${token}`
      );

      if (!response.ok) throw new Error("Fetch failed");

      const commits = await response.json();
      displayCommits(commits);
    }
  } catch (error) {
    console.error("Error loading commits:", error);
  }
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  // Vérifier l'état de l'authentification
  chrome.storage.local.get("github_access_token", (data) => {
    updateUI(!!data.github_access_token);
  });

  // Ajouter les écouteurs d'événements
  document
    .getElementById("login-button")
    .addEventListener("click", handleLogin);
  document
    .getElementById("logout-button")
    .addEventListener("click", handleLogout);
});
