// Vérifier si un élément existe déjà sur la page
function elementExists(selector) {
  return document.querySelector(selector) !== null;
}

// Rediriger l'utilisateur pour l'authentification
function authenticateWithGitHub() {
  window.location.href = `https://octobranch-server.onrender.com/auth/github`;
}

// Récupérer les commits avec le jeton d'accès
function fetchCommits(accessToken) {
  const repoUrl = window.location.pathname.split("/");
  if (repoUrl.length >= 3 && repoUrl[1] && repoUrl[2]) {
    const owner = repoUrl[1];
    const repo = repoUrl[2];

    fetch(
      `https://octobranch-server.onrender.com/repo/${owner}/${repo}/commits?access_token=${accessToken}`
    )
      .then((response) => response.json())
      .then((data) => {
        displayCommits(data);
      })
      .catch((error) => {
        console.error("Error fetching commits:", error);
      });
  }
}

// Afficher les commits de manière stylisée
function displayCommits(commits) {
  const repoHeader = document.querySelector(".repository-content");
  if (!repoHeader || elementExists(".octobranch-commits")) return;

  const commitsContainer = document.createElement("div");
  commitsContainer.className = "octobranch-commits";

  const title = document.createElement("h2");
  title.textContent = "Derniers commits par branche";
  title.className = "octobranch-title";
  commitsContainer.appendChild(title);

  commits.forEach((branch) => {
    const branchDiv = document.createElement("div");
    branchDiv.className = "octobranch-branch";

    const branchName = document.createElement("h3");
    branchName.textContent = branch.branch;
    branchName.className = "octobranch-branch-name";
    branchDiv.appendChild(branchName);

    const commitMessage = document.createElement("p");
    commitMessage.textContent = branch.commit.commit.message;
    commitMessage.className = "octobranch-commit-message";
    branchDiv.appendChild(commitMessage);

    const commitAuthor = document.createElement("p");
    commitAuthor.textContent = `Par ${branch.commit.commit.author.name}`;
    commitAuthor.className = "octobranch-commit-author";
    branchDiv.appendChild(commitAuthor);

    commitsContainer.appendChild(branchDiv);
  });

  repoHeader.prepend(commitsContainer);
}

// Ajouter un bouton de connexion stylisé
function addLoginButton() {
  const repoHeader = document.querySelector(".repository-content");
  if (!repoHeader || elementExists("#octobranch-login-button")) return;

  const loginButton = document.createElement("button");
  loginButton.id = "octobranch-login-button";
  loginButton.textContent = "Se connecter avec GitHub";
  loginButton.className = "octobranch-login-button";

  loginButton.addEventListener("click", () => {
    authenticateWithGitHub();
  });

  repoHeader.prepend(loginButton);
}

// Vérifier si l'utilisateur est déjà authentifié
function checkAuthentication() {
  chrome.storage.local.get("github_access_token", (data) => {
    if (data.github_access_token) {
      fetchCommits(data.github_access_token);
    } else {
      addLoginButton();
    }
  });
}

// Stocker le jeton d'accès après l'authentification
function storeAccessToken(accessToken) {
  chrome.storage.local.set({ github_access_token: accessToken }, () => {
    console.log("Access token stored.");
    fetchCommits(accessToken);
  });
}

// Vérifier si l'URL contient un jeton d'accès (après redirection)
function checkForAccessToken() {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = urlParams.get("access_token");

  if (accessToken) {
    storeAccessToken(accessToken);
    // Nettoyer l'URL pour éviter d'exposer le jeton
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Démarrer le processus
function initExtension() {
  checkForAccessToken();
  checkAuthentication();
}

// Observer les changements dans le DOM pour les pages dynamiques
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      initExtension();
    }
  });
});

// Démarrer l'observation
observer.observe(document.body, { childList: true, subtree: true });

// Démarrer le processus initial
window.addEventListener("load", () => {
  initExtension();
});
