/**
 * AI Neural Network Background Pattern
 * Inspired by uracle.co.kr style
 * Interactive particles with neural connections
 */

class AIPatternBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.animationId = null;

        this.config = {
            particleCount: 80,
            particleSize: { min: 1, max: 3 },
            lineDistance: 150,
            speed: 0.3,
            colors: {
                particle: 'rgba(6, 182, 212, 0.8)',
                line: 'rgba(6, 182, 212, 0.15)',
                glow: '#06b6d4',
                secondary: 'rgba(14, 165, 233, 0.6)'
            }
        };

        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.addEventListeners();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        const count = Math.min(this.config.particleCount, Math.floor((this.canvas.width * this.canvas.height) / 15000));

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * (this.config.particleSize.max - this.config.particleSize.min) + this.config.particleSize.min,
                speedX: (Math.random() - 0.5) * this.config.speed,
                speedY: (Math.random() - 0.5) * this.config.speed,
                isNode: Math.random() > 0.7, // 30% are larger nodes
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    drawParticle(particle, time) {
        const pulse = Math.sin(time * 0.002 + particle.pulsePhase) * 0.3 + 0.7;
        const size = particle.isNode ? particle.size * 2 : particle.size;

        // Glow effect for nodes
        if (particle.isNode) {
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, size * 4
            );
            gradient.addColorStop(0, this.config.colors.particle);
            gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
            gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size * 4, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        // Main particle
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, size * pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = particle.isNode ? this.config.colors.particle : this.config.colors.secondary;
        this.ctx.fill();
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.lineDistance) {
                    const opacity = 1 - (distance / this.config.lineDistance);

                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(6, 182, 212, ${opacity * 0.2})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
    }

    drawMouseConnections() {
        if (!this.mouse.x || !this.mouse.y) return;

        this.particles.forEach(particle => {
            const dx = particle.x - this.mouse.x;
            const dy = particle.y - this.mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.mouse.radius) {
                const opacity = 1 - (distance / this.mouse.radius);

                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(this.mouse.x, this.mouse.y);
                this.ctx.strokeStyle = `rgba(14, 165, 233, ${opacity * 0.5})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }
        });

        // Mouse glow
        const gradient = this.ctx.createRadialGradient(
            this.mouse.x, this.mouse.y, 0,
            this.mouse.x, this.mouse.y, 80
        );
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)');
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 80, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.speedX *= -1;
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.speedY *= -1;
            }

            // Mouse interaction - gentle push
            if (this.mouse.x && this.mouse.y) {
                const dx = particle.x - this.mouse.x;
                const dy = particle.y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    particle.x += dx * force * 0.02;
                    particle.y += dy * force * 0.02;
                }
            }
        });
    }

    animate() {
        const time = Date.now();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawConnections();
        this.drawMouseConnections();

        this.particles.forEach(particle => {
            this.drawParticle(particle, time);
        });

        this.updateParticles();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Data flow animation for hero section
class DataFlowAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.dataPackets = [];
        this.paths = [];

        this.config = {
            packetCount: 15,
            speed: 2,
            colors: ['#0ea5e9', '#06b6d4', '#22d3ee', '#10b981']
        };

        this.init();
    }

    init() {
        this.resize();
        this.createPaths();
        this.createPackets();
        this.animate();

        window.addEventListener('resize', () => {
            this.resize();
            this.createPaths();
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createPaths() {
        this.paths = [];
        const pathCount = 5;

        for (let i = 0; i < pathCount; i++) {
            const startY = (this.canvas.height / (pathCount + 1)) * (i + 1);
            this.paths.push({
                startX: 0,
                startY: startY + (Math.random() - 0.5) * 100,
                endX: this.canvas.width,
                endY: startY + (Math.random() - 0.5) * 100,
                controlY: startY + (Math.random() - 0.5) * 200
            });
        }
    }

    createPackets() {
        this.dataPackets = [];

        for (let i = 0; i < this.config.packetCount; i++) {
            this.dataPackets.push({
                pathIndex: Math.floor(Math.random() * this.paths.length),
                progress: Math.random(),
                speed: this.config.speed * (0.5 + Math.random() * 0.5),
                size: 3 + Math.random() * 4,
                color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)]
            });
        }
    }

    getPointOnPath(path, t) {
        const cx = this.canvas.width / 2;
        const x = (1 - t) * (1 - t) * path.startX + 2 * (1 - t) * t * cx + t * t * path.endX;
        const y = (1 - t) * (1 - t) * path.startY + 2 * (1 - t) * t * path.controlY + t * t * path.endY;
        return { x, y };
    }

    drawPaths() {
        this.paths.forEach(path => {
            this.ctx.beginPath();
            this.ctx.moveTo(path.startX, path.startY);
            this.ctx.quadraticCurveTo(
                this.canvas.width / 2, path.controlY,
                path.endX, path.endY
            );
            this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    drawPackets() {
        this.dataPackets.forEach(packet => {
            const path = this.paths[packet.pathIndex];
            const point = this.getPointOnPath(path, packet.progress);

            // Glow effect
            const gradient = this.ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, packet.size * 3
            );
            gradient.addColorStop(0, packet.color);
            gradient.addColorStop(0.5, packet.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, packet.size * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Main dot
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, packet.size, 0, Math.PI * 2);
            this.ctx.fillStyle = packet.color;
            this.ctx.fill();

            // Trail
            for (let i = 1; i <= 5; i++) {
                const trailProgress = packet.progress - (i * 0.02);
                if (trailProgress > 0) {
                    const trailPoint = this.getPointOnPath(path, trailProgress);
                    this.ctx.beginPath();
                    this.ctx.arc(trailPoint.x, trailPoint.y, packet.size * (1 - i * 0.15), 0, Math.PI * 2);
                    this.ctx.fillStyle = packet.color.replace(')', `, ${0.3 - i * 0.05})`).replace('rgb', 'rgba').replace('#', 'rgba(');
                    this.ctx.fill();
                }
            }

            // Update position
            packet.progress += packet.speed / 1000;
            if (packet.progress > 1) {
                packet.progress = 0;
                packet.pathIndex = Math.floor(Math.random() * this.paths.length);
            }
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawPaths();
        this.drawPackets();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if canvas elements exist
    if (document.getElementById('ai-pattern-canvas')) {
        new AIPatternBackground('ai-pattern-canvas');
    }
    if (document.getElementById('data-flow-canvas')) {
        new DataFlowAnimation('data-flow-canvas');
    }
});
