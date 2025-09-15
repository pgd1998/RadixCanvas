/**
 * Real-time FPS monitor using Stats.js for instant verification
 */
import Stats from 'stats.js';

class StatsMonitor {
  private stats: Stats;
  private isActive = false;

  constructor() {
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    
    // Style the stats panel
    this.stats.dom.style.position = 'fixed';
    this.stats.dom.style.top = '10px';
    this.stats.dom.style.right = '10px';
    this.stats.dom.style.zIndex = '10000';
    this.stats.dom.style.opacity = '0.8';
  }

  start() {
    if (this.isActive) return;
    
    document.body.appendChild(this.stats.dom);
    this.isActive = true;
    
    const animate = () => {
      this.stats.begin();
      // Your render loop happens here automatically
      this.stats.end();
      if (this.isActive) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
    console.log('📊 Stats.js FPS monitor started (top-right corner)');
  }

  stop() {
    if (!this.isActive) return;
    
    if (this.stats.dom.parentNode) {
      this.stats.dom.parentNode.removeChild(this.stats.dom);
    }
    this.isActive = false;
    console.log('📊 Stats.js FPS monitor stopped');
  }

  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  isRunning() {
    return this.isActive;
  }
}

export const statsMonitor = new StatsMonitor();