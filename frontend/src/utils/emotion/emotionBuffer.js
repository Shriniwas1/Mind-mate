/**
 * Emotion Buffer for Temporal Smoothing
 * 
 * Maintains a rolling window of recent emotion predictions to prevent
 * flickering and provide stable, accurate readings.
 */

export class EmotionBuffer {
  constructor(windowSize = 15, confidenceThreshold = 40) {
    this.windowSize = windowSize;
    this.confidenceThreshold = confidenceThreshold; // Minimum confidence to accept a dominant emotion
    this.buffer = [];
    
    this.emotionsList = ['happy', 'sad', 'angry', 'neutral', 'fearful', 'disgusted', 'surprised'];
  }

  /**
   * Add a new frame's predictions to the buffer
   * @param {Object} expressions - Record of emotions and their raw confidence (0 to 1)
   */
  addFrame(expressions) {
    this.buffer.push(expressions);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get the smoothed, stable emotion based on the current buffer
   */
  getSmoothedEmotion() {
    if (this.buffer.length === 0) return null;

    // Calculate average confidence for each emotion across the buffer
    const averages = {};
    for (const emotion of this.emotionsList) {
      averages[emotion] = 0;
    }

    for (const frame of this.buffer) {
      for (const emotion of this.emotionsList) {
        averages[emotion] += (frame[emotion] || 0);
      }
    }

    for (const emotion of this.emotionsList) {
      averages[emotion] = averages[emotion] / this.buffer.length;
    }

    // Find the emotion with the highest average
    let dominantEmotion = 'neutral';
    let maxAvg = -1;

    for (const [emotion, avg] of Object.entries(averages)) {
      if (avg > maxAvg) {
        maxAvg = avg;
        dominantEmotion = emotion;
      }
    }

    const confidencePercentage = Math.round(maxAvg * 100);

    // Sort all for the breakdown
    const breakdown = Object.entries(averages)
      .sort((a, b) => b[1] - a[1])
      .map(([key, val]) => ({
        key,
        confidence: Math.round(val * 100)
      }));

    // If the dominant emotion's confidence is below the threshold, 
    // we default to neutral to avoid spurious misclassifications.
    if (confidencePercentage < this.confidenceThreshold) {
      dominantEmotion = 'neutral';
    }

    return {
      emotion: dominantEmotion,
      confidence: confidencePercentage,
      breakdown
    };
  }
  
  clear() {
    this.buffer = [];
  }
}
