/**
 * Authentication Manager
 * Handles user authentication, JWT tokens, and password encryption
 */

import db from './database.js';
import { showNotification } from './notifications.js';

class Auth {
    constructor() {
        this.tokenKey = 'auth_token';
        this.userKey = 'user';
        this.tokenExpiry = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    }

    /**
     * Encrypt password using Web Crypto API
     */
    async encryptPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Generate JWT-like token (simplified for client-side)
     */
    generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            rol: user.rol,
            exp: Date.now() + this.tokenExpiry
        };
        return btoa(JSON.stringify(payload));
    }

    /**
     * Decode and validate token
     */
    validateToken(token) {
        try {
            const payload = JSON.parse(atob(token));
            if (payload.exp && payload.exp > Date.now()) {
                return payload;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Get current user from token
     */
    getCurrentUser() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) return null;

        const payload = this.validateToken(token);
        if (!payload) {
            this.logout();
            return null;
        }

        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return false;
        }

        const payload = this.validateToken(token);
        if (!payload) {
            // Don't auto-logout here to avoid infinite loops
            // Just return false and let the calling code handle it
            return false;
        }
        return true;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getCurrentUser();
        return user?.rol === 'admin';
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            // Ensure database is initialized
            await db.ensureInit();
            
            // Get user from database
            const user = await db.getUsuarioByEmail(email);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Encrypt password and compare
            const encryptedPassword = await this.encryptPassword(password);
            if (user.password !== encryptedPassword) {
                throw new Error('Contraseña incorrecta');
            }

            // Generate token
            const token = this.generateToken(user);

            // Store token and user
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.userKey, JSON.stringify(user));

            // Log audit (catch error to not block login if audit fails)
            try {
                await db.addAuditoria('LOGIN', { email: user.email });
            } catch (auditError) {
                console.warn('Failed to log audit:', auditError);
            }

            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            const user = this.getCurrentUser();
            if (user) {
                try {
                    await db.ensureInit();
                    await db.addAuditoria('LOGOUT', { email: user.email });
                } catch (error) {
                    console.warn('Failed to log audit on logout:', error);
                }
            }
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            window.location.reload();
        }
    }

    /**
     * Register new user (for initial setup)
     */
    async register(email, password, nombre, departamento, rol = 'usuario') {
        try {
            // Check if user exists
            const existingUser = await db.getUsuarioByEmail(email);
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }

            // Encrypt password
            const encryptedPassword = await this.encryptPassword(password);

            // Create user
            const user = {
                email,
                password: encryptedPassword,
                nombre,
                departamento,
                rol,
                fechaRegistro: new Date().toISOString(),
                activo: true
            };

            const userId = await db.add('usuarios', user);
            user.id = userId;

            await db.addAuditoria('REGISTER', { email, rol });

            return { success: true, user };
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    }
}

// Export singleton instance
const auth = new Auth();

// Initialize default admin user if database is empty
(async () => {
    try {
        await db.ensureInit();
        const usuarios = await db.getAll('usuarios');
        if (usuarios.length === 0) {
            // Create default admin user
            const defaultAdmin = {
                email: 'admin@sistema.com',
                password: await auth.encryptPassword('admin123'),
                nombre: 'Administrador',
                departamento: 'IT',
                rol: 'admin',
                fechaRegistro: new Date().toISOString(),
                activo: true
            };
            await db.add('usuarios', defaultAdmin);
            
            // Create default departments
            const departamentos = [
                { codigo: 'GG', nombre: 'Gerencia General' },
                { codigo: 'IT', nombre: 'Tecnología de la Información' },
                { codigo: 'RH', nombre: 'Recursos Humanos' },
                { codigo: 'FI', nombre: 'Finanzas' },
                { codigo: 'MK', nombre: 'Mercadeo' },
                { codigo: 'OP', nombre: 'Operaciones' },
                { codigo: 'IN', nombre: 'Internos Documentos' }
            ];
            
            for (const dept of departamentos) {
                // Verificar si el departamento ya existe antes de agregarlo
                const existing = await db.query('departamentos', 'codigo', dept.codigo);
                if (existing.length === 0) {
                    await db.add('departamentos', dept);
                }
            }
        } else {
            // Si ya hay usuarios, verificar y agregar departamentos faltantes
            const departamentosRequeridos = [
                { codigo: 'GG', nombre: 'Gerencia General' },
                { codigo: 'IT', nombre: 'Tecnología de la Información' },
                { codigo: 'RH', nombre: 'Recursos Humanos' },
                { codigo: 'FI', nombre: 'Finanzas' },
                { codigo: 'MK', nombre: 'Mercadeo' },
                { codigo: 'OP', nombre: 'Operaciones' },
                { codigo: 'IN', nombre: 'Internos Documentos' }
            ];
            
            for (const dept of departamentosRequeridos) {
                try {
                    const existing = await db.query('departamentos', 'codigo', dept.codigo);
                    if (existing.length === 0) {
                        await db.add('departamentos', dept);
                        console.log(`Departamento agregado: ${dept.codigo} - ${dept.nombre}`);
                    }
                } catch (error) {
                    console.warn(`No se pudo agregar el departamento ${dept.codigo}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
})();

export default auth;

