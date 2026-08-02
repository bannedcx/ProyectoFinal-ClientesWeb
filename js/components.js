class LoadingState extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div style="display: flex; justify-content: center; padding: 2rem;">
                <div style="width: 40px; height: 40px; border: 4px solid var(--border-color); border-top: 4px solid var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
    }
}
customElements.define('loading-state', LoadingState);

class ToastNotification extends HTMLElement {
    connectedCallback() {
        this.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;';
    }

    static show(message, type = 'success') {
        let container = document.querySelector('toast-notification');
        if (!container) {
            container = document.createElement('toast-notification');
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            background-color: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white; padding: 1rem 1.5rem; border-radius: 4px; font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
        `;
        container.appendChild(toast);
