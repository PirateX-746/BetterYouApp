type NotificationType = "success" | "error" | "info";

const NOTIFICATION_CONTAINER_ID = "notificationContainer";
const AUTO_CLOSE_DELAY = 4000;
const ANIMATION_DELAY = 300;

const ICONS: Record<NotificationType, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

function getOrCreateNotificationContainer(): HTMLElement {
  let container = document.getElementById(NOTIFICATION_CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = NOTIFICATION_CONTAINER_ID;
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  return container;
}

export const Helpers = {
  showNotification(message: string, type: NotificationType = "success"): void {
    if (typeof window === "undefined") return;

    const container = getOrCreateNotificationContainer();

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${ICONS[type]}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;

    container.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    // Auto dismiss
    setTimeout(() => {
      notification.classList.remove("show");

      setTimeout(() => {
        notification.remove();
      }, ANIMATION_DELAY);
    }, AUTO_CLOSE_DELAY);
  },

  debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  formatDateTime(date: string | Date): string {
    const d = new Date(date);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  },

  formatDate(date: string | Date): string {
    const d = new Date(date);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  },

  formatTime(date: string | Date): string {
    const d = new Date(date);

    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  },
};
