#!/usr/bin/env python3
"""
Servidor dedicado para ejecutar juegos importados
Alternativa para servir juegos que requieren servidor específico
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import threading
import webbrowser

class GameServer:
    def __init__(self, game_path, port=8000):
        self.game_path = Path(game_path)
        self.port = port
        self.server = None
        self.game_info = None
        
    def detect_game_type(self):
        """Detectar tipo de juego y configuración necesaria"""
        if not self.game_path.exists():
            return None
            
        game_info = {
            "type": "unknown",
            "main_file": None,
            "server_required": False,
            "start_command": None
        }
        
        # Buscar archivos principales
        for file_path in self.game_path.rglob("*"):
            if file_path.is_file():
                name = file_path.name.lower()
                
                # HTML/JavaScript game
                if name in ['index.html', 'game.html', 'main.html']:
                    game_info["type"] = "web"
                    game_info["main_file"] = str(file_path.relative_to(self.game_path))
                    game_info["server_required"] = True
                    break
                    
                # Python game
                elif name in ['main.py', 'game.py', 'app.py']:
                    game_info["type"] = "python"
                    game_info["main_file"] = str(file_path.relative_to(self.game_path))
                    game_info["start_command"] = [sys.executable, str(file_path)]
                    break
                    
                # Node.js game
                elif name == 'package.json':
                    try:
                        with open(file_path, 'r') as f:
                            package_data = json.load(f)
                            game_info["type"] = "node"
                            game_info["main_file"] = package_data.get("main", "index.js")
                            game_info["start_command"] = ["node", game_info["main_file"]]
                            break
                    except:
                        continue
        
        self.game_info = game_info
        return game_info
    
    def start_web_server(self):
        """Iniciar servidor web para juegos HTML/JS"""
        class GameHTTPRequestHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(self.game_path), **kwargs)
        
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), GameHTTPRequestHandler)
            print(f"Servidor web iniciado en puerto {self.port}")
            print(f"Accede al juego en: http://localhost:{self.port}")
            
            if self.game_info and self.game_info.get("main_file"):
                print(f"Archivo principal: {self.game_info['main_file']}")
                game_url = f"http://localhost:{self.port}/{self.game_info['main_file']}"
                print(f"URL del juego: {game_url}")
                
                # Intentar abrir en navegador (opcional)
                try:
                    webbrowser.open(game_url)
                except:
                    pass
            
            self.server.serve_forever()
            
        except KeyboardInterrupt:
            print("\nServidor detenido por el usuario")
        except Exception as e:
            print(f"Error en el servidor: {e}")
        finally:
            if self.server:
                self.server.shutdown()
    
    def start_python_game(self):
        """Ejecutar juego de Python"""
        if not self.game_info or not self.game_info.get("start_command"):
            print("No se pudo determinar el comando de inicio")
            return
            
        try:
            print(f"Ejecutando: {' '.join(self.game_info['start_command'])}")
            # Cambiar al directorio del juego
            original_cwd = os.getcwd()
            os.chdir(self.game_path)
            
            # Ejecutar el juego
            subprocess.run(self.game_info["start_command"])
            
        except KeyboardInterrupt:
            print("\nJuego detenido por el usuario")
        except Exception as e:
            print(f"Error ejecutando el juego: {e}")
        finally:
            os.chdir(original_cwd)
    
    def start_node_game(self):
        """Ejecutar juego de Node.js"""
        if not self.game_info or not self.game_info.get("start_command"):
            print("No se pudo determinar el comando de inicio")
            return
            
        try:
            # Verificar si npm install es necesario
            node_modules = self.game_path / "node_modules"
            if not node_modules.exists():
                print("Instalando dependencias de Node.js...")
                subprocess.run(["npm", "install"], cwd=self.game_path)
            
            print(f"Ejecutando: {' '.join(self.game_info['start_command'])}")
            # Cambiar al directorio del juego
            original_cwd = os.getcwd()
            os.chdir(self.game_path)
            
            # Ejecutar el juego
            subprocess.run(self.game_info["start_command"])
            
        except KeyboardInterrupt:
            print("\nJuego detenido por el usuario")
        except Exception as e:
            print(f"Error ejecutando el juego: {e}")
        finally:
            os.chdir(original_cwd)
    
    def start(self):
        """Iniciar el servidor apropiado según el tipo de juego"""
        print("=== Hardcore Ninja Game Server ===")
        print(f"Directorio del juego: {self.game_path}")
        
        if not self.game_path.exists():
            print("Error: El directorio del juego no existe")
            return
        
        game_info = self.detect_game_type()
        if not game_info:
            print("Error: No se pudo detectar el tipo de juego")
            return
        
        print(f"Tipo de juego detectado: {game_info['type']}")
        print(f"Archivo principal: {game_info.get('main_file', 'No detectado')}")
        print()
        
        # Iniciar servidor según el tipo
        if game_info["type"] == "web":
            self.start_web_server()
        elif game_info["type"] == "python":
            self.start_python_game()
        elif game_info["type"] == "node":
            self.start_node_game()
        else:
            print("Tipo de juego no soportado o no detectado")
            print("Archivos en el directorio:")
            for file_path in self.game_path.rglob("*"):
                if file_path.is_file():
                    print(f"  - {file_path.relative_to(self.game_path)}")

def main():
    if len(sys.argv) < 2:
        print("Uso: python game_server.py <directorio_del_juego> [puerto]")
        print("Ejemplo: python game_server.py ./hardcore_ninja_game 8000")
        sys.exit(1)
    
    game_path = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    
    server = GameServer(game_path, port)
    server.start()

if __name__ == "__main__":
    main()
