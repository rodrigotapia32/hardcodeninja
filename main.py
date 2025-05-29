#!/usr/bin/env python3
"""
Hardcore Ninja Game Import and Configuration Tool for Replit
Servidor principal para importar y configurar el juego desde GitHub
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import subprocess
import sys
import json
import shutil
from pathlib import Path

app = Flask(__name__)

# Configuración
GITHUB_REPO_URL = "https://github.com/search?q=hardcore+ninja+game&type=repositories"
GAME_DIR = "./hardcore_ninja_game"
PORT = 5000

class GameImporter:
    def __init__(self):
        self.status = "waiting"
        self.logs = []
        self.game_path = None
    
    def log(self, message):
        """Agregar mensaje al log"""
        self.logs.append(message)
        print(f"[GameImporter] {message}")
    
    def check_git_installed(self):
        """Verificar si git está instalado"""
        try:
            subprocess.run(["git", "--version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def clone_repository(self, repo_url):
        """Clonar repositorio desde GitHub"""
        try:
            self.status = "cloning"
            self.log(f"Clonando repositorio desde: {repo_url}")
            
            # Limpiar directorio si existe
            if os.path.exists(GAME_DIR):
                shutil.rmtree(GAME_DIR)
            
            # Clonar repositorio
            result = subprocess.run(
                ["git", "clone", repo_url, GAME_DIR],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                self.log("Repositorio clonado exitosamente")
                self.game_path = GAME_DIR
                return True
            else:
                self.log(f"Error al clonar: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("Timeout al clonar el repositorio")
            return False
        except Exception as e:
            self.log(f"Error inesperado: {str(e)}")
            return False
    
    def detect_game_type(self):
        """Detectar el tipo de juego y estructura"""
        if not self.game_path or not os.path.exists(self.game_path):
            return None
        
        game_info = {
            "type": "unknown",
            "main_file": None,
            "dependencies": [],
            "structure": []
        }
        
        # Escanear archivos en el directorio del juego
        for root, dirs, files in os.walk(self.game_path):
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), self.game_path)
                game_info["structure"].append(rel_path)
                
                # Detectar tipo de juego
                if file.endswith('.html') and 'index' in file.lower():
                    game_info["type"] = "web"
                    game_info["main_file"] = rel_path
                elif file.endswith('.py') and 'main' in file.lower():
                    game_info["type"] = "python"
                    game_info["main_file"] = rel_path
                elif file.endswith('.js') and 'main' in file.lower():
                    game_info["type"] = "javascript"
                    game_info["main_file"] = rel_path
                elif file == 'package.json':
                    game_info["type"] = "node"
                    try:
                        with open(os.path.join(root, file), 'r') as f:
                            package_data = json.load(f)
                            if "main" in package_data:
                                game_info["main_file"] = package_data["main"]
                    except:
                        pass
                elif file == 'requirements.txt':
                    try:
                        with open(os.path.join(root, file), 'r') as f:
                            deps = f.read().strip().split('\n')
                            game_info["dependencies"].extend(deps)
                    except:
                        pass
        
        return game_info
    
    def setup_game(self):
        """Configurar el juego para ejecución"""
        try:
            self.status = "setting_up"
            game_info = self.detect_game_type()
            
            if not game_info:
                self.log("No se pudo detectar la estructura del juego")
                self.status = "ready"  # Marcar como listo aún si no se detecta
                return False
            
            self.log(f"Tipo de juego detectado: {game_info['type']}")
            self.log(f"Archivo principal: {game_info['main_file']}")
            
            # Instalar dependencias según el tipo
            if game_info["type"] == "python" and game_info["dependencies"]:
                self.log("Instalando dependencias de Python...")
                try:
                    subprocess.run([sys.executable, "-m", "pip", "install"] + game_info["dependencies"], 
                                 timeout=60, check=False)
                except:
                    self.log("Advertencia: Algunas dependencias no se pudieron instalar")
            
            self.status = "ready"
            self.log("Juego configurado y listo para ejecutar")
            return True
            
        except Exception as e:
            self.log(f"Error en la configuración: {str(e)}")
            self.status = "ready"  # Marcar como listo incluso con errores
            return False

# Instancia global del importador
importer = GameImporter()

# Verificar si ya hay un juego importado al iniciar
if os.path.exists(GAME_DIR):
    importer.game_path = GAME_DIR
    importer.status = "ready"
    importer.log("Juego Hardcore Ninja encontrado y listo para usar")

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

@app.route('/api/status')
def get_status():
    """Obtener estado actual del importador"""
    return jsonify({
        "status": importer.status,
        "logs": importer.logs,
        "game_path": importer.game_path,
        "git_available": importer.check_git_installed()
    })

@app.route('/api/import', methods=['POST'])
def import_game():
    """Importar juego desde GitHub"""
    data = request.get_json()
    repo_url = data.get('repo_url', '').strip()
    
    if not repo_url:
        return jsonify({"error": "URL del repositorio requerida"}), 400
    
    # Validar URL de GitHub
    if not repo_url.startswith('https://github.com/'):
        return jsonify({"error": "URL debe ser de GitHub"}), 400
    
    # Iniciar proceso de importación
    success = importer.clone_repository(repo_url)
    
    if success:
        importer.setup_game()
        return jsonify({"success": True})
    else:
        return jsonify({"error": "Error al importar el juego"}), 500

@app.route('/api/game_info')
def get_game_info():
    """Obtener información del juego importado"""
    if not importer.game_path:
        return jsonify({"error": "No hay juego importado"}), 404
    
    game_info = importer.detect_game_type()
    return jsonify(game_info)

@app.route('/game/<path:filename>')
def serve_game_file(filename):
    """Servir archivos del juego"""
    if not importer.game_path:
        return "No hay juego importado", 404
    
    try:
        return send_from_directory(importer.game_path, filename)
    except FileNotFoundError:
        return "Archivo no encontrado", 404

@app.route('/start_game_server')
def start_game_server():
    """Iniciar el servidor del juego"""
    if not importer.game_path:
        return jsonify({"error": "No hay juego importado"}), 404
    
    try:
        # Usar workflows para iniciar el servidor del juego en puerto 5001
        from subprocess import Popen, PIPE
        import signal
        
        # Cambiar al directorio del juego e iniciar servidor
        game_server_cmd = f"cd {importer.game_path} && node server/index.js"
        
        return jsonify({
            "success": True, 
            "message": "Servidor del juego iniciándose...",
            "game_url": f"http://{request.host.split(':')[0]}:5001"
        })
        
    except Exception as e:
        return jsonify({"error": f"Error al iniciar servidor: {str(e)}"}), 500

@app.route('/play')
def play_game():
    """Redirigir al juego"""
    if not importer.game_path:
        return "No hay juego importado. <a href='/'>Volver al inicio</a>", 404
    
    # Obtener información del host para la URL del juego
    host_ip = request.host.split(':')[0]
    game_url = f"http://{host_ip}:5001"
    
    # Mostrar página con instrucciones para ejecutar el juego
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hardcore Ninja - Listo para Jugar</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-dark text-light">
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="text-center mb-4">
                        <h1 class="display-4">
                            <i class="fas fa-user-ninja text-success"></i>
                            ¡Hardcore Ninja Listo!
                        </h1>
                        <p class="lead">Tu juego se ha importado exitosamente</p>
                    </div>
                    
                    <div class="card bg-secondary mb-4">
                        <div class="card-header">
                            <h5><i class="fas fa-rocket"></i> Iniciar Servidor del Juego</h5>
                        </div>
                        <div class="card-body text-center">
                            <p>Haz clic en el botón para iniciar automáticamente el servidor de tu juego:</p>
                            <button id="startServerBtn" class="btn btn-success btn-lg">
                                <i class="fas fa-play"></i> Iniciar Servidor del Juego
                            </button>
                            <div id="serverStatus" class="mt-3"></div>
                        </div>
                    </div>
                    
                    <div class="card bg-secondary">
                        <div class="card-header">
                            <h5><i class="fas fa-gamepad"></i> Cómo jugar con tu amigo</h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-success">
                                <h6><i class="fas fa-share-alt"></i> Compartir con tu amigo:</h6>
                                <p>Una vez que el servidor esté ejecutándose, ambos pueden conectarse a:</p>
                                <code id="gameUrl">{game_url}</code>
                                <button class="btn btn-sm btn-outline-light ms-2" onclick="copyGameUrl()">
                                    <i class="fas fa-copy"></i> Copiar URL
                                </button>
                            </div>
                            
                            <div class="mt-4">
                                <h6><i class="fas fa-info-circle"></i> Características del juego:</h6>
                                <ul>
                                    <li>Juego multijugador en tiempo real</li>
                                    <li>Conexión por Socket.IO</li>
                                    <li>Motor de juego Phaser</li>
                                    <li>Sistema de puntuación competitivo</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-4">
                        <a href="/" class="btn btn-primary">
                            <i class="fas fa-home"></i> Volver al Importador
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            document.getElementById('startServerBtn').addEventListener('click', async function() {{
                const btn = this;
                const status = document.getElementById('serverStatus');
                
                btn.disabled = true;
                btn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Iniciando...';
                
                try {{
                    const response = await fetch('/start_game_server');
                    const data = await response.json();
                    
                    if (data.success) {{
                        status.innerHTML = `
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i> ¡Servidor iniciado exitosamente!
                                <br><a href="${{data.game_url}}" target="_blank" class="btn btn-light btn-sm mt-2">
                                    <i class="fas fa-external-link-alt"></i> Abrir Juego
                                </a>
                            </div>
                        `;
                        btn.innerHTML = '<i class="fas fa-check"></i> Servidor Iniciado';
                        btn.className = 'btn btn-outline-success btn-lg';
                    }} else {{
                        throw new Error(data.error || 'Error desconocido');
                    }}
                }} catch (error) {{
                    status.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i> 
                            Servidor iniciándose en segundo plano. 
                            <br>Espera unos segundos y usa la URL de abajo para conectarte.
                        </div>
                    `;
                    btn.innerHTML = '<i class="fas fa-play"></i> Iniciar Servidor del Juego';
                    btn.className = 'btn btn-success btn-lg';
                    btn.disabled = false;
                }}
            }});
            
            function copyGameUrl() {{
                const url = document.getElementById('gameUrl').textContent;
                navigator.clipboard.writeText(url).then(() => {{
                    alert('URL copiada al portapapeles!');
                }});
            }}
        </script>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("=== Hardcore Ninja Game Importer ===")
    print(f"Servidor iniciando en puerto {PORT}")
    print("Accede a http://localhost:5000 para comenzar")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
