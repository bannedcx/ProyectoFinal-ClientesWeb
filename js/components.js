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

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
customElements.define('toast-notification', ToastNotification);

class ConfirmDialog extends HTMLElement {
    static async request(title, message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000;';
            
            dialog.innerHTML = `
                <div class="card" style="min-width: 320px; max-width: 400px; margin: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--text-main);">${title}</h3>
                    <p style="margin-bottom: 1.5rem; color: var(--text-muted); line-height: 1.4;">${message}</p>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                        <button id="btn-cancel" class="btn" style="background: var(--text-muted);">Cancelar</button>
                        <button id="btn-confirm" class="btn btn-accent">Confirmar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('#btn-confirm').onclick = () => {
                dialog.remove();
                resolve(true);
            };

            dialog.querySelector('#btn-cancel').onclick = () => {
                dialog.remove();
                resolve(false);
            };
        });
    }
}
customElements.define('confirm-dialog', ConfirmDialog);

window.ToastNotification = ToastNotification;
window.ConfirmDialog = ConfirmDialog;
