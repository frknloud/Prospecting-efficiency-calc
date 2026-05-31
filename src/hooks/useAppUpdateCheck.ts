import { useCallback, useEffect, useState } from "react";

const APP_VERSION_STORAGE_KEY = "prospecting-app-version-v1";
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type VersionPayload = {
  version?: string;
};

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const versionUrl = `${baseUrl}version.json?ts=${Date.now()}`;
    const response = await fetch(versionUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as VersionPayload;
    const version = payload.version?.trim();

    return version || null;
  } catch {
    return null;
  }
}

export function useAppUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchedVersion = await fetchLatestVersion();

    if (!fetchedVersion) {
      return;
    }

    const storedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);

    if (!storedVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, fetchedVersion);
      setLatestVersion(fetchedVersion);
      return;
    }

    if (storedVersion !== fetchedVersion) {
      setLatestVersion(fetchedVersion);
      setUpdateAvailable(true);
      return;
    }

    setLatestVersion(fetchedVersion);
    setUpdateAvailable(false);
  }, []);

  const refreshApp = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, latestVersion);
    }

    window.location.reload();
  }, [latestVersion]);

  useEffect(() => {
    void checkForUpdate();

    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);

    const handleFocus = () => {
      void checkForUpdate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForUpdate]);

  return {
    updateAvailable,
    refreshApp,
  };
}
