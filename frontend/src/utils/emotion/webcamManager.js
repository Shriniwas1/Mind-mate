/**
 * Webcam Manager
 * 
 * Handles getUserMedia, tracks, requestAnimationFrame loops, and automatic cleanup
 * to prevent memory leaks.
 */

export class WebcamManager {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.stream = null;
    this.animationFrameId = null;
    this.isAnalyzing = false;
  }

  /**
   * Starts the webcam stream
   */
  async startCamera() {
    try {
      if (this.stream) {
        this.stopCamera();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await new Promise(resolve => {
          this.videoElement.onloadedmetadata = () => {
            resolve();
          };
        });
      }
      
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      return false;
    }
  }

  /**
   * Stops the webcam and cleans up tracks
   */
  stopCamera() {
    this.stopAnalysisLoop();
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Starts a requestAnimationFrame loop that calls the provided callback 
   * while dynamically managing the framerate.
   * @param {Function} analysisCallback - Async function called per frame.
   * @param {number} targetFPS - Desired FPS (e.g. 15 for heavy models, 30 for light)
   */
  startAnalysisLoop(analysisCallback, targetFPS = 20) {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = performance.now();

    const loop = async (timestamp) => {
      if (!this.isAnalyzing) return;

      const elapsed = timestamp - lastFrameTime;
      
      // Throttle to target FPS
      if (elapsed >= frameInterval) {
        lastFrameTime = timestamp - (elapsed % frameInterval);
        
        try {
          if (this.videoElement && this.videoElement.readyState >= 2) {
            // Adjust canvas to match video dimensions
            if (this.canvasElement) {
              if (this.canvasElement.width !== this.videoElement.videoWidth) {
                this.canvasElement.width = this.videoElement.videoWidth;
                this.canvasElement.height = this.videoElement.videoHeight;
              }
            }
            await analysisCallback(this.videoElement, this.canvasElement, timestamp);
          }
        } catch (err) {
          console.error("Frame analysis error:", err);
        }
      }

      if (this.isAnalyzing) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stops the analysis loop
   */
  stopAnalysisLoop() {
    this.isAnalyzing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear canvas if it exists
    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }
}
