import "./popup.css";

type SettingsMessage =
  | { type: "youtube-engage-o-meter:getSettings" }
  | { enabled: boolean; type: "youtube-engage-o-meter:setDebugDetails" }
  | {
      enabled: boolean;
      type: "youtube-engage-o-meter:setShowInformationalBanners";
    };
type SettingsResponse = {
  debugDetailsEnabled: boolean;
  showInformationalBanners: boolean;
};

const informationalBannersToggle = document.querySelector<HTMLInputElement>(
  "#informational-banners-toggle",
);
const debugToggle = document.querySelector<HTMLInputElement>(
  "#debug-details-toggle",
);
const statusMessage =
  document.querySelector<HTMLParagraphElement>("#debug-status");

function setStatus(message: string): void {
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

function setToggleEnabled(enabled: boolean): void {
  if (informationalBannersToggle) {
    informationalBannersToggle.disabled = !enabled;
  }

  if (debugToggle) {
    debugToggle.disabled = !enabled;
  }
}

function getActiveTabId(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (activeTab?.id === undefined) {
        reject(new Error("No active tab found."));
        return;
      }

      resolve(activeTab.id);
    });
  });
}

function sendSettingsMessage(
  message: SettingsMessage,
): Promise<SettingsResponse> {
  return getActiveTabId().then(
    (tabId) =>
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response: unknown) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (
            !response ||
            typeof response !== "object" ||
            !("debugDetailsEnabled" in response) ||
            typeof response.debugDetailsEnabled !== "boolean" ||
            !("showInformationalBanners" in response) ||
            typeof response.showInformationalBanners !== "boolean"
          ) {
            reject(new Error("No settings response received."));
            return;
          }

          resolve(response);
        });
      }),
  );
}

function applySettings(response: SettingsResponse): void {
  if (informationalBannersToggle) {
    informationalBannersToggle.checked = response.showInformationalBanners;
  }

  if (debugToggle) {
    debugToggle.checked = response.debugDetailsEnabled;
  }
}

async function refreshSettings(): Promise<void> {
  setToggleEnabled(false);
  setStatus("Checking current tab...");

  try {
    const response = await sendSettingsMessage({
      type: "youtube-engage-o-meter:getSettings",
    });

    applySettings(response);
    setToggleEnabled(true);
    setStatus("Settings loaded.");
  } catch {
    if (informationalBannersToggle) {
      informationalBannersToggle.checked = true;
    }

    if (debugToggle) {
      debugToggle.checked = false;
    }

    setStatus("Open a YouTube watch page to change settings.");
  }
}

async function handleInformationalBannersToggleChange(): Promise<void> {
  if (!informationalBannersToggle) {
    return;
  }

  const nextEnabled = informationalBannersToggle.checked;
  setToggleEnabled(false);
  setStatus("Saving...");

  try {
    const response = await sendSettingsMessage({
      enabled: nextEnabled,
      type: "youtube-engage-o-meter:setShowInformationalBanners",
    });

    applySettings(response);
    setStatus("Settings saved.");
    setToggleEnabled(true);
  } catch {
    await refreshSettings();
  }
}

async function handleDebugToggleChange(): Promise<void> {
  if (!debugToggle) {
    return;
  }

  const nextEnabled = debugToggle.checked;
  setToggleEnabled(false);
  setStatus("Saving...");

  try {
    const response = await sendSettingsMessage({
      enabled: nextEnabled,
      type: "youtube-engage-o-meter:setDebugDetails",
    });

    applySettings(response);
    setStatus("Settings saved.");
    setToggleEnabled(true);
  } catch {
    await refreshSettings();
  }
}

informationalBannersToggle?.addEventListener("change", () => {
  void handleInformationalBannersToggleChange();
});

debugToggle?.addEventListener("change", () => {
  void handleDebugToggleChange();
});

void refreshSettings();
