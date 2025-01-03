document.getElementById("login-button").addEventListener("click", () => {
  // Rediriger l'utilisateur vers la route d'authentification
  chrome.tabs.create({
    url: `https://octobranch-server.onrender.com/auth/github`,
  });
});

// Vérifier si l'utilisateur est déjà authentifié
chrome.storage.local.get("github_access_token", (data) => {
  const status = document.getElementById("status");
  if (data.github_access_token) {
    status.textContent = "Vous êtes connecté.";
  } else {
    status.textContent = "Vous n'êtes pas connecté.";
  }
});
