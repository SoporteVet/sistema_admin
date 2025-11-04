/**
 * Signature Manager
 * Handles digital signature using Canvas API
 * Supports both mouse and touch events for mobile compatibility
 */

import db from './database.js';
import auth from './auth.js';

class SignatureManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
    }

    /**
     * Initialize signature canvas
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEvents();
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        // Set canvas size based on container
        const container = this.canvas.parentElement;
        let baseWidth, baseHeight;
        
        if (container) {
            const rect = container.getBoundingClientRect();
            // Account for padding and margins
            const availableWidth = rect.width - 64; // 32px padding on each side
            baseWidth = Math.min(availableWidth, 600);
            baseHeight = 240; // Increased height for better signing space
        } else {
            // Default sizes if container not found
            baseWidth = 600;
            baseHeight = 240;
        }

        // Increase resolution for better precision (retina/high DPI displays)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = baseWidth * dpr;
        this.canvas.height = baseHeight * dpr;
        this.canvas.style.width = baseWidth + 'px';
        this.canvas.style.height = baseHeight + 'px';
        
        // Scale context to match device pixel ratio for crisp rendering
        this.ctx.scale(dpr, dpr);

        // Set drawing properties for precise drawing
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1.2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    /**
     * Setup mouse and touch events
     */
    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    /**
     * Get canvas coordinates with precise scaling
     */
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Use the display size, not the internal canvas size (context is already scaled)
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Start drawing
     */
    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    /**
     * Draw on canvas with precise, smooth lines
     */
    draw(e) {
        if (!this.isDrawing) return;

        const coords = this.getCoordinates(e);

        // Draw precise straight line for maximum accuracy
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();

        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    /**
     * Stop drawing
     */
    stopDrawing() {
        this.isDrawing = false;
    }

    /**
     * Clear canvas
     */
    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Check if canvas has signature
     */
    hasSignature() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        return imageData.data.some(channel => channel !== 0);
    }

    /**
     * Get signature as base64
     */
    getSignatureData() {
        if (!this.hasSignature()) {
            return null;
        }
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Save signature to database
     */
    async saveSignature(solicitudId, tipo = 'admin') {
        const signatureData = this.getSignatureData();
        if (!signatureData) {
            throw new Error('No hay firma para guardar');
        }

        const user = auth.getCurrentUser();
        const firma = {
            solicitudId,
            usuarioId: user.id,
            imagen: signatureData,
            tipo: tipo,
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        };

        return await db.add('firmas', firma);
    }

    /**
     * Load signature from database
     */
    async loadSignature(solicitudId) {
        const firma = await db.getFirmaBySolicitud(solicitudId);
        if (!firma || !firma.imagen) {
            return false;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = firma.imagen;
        return true;
    }
}

// Export singleton instance
const signatureManager = new SignatureManager();

// Initialize when modal opens
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-solicitud-detalle');
    if (modal) {
        // Initialize signature when modal opens
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = modal.style.display !== 'none';
                    if (isVisible) {
                        setTimeout(() => {
                            signatureManager.init('signature-canvas');
                        }, 100);
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }

    // Clear signature button
    const clearBtn = document.getElementById('clear-signature');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            signatureManager.clear();
        });
    }
});

export default signatureManager;

