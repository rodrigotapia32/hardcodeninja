#!/usr/bin/env python3
"""
Setup script for Hardcore Ninja Game Importer
Configura el entorno y dependencias necesarias
"""

import subprocess
import sys
import os
from pathlib import Path

def install_package(package):
    """Instalar paquete usando pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        return True
    except subprocess.CalledProcessError:
        return False

def check_git():
    """Verificar si Git está instalado"""
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def setup_environment():
    """Configurar entorno de desarrollo"""
    print("=== Hardcore Ninja Game Importer - Setup ===")
    print()
    
    # Verificar Python
    print(f"Python version: {sys.version}")
    
    # Instalar dependencias
    dependencies = [
        "flask",
        "requests"
    ]
    
    print("Instalando dependencias...")
    for dep in dependencies:
        print(f"  - {dep}...", end=" ")
        if install_package(dep):
            print("✓")
        else:
            print("✗")
            return False
    
    # Verificar Git
    print("Verificando Git...", end=" ")
    if check_git():
        print("✓")
    else:
        print("✗")
        print("ADVERTENCIA: Git no está disponible. Algunas funciones pueden no funcionar.")
    
    # Crear directorios necesarios
    directories = [
        "templates",
        "static",
        "hardcore_ninja_game"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print()
    print("Setup completado exitosamente!")
    print("Ejecuta 'python main.py' para iniciar el servidor.")
    
    return True

if __name__ == "__main__":
    success = setup_environment()
    sys.exit(0 if success else 1)
