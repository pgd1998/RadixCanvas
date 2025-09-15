/**
 * Cross-verification FPS counter using requestAnimationFrame
 * Use this to verify our custom FPS calculation is accurate
 */

class FPSVerification {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;

  start() {
    const loop = () => {
      const now = performance.now();
      this.frameCount++;

      // Calculate every second for accuracy
      if (now - this.lastTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        console.log(`🔍 Verification FPS: ${this.fps}`);
        
        // Reset
        this.frameCount = 0;
        this.lastTime = now;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  getFPS() {
    return this.fps;
  }
}

// Usage: Add this to your app temporarily
export const fpsVerifier = new FPSVerification();

// In your component:
// useEffect(() => {
//   fpsVerifier.start();
// }, []);