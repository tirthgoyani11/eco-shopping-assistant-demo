import { getProductInfo } from './ai.js';

let cameraStream;

/**
 * Starts the device's camera and streams it to a video element.
 * @param {HTMLVideoElement} videoEl - The <video> element to display the stream.
 * @param {HTMLElement} statusEl - The element to display status messages.
 */
export async function startCamera(videoEl, statusEl) {
    if (cameraStream || !videoEl) return;
    try {
        statusEl.textContent = "Requesting camera...";
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        videoEl.srcObject = cameraStream;
        statusEl.textContent = "Ready to scan";
    } catch (err) {
        console.error("Camera access denied:", err);
        statusEl.textContent = "Camera access denied.";
    }
}

/**
 * Stops the active camera stream.
 */
export function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

/**
 * Captures a frame from the video, converts it to base64, and sends it for AI analysis.
 * @param {HTMLVideoElement} videoEl - The <video> element with the live feed.
 * @returns {Promise<object|null>} A promise that resolves with the AI analysis result, or null on error.
 */
export async function captureAndAnalyze(videoEl) {
    if (!cameraStream) {
        console.error("Camera is not active.");
        return null;
    }

    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    // Convert the canvas image to a base64 string
    // The 'image/jpeg' format is efficient for sending over the network.
    const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];

    if (!base64Data) {
        console.error("Failed to capture image data.");
        return null;
    }

    // Send the captured image data to the AI for analysis
    const analysisResult = await getProductInfo(base64Data);
    return analysisResult;
}
