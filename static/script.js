/**
 * Hardcore Ninja Game Importer - Frontend Logic
 * Maneja la interfaz de usuario para importar y configurar juegos
 */

class GameImporter {
    constructor() {
        this.statusCheckInterval = null;
        this.isImporting = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.startStatusCheck();
        this.checkInitialStatus();
    }

    bindEvents() {
        // Formulario de importación
        const importForm = document.getElementById('import-form');
        if (importForm) {
            importForm.addEventListener('submit', (e) => this.handleImport(e));
        }

        // Actualizar estado cada 2 segundos durante la importación
        this.statusCheckInterval = setInterval(() => {
            if (this.isImporting) {
                this.updateStatus();
            }
        }, 2000);
    }

    async checkInitialStatus() {
        try {
            await this.updateStatus();
        } catch (error) {
            console.error('Error checking initial status:', error);
        }
    }

    startStatusCheck() {
        // Verificar estado inicial
        this.updateStatus();
        
        // Verificar estado cada 5 segundos
        setInterval(() => {
            if (!this.isImporting) {
                this.updateStatus();
            }
        }, 5000);
    }

    async updateStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.renderSystemStatus(data);
            this.renderLogs(data.logs || []);
            
            // Si el juego está listo, mostrar información
            if (data.status === 'ready' && data.game_path) {
                await this.loadGameInfo();
            }
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Error al obtener el estado del sistema');
        }
    }

    renderSystemStatus(data) {
        const statusContainer = document.getElementById('system-status');
        const statusBadge = document.getElementById('status-badge');
        
        if (!statusContainer || !statusBadge) return;

        // Actualizar badge
        const statusText = this.getStatusText(data.status);
        const statusClass = this.getStatusClass(data.status);
        
        statusBadge.textContent = statusText;
        statusBadge.className = `badge ${statusClass}`;

        // Renderizar estado del sistema
        let html = '';
        
        if (data.status === 'waiting') {
            html = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-${data.git_available ? 'check text-success' : 'times text-danger'} me-2"></i>
                            <span>Git ${data.git_available ? 'Disponible' : 'No Disponible'}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-server text-success me-2"></i>
                            <span>Servidor Activo</span>
                        </div>
                    </div>
                </div>
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    Sistema listo para importar juegos desde GitHub
                </div>
            `;
        } else if (data.status === 'cloning') {
            html = `
                <div class="d-flex align-items-center justify-content-center">
                    <div class="spinner-border text-primary me-3" role="status"></div>
                    <span>Clonando repositorio desde GitHub...</span>
                </div>
            `;
        } else if (data.status === 'setting_up') {
            html = `
                <div class="d-flex align-items-center justify-content-center">
                    <div class="spinner-border text-warning me-3" role="status"></div>
                    <span>Configurando juego y dependencias...</span>
                </div>
            `;
        } else if (data.status === 'ready') {
            html = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>¡Juego listo!</strong> El juego ha sido importado y configurado exitosamente.
                </div>
                <div class="d-grid">
                    <a href="/play" class="btn play-button" target="_blank">
                        <i class="fas fa-play me-2"></i>
                        Jugar Hardcore Ninja
                    </a>
                </div>
            `;
        }
        
        statusContainer.innerHTML = html;
    }

    getStatusText(status) {
        const statusMap = {
            'waiting': 'Esperando',
            'cloning': 'Clonando',
            'setting_up': 'Configurando',
            'ready': 'Listo',
            'error': 'Error'
        };
        return statusMap[status] || 'Desconocido';
    }

    getStatusClass(status) {
        const classMap = {
            'waiting': 'bg-waiting',
            'cloning': 'bg-cloning',
            'setting_up': 'bg-setting_up',
            'ready': 'bg-ready',
            'error': 'bg-error'
        };
        return classMap[status] || 'bg-secondary';
    }

    renderLogs(logs) {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;

        if (logs.length === 0) {
            logsContainer.innerHTML = '<div class="text-muted">Sin actividad reciente...</div>';
            return;
        }

        const html = logs.map(log => `
            <div class="log-entry">
                <i class="fas fa-chevron-right me-2 text-primary"></i>
                ${this.escapeHtml(log)}
            </div>
        `).join('');

        logsContainer.innerHTML = html;
        
        // Scroll al final
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    async handleImport(e) {
        e.preventDefault();
        
        if (this.isImporting) return;
        
        const repoUrl = document.getElementById('repo-url').value.trim();
        const importBtn = document.getElementById('import-btn');
        
        if (!repoUrl) {
            this.showError('Por favor ingresa una URL de repositorio');
            return;
        }

        if (!repoUrl.startsWith('https://github.com/')) {
            this.showError('La URL debe ser de GitHub (https://github.com/...)');
            return;
        }

        try {
            this.isImporting = true;
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Importando...';

            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ repo_url: repoUrl })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Importación iniciada exitosamente');
                // El estado se actualizará automáticamente
            } else {
                throw new Error(data.error || 'Error al importar el juego');
            }

        } catch (error) {
            console.error('Import error:', error);
            this.showError(error.message || 'Error al importar el juego');
        } finally {
            this.isImporting = false;
            importBtn.disabled = false;
            importBtn.innerHTML = '<i class="fas fa-download"></i> Importar Juego';
        }
    }

    async loadGameInfo() {
        try {
            const response = await fetch('/api/game_info');
            if (response.ok) {
                const gameInfo = await response.json();
                this.renderGameInfo(gameInfo);
            }
        } catch (error) {
            console.error('Error loading game info:', error);
        }
    }

    renderGameInfo(gameInfo) {
        const gameInfoSection = document.getElementById('game-info-section');
        const gameInfoContent = document.getElementById('game-info-content');
        
        if (!gameInfoSection || !gameInfoContent) return;

        let html = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-gamepad me-2"></i>Tipo de Juego</h6>
                    <p class="text-muted">${gameInfo.type || 'No detectado'}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-file me-2"></i>Archivo Principal</h6>
                    <p class="text-muted">${gameInfo.main_file || 'No detectado'}</p>
                </div>
            </div>
        `;

        if (gameInfo.dependencies && gameInfo.dependencies.length > 0) {
            html += `
                <div class="mt-3">
                    <h6><i class="fas fa-puzzle-piece me-2"></i>Dependencias</h6>
                    <div class="game-structure">
                        ${gameInfo.dependencies.map(dep => `<div>${dep}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        if (gameInfo.structure && gameInfo.structure.length > 0) {
            const limitedStructure = gameInfo.structure.slice(0, 20); // Mostrar solo primeros 20 archivos
            html += `
                <div class="mt-3">
                    <h6><i class="fas fa-folder-open me-2"></i>Estructura del Proyecto</h6>
                    <div class="game-structure">
                        ${limitedStructure.map(file => `<div><i class="fas fa-file me-1"></i>${file}</div>`).join('')}
                        ${gameInfo.structure.length > 20 ? `<div class="text-muted">... y ${gameInfo.structure.length - 20} archivos más</div>` : ''}
                    </div>
                </div>
            `;
        }

        gameInfoContent.innerHTML = html;
        gameInfoSection.style.display = 'block';
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        // Crear elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GameImporter();
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Prevenir envío de formularios sin JavaScript
document.addEventListener('submit', (e) => {
    if (!window.GameImporter) {
        e.preventDefault();
        alert('JavaScript es requerido para usar esta aplicación');
    }
});
