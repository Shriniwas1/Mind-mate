import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth, API } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Camera, Loader2, CheckCircle, RefreshCw, Brain, Activity } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import * as faceapi from 'face-api.js';

import { loadFaceModels, isFaceModelLoaded, predictEmotionAPI } from '../utils/emotion/modelManager';
import { EmotionBuffer } from '../utils/emotion/emotionBuffer';
import { WebcamManager } from '../utils/emotion/webcamManager';

// Emoji and color mappers
const getEmotionEmoji = (emotion) => ({
  happy: '😊', sad: '😢', angry: '😠', neutral: '😐', fearful: '😰', disgusted: '🤢', surprised: '😮'
}[emotion] || '😐');

const getEmotionColor = (emotion) => ({
  happy: '#3A6B5E', sad: '#6366F1', angry: '#EF4444', neutral: '#64748B',
  fearful: '#8B5CF6', disgusted: '#10B981', surprised: '#F59E0B'
}[emotion] || '#64748B');

const getEmotionMoodScore = (emotion) => ({
  happy: 9, surprised: 6, neutral: 5, sad: 3, fearful: 2, disgusted: 2, angry: 2
}[emotion] || 5);

const SelfiePage = () => {
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [modelStatus, setModelStatus] = useState('idle'); // idle | loading | ready | error
  
  // Live states
  const [liveEmotion, setLiveEmotion] = useState('neutral');
  const [liveBreakdown, setLiveBreakdown] = useState([]);
  const [currentFPS, setCurrentFPS] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamManagerRef = useRef(null);
  const emotionBufferRef = useRef(new EmotionBuffer(15, 40)); // 15 frames, 40% conf threshold
  const lastFpsTimeRef = useRef(performance.now());
  const framesCountRef = useRef(0);

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    preloadModel();
    return () => {
      if (webcamManagerRef.current) {
        webcamManagerRef.current.stopCamera();
      }
    };
  }, []);

  const preloadModel = useCallback(async () => {
    if (isFaceModelLoaded()) {
      setModelStatus('ready');
      startCameraLoop();
      return;
    }

    setModelStatus('loading');
    try {
      const success = await loadFaceModels();
      if (success) {
        setModelStatus('ready');
        startCameraLoop();
      } else {
        throw new Error("Failed to load models");
      }
    } catch (err) {
      console.error('❌ Model preload failed:', err);
      setModelStatus('error');
      toast.error('Emotion AI model failed to load');
    }
  }, []);

  const startCameraLoop = async () => {
    if (!videoRef.current || !canvasRef.current) {
      // Retry in a bit if refs aren't mounted yet
      setTimeout(startCameraLoop, 100);
      return;
    }

    if (!webcamManagerRef.current) {
      webcamManagerRef.current = new WebcamManager(videoRef.current, canvasRef.current);
    }

    const success = await webcamManagerRef.current.startCamera();
    if (success) {
      setCapturing(true);
      webcamManagerRef.current.startAnalysisLoop(processFrame, 20); // 20 FPS target
    } else {
      toast.error('Camera access denied');
    }
  };

  const processFrame = async (video, canvas, timestamp) => {
    // Calculate FPS
    framesCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setCurrentFPS(framesCountRef.current);
      framesCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    const res = await predictEmotionAPI(video);
    
    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (res && res.success && res.emotion !== 'No Face') {
      const detection = res.detection;
      
      // Draw Face API Box and Landmarks manually to match canvas size precisely
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detection, displaySize);
      
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      // Add to buffer
      emotionBufferRef.current.addFrame(res.detection.expressions);
      const smoothed = emotionBufferRef.current.getSmoothedEmotion();

      if (smoothed) {
        setLiveEmotion(smoothed.emotion);
        
        // Update live breakdown
        const coloredBreakdown = smoothed.breakdown.map(item => ({
          ...item,
          emoji: getEmotionEmoji(item.key),
          color: getEmotionColor(item.key)
        }));
        
        setLiveBreakdown(coloredBreakdown);
      }
    }
  };

  const captureImage = async () => {
    if (webcamManagerRef.current) {
      webcamManagerRef.current.stopAnalysisLoop();
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas'); // Temp canvas for the image
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const imageUrl = URL.createObjectURL(blob);
    setImageSrc(imageUrl);

    if (webcamManagerRef.current) {
      webcamManagerRef.current.stopCamera();
    }
    setCapturing(false);

    // Finalize the result from the live buffer
    const finalSmoothed = emotionBufferRef.current.getSmoothedEmotion() || {
      emotion: 'neutral',
      confidence: 100,
      breakdown: []
    };

    const finalResult = {
      dominant: {
        emotion: finalSmoothed.emotion,
        confidence: finalSmoothed.confidence,
        emoji: getEmotionEmoji(finalSmoothed.emotion),
        moodScore: getEmotionMoodScore(finalSmoothed.emotion)
      },
      breakdown: finalSmoothed.breakdown.map(item => ({
        ...item,
        emoji: getEmotionEmoji(item.key),
        color: getEmotionColor(item.key)
      }))
    };

    setResult(finalResult);

    try {
      const moodScoreNormalized = (finalResult.dominant.moodScore - 1) / 8; 
      await axios.post(`${API}/mood`, {
        selfieScore: moodScoreNormalized,
        finalMoodScore: moodScoreNormalized,
        dominantEmotion: finalResult.dominant.emotion,
        type: 'selfie',
        metadata: {
          confidence: finalResult.dominant.confidence,
          emoji: finalResult.dominant.emoji,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Selfie mood saved to backend');
      toast.success(`Mood detected: ${finalResult.dominant.emotion} ${finalResult.dominant.emoji}`);
    } catch (saveErr) {
      console.warn('⚠️ Failed to save selfie mood:', saveErr.message);
    }
  };

  const retake = () => {
    setResult(null);
    setImageSrc(null);
    emotionBufferRef.current.clear();
    setLiveBreakdown([]);
    startCameraLoop();
  };

  const emotionEmoji = getEmotionEmoji(liveEmotion);
  const emotionColor = getEmotionColor(liveEmotion);

  return (
    <PageLayout activeTab="selfie">
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4">
        <div className="w-full max-w-lg space-y-4">

        {/* Page header */}
        <div className="text-center mb-6">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600 font-bold mb-2">MindMate</p>
          <h1 className="text-3xl font-extrabold text-slate-805">Mood Selfie</h1>
          <p className="text-lg text-slate-500 mt-1">Real-time emotion detection via computer vision</p>
        </div>

        <Card
          className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          {/* Camera viewport */}
          <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${capturing ? 'block' : 'hidden'}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${capturing ? 'block' : 'hidden'}`}
            />
            
            {capturing && (
              <>
                {/* FPS badge */}
                <div className="absolute top-3 left-3 z-20">
                  <div className="bg-black/50 backdrop-blur text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono font-bold">
                    <Activity size={12} className={currentFPS < 15 ? 'text-red-400' : 'text-emerald-400'} />
                    {currentFPS} FPS
                  </div>
                </div>

                {/* Live emotion pill */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                  <div className="bg-black/60 backdrop-blur-md px-5 py-2 rounded-full text-white font-semibold text-base shadow-lg flex items-center gap-2">
                    <span>{emotionEmoji}</span>
                    <span className="capitalize">{liveEmotion}</span>
                  </div>
                </div>
              </>
            )}

            {imageSrc && (
              <img
                src={imageSrc}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}

            {modelStatus === 'loading' && !capturing && !imageSrc && (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="animate-spin w-8 h-8 text-primary/70" />
                <span className="text-base font-medium text-slate-350">Loading Vision AI…</span>
              </div>
            )}

            {modelStatus === 'idle' && !capturing && !imageSrc && (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <Camera className="w-8 h-8 text-slate-700" />
                <span className="text-base text-slate-500">Initializing camera…</span>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-6 space-y-5">

            {modelStatus === 'error' && (
              <div className="flex items-center gap-2.5 p-4 bg-red-50 rounded-xl border border-red-100">
                <Brain className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-base text-red-700">Vision AI model failed to load. Please refresh the page.</span>
              </div>
            )}

            {capturing && modelStatus === 'ready' && (
              <>
                {/* Live probability bars */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Analysis</p>
                  {liveBreakdown.slice(0, 4).map((item) => (
                    <div key={item.key} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-center text-base leading-none">{item.emoji}</span>
                      <span className="w-16 capitalize text-slate-600 font-semibold text-sm">{item.key}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${item.confidence}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="w-9 text-right text-slate-500 font-mono text-sm font-bold">{item.confidence}%</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={captureImage}
                  className="w-full py-5 rounded-xl shadow-sm text-base font-bold"
                  style={{ background: '#1e293b', color: '#fff' }}
                >
                  <Camera className="mr-2 w-4 h-4" />
                  Capture Emotion
                </Button>
              </>
            )}

            {result && !capturing && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 space-y-5">
                {/* Result header */}
                <div className="text-center py-2">
                  <div
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
                    style={{ background: `${emotionColor}15` }}
                  >
                    <span className="text-3xl">{result.dominant.emoji}</span>
                    <div className="text-left">
                      <p className="text-xl font-bold text-slate-805 capitalize leading-none">{result.dominant.emotion}</p>
                      <p className="text-sm text-slate-450 mt-1 font-semibold">Confidence: {result.dominant.confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Breakdown bars */}
                <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Full Breakdown</p>
                  {result.breakdown.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-center text-base leading-none">{item.emoji}</span>
                      <span className="w-16 capitalize text-slate-700 font-semibold text-sm">{item.key}</span>
                      <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.confidence}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="w-9 text-right text-slate-500 font-mono text-sm font-bold">{item.confidence}%</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button onClick={retake} variant="outline" className="flex-1 py-5 rounded-xl border-slate-200 text-slate-650 text-base font-bold">
                    <RefreshCw className="mr-2 w-4 h-4" /> Retake
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 py-5 rounded-xl text-base font-bold"
                    style={{ background: '#1e293b', color: '#fff' }}
                  >
                    <CheckCircle className="mr-2 w-3.5 h-3.5" /> Continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default SelfiePage;