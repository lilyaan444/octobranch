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

  const repoHeader = document.querySelector(".repository-content");
  if (!repoHeader) return;

  const commitsContainer = document.createElement("div");
  commitsContainer.className = "octobranch-commits Box mt-3";

  const headerDiv = document.createElement("div");
  headerDiv.className = "Box-header";
  headerDiv.innerHTML = `
    <h2 class="Box-title">
      <svg class="octicon mr-2" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"></path>
      </svg>
      Derniers commits par branche
    </h2>
  `;
  commitsContainer.appendChild(headerDiv);

  const commitsListDiv = document.createElement("div");
  commitsListDiv.className = "Box-body";

  commits.forEach((branch, index) => {
    const branchDiv = document.createElement("div");
    branchDiv.className = `d-flex flex-items-start ${
      index !== 0 ? "border-top pt-3 mt-3" : ""
    }`;

    const commit = branch.commit;
    const date = new Date(commit.commit.author.date).toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    const timeAgo = timeSince(new Date(commit.commit.author.date));
    const shortSha = commit.sha.substring(0, 7);

    branchDiv.innerHTML = `
      <div class="flex-auto">
        <div class="d-flex flex-items-center mb-1">
          <svg class="octicon mr-2" viewBox="0 0 16 16" width="16" height="16" fill="#57606a">
            <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 019 8.5v2H7.75V14a.75.75 0 01-1.5 0V10.5H5A2.5 2.5 0 012.5 8V6a2.25 2.25 0 113 2.122V8.5a1 1 0 001 1h5a1 1 0 001-1V6a2.25 2.25 0 11.75-1.75zM8 8.5a.75.75 0 100 1.5.75.75 0 000-1.5zM5.75 6.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.5 6.75a.75.75 0 100-1.5.75.75 0 000 1.5zm2.75 0a.75.75 0 100-1.5.75.75 0 000 1.5z"></path>
          </svg>
          <span class="text-bold Link--primary mr-2">${branch.branch}</span>
          <span class="Label Label--secondary mr-1">dernier commit</span>
        </div>
        <div class="commit-message markdown-title">
          ${commit.commit.message}
        </div>
        <div class="text-small color-fg-muted mt-1">
          <a href="${
            commit.html_url
          }" class="Link--secondary mr-2" target="_blank">${shortSha}</a>
          <a href="${
            commit.author ? commit.author.html_url : "#"
          }" class="Link--secondary mr-2" target="_blank">
            <img src="${
              commit.author ? commit.author.avatar_url : ""
            }" class="avatar avatar-user" width="20" height="20" alt="${
      commit.commit.author.name
    }">
            ${commit.commit.author.name}
          </a>
          <span>commis le ${date} (${timeAgo})</span>
        </div>
      </div>
    `;

    commitsListDiv.appendChild(branchDiv);
  });

  commitsContainer.appendChild(commitsListDiv);
  repoHeader.prepend(commitsContainer);
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
