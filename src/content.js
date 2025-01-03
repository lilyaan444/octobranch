// Écouter les messages de la popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOGOUT") {
    removeCommitsDisplay();
  }
});

// Retirer l'affichage des commits
function removeCommitsDisplay() {
  const container = document.querySelector(".octobranch-commits");
  if (container) {
    container.remove();
  }
}

// Afficher les commits de manière stylisée
function displayCommits(commits) {
  removeCommitsDisplay();

  const sidebar = document.querySelector(".Layout-sidebar");
  if (!sidebar) return;

  const borderGrid = sidebar.querySelector(".BorderGrid");
  if (!borderGrid) return;

  const commitsContainer = document.createElement("div");
  commitsContainer.className = "octobranch-commits";

  commitsContainer.innerHTML = `
    <div class="BorderGrid-row">
      <div class="BorderGrid-cell">
        <div class="commits-header">
          <h2>
            <svg class="octicon" height="16" viewBox="0 0 16 16" width="16">
              <path fill="currentColor" d="M1.643 3.143.427 1.927A.25.25 0 0 0 0 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.5 6.5 0 1 1-1.18 4.458.75.75 0 1 0-1.493.154 8.001 8.001 0 1 0 1.6-5.684ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z"></path>
            </svg>
            Derniers commits par branche
          </h2>
        </div>
        
        <div class="branch-commits-list">
          ${commits
            .map(
              (branch) => `
            <div class="branch-commit-item">
              <div class="branch-name">
                <svg class="octicon" height="16" viewBox="0 0 16 16" width="16">
                  <path fill="currentColor" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 9 8.5v2H7.75V14a.75.75 0 0 1-1.5 0v-3.5H5A2.5 2.5 0 0 1 2.5 8V6a2.25 2.25 0 1 1 3 2.122V8.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6a2.25 2.25 0 1 1 .75-1.75ZM8 8.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM5.75 6.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm2.75 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm2.75 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"></path>
                </svg>
                <span class="truncate-text">${branch.branch}</span>
              </div>
              
              <a class="commit-message" href="${
                branch.commit.html_url
              }" title="${branch.commit.commit.message}">
                ${branch.commit.commit.message}
              </a>
              
              <div class="commit-meta">
                <a class="commit-author" href="${
                  branch.commit.author?.html_url || "#"
                }" title="${branch.commit.commit.author.name}">
                  <img class="avatar-user" src="${
                    branch.commit.author?.avatar_url || "/api/placeholder/20/20"
                  }" alt="${branch.commit.commit.author.name}">
                  <span class="truncate-text">${
                    branch.commit.commit.author.name
                  }</span>
                </a>
                <span>${timeSince(
                  new Date(branch.commit.commit.author.date)
                )}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  const firstRow = borderGrid.querySelector(".BorderGrid-row");
  if (firstRow) {
    firstRow.after(commitsContainer);
  } else {
    borderGrid.appendChild(commitsContainer);
  }
}

// Calculer le temps écoulé depuis une date
function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return `${Math.floor(interval)} ans`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return `${Math.floor(interval)} mois`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return `${Math.floor(interval)} jours`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return `${Math.floor(interval)} heures`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `${Math.floor(interval)} minutes`;
  }
  return `${Math.floor(seconds)} secondes`;
}

// Récupérer les commits avec le jeton d'accès
async function fetchCommits() {
  try {
    const data = await chrome.storage.local.get("github_access_token");
    const accessToken = data.github_access_token;

    if (!accessToken) return;

    const repoUrl = window.location.pathname.split("/");
    if (repoUrl.length >= 3 && repoUrl[1] && repoUrl[2]) {
      const owner = repoUrl[1];
      const repo = repoUrl[2];

      const response = await fetch(
        `https://octobranch-server.onrender.com/repo/${owner}/${repo}/commits?access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const commits = await response.json();
      displayCommits(commits);
    }
  } catch (error) {
    console.error("Error fetching commits:", error);
    // Optionnel: Afficher une notification d'erreur à l'utilisateur
    const errorDiv = document.createElement("div");
    errorDiv.className = "flash flash-error mt-3";
    errorDiv.textContent =
      "Une erreur est survenue lors de la récupération des commits.";
    const repoHeader = document.querySelector(".repository-content");
    if (repoHeader) {
      repoHeader.prepend(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000); // Retire la notification après 5 secondes
    }
  }
}

// Observer les changements dans le DOM pour les pages dynamiques
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" &&
        document.querySelector(".repository-content") &&
        !document.querySelector(".octobranch-commits")
      ) {
        fetchCommits();
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Écouter les événements de navigation
function listenToNavigation() {
  let lastUrl = location.href;

  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      removeCommitsDisplay();
      fetchCommits();
    }
  }).observe(document.querySelector("title"), {
    subtree: true,
    characterData: true,
    childList: true,
  });
}

// Initialiser l'extension
function initExtension() {
  // Vérifier si nous sommes sur une page de dépôt GitHub
  if (
    window.location.hostname === "github.com" &&
    window.location.pathname.split("/").length >= 3
  ) {
    fetchCommits();
    initObserver();
    listenToNavigation();
  }
}

// Démarrer l'extension
document.addEventListener("DOMContentLoaded", initExtension);
window.addEventListener("load", initExtension);
