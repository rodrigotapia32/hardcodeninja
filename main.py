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
                return False
            
            self.log(f"Tipo de juego detectado: {game_info['type']}")
            self.log(f"Archivo principal: {game_info['main_file']}")
            
            # Instalar dependencias según el tipo
            if game_info["type"] == "python" and game_info["dependencies"]:
                self.log("Instalando dependencias de Python...")
                subprocess.run([sys.executable, "-m", "pip", "install"] + game_info["dependencies"])
            
            self.status = "ready"
            self.log("Juego configurado y listo para ejecutar")
            return True
            
        except Exception as e:
            self.log(f"Error en la configuración: {str(e)}")
            return False

# Instancia global del importador
importer = GameImporter()

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

@app.route('/play')
def play_game():
    """Redirigir al juego"""
    if not importer.game_path:
        return "No hay juego importado. <a href='/'>Volver al inicio</a>", 404
    
    game_info = importer.detect_game_type()
    
    if game_info and game_info.get("main_file"):
        if game_info["type"] == "web":
            # Si es un juego Node.js con servidor, redirigir al puerto del juego
            if os.path.exists(os.path.join(importer.game_path, "server")):
                return f'<script>window.location.href="http://{request.host.split(":")[0]}:5001";</script>'
            else:
                return f'<script>window.location.href="/game/{game_info["main_file"]}";</script>'
        else:
            return f"""
            <h2>Juego Hardcore Ninja Importado</h2>
            <p>Tipo: {game_info["type"]}</p>
            <p>Archivo principal: {game_info["main_file"]}</p>
            <p>Para juegos no-web, ejecutar manualmente el archivo principal.</p>
            <a href="/">Volver al inicio</a>
            """
    else:
        return """
        <h2>Juego importado pero no se detectó archivo principal</h2>
        <p>Revisa la estructura del juego manualmente.</p>
        <a href="/">Volver al inicio</a>
        """

if __name__ == '__main__':
    print("=== Hardcore Ninja Game Importer ===")
    print(f"Servidor iniciando en puerto {PORT}")
    print("Accede a http://localhost:5000 para comenzar")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
