try {
      const savedTheme = localStorage.getItem("offensive-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : (prefersDark ? "dark" : "light");
    } catch (error) {
      document.documentElement.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      window.themePreferenceError = error.message;
    }
