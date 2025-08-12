// This module is responsible for all camera operations.

let cameraStream;

/**
 * Starts the device's camera and streams it to a video element.
 * @param {HTMLVideoElement} videoEl - The <video> element to display the stream.
 * @param {HTMLElement} statusEl - The element to display status messages.
 */
export async function startCamera(videoEl, statusEl) {
    if (cameraStream || !videoEl) {
        console.log("Camera stream already active or video element not found.");
        return;
    }
    try {
        statusEl.textContent = "Requesting camera...";
        // Request the camera stream with 'environment' (rear camera) preference
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
 * Stops the active camera stream and releases the device camera.
 */
export function stopCamera() {
    if (cameraStream) {
        // Stop all tracks in the stream to turn off the camera light
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

/**
 * Captures a single frame from the video feed and returns it as base64 data.
 * @param {HTMLVideoElement} videoEl - The <video> element with the live feed.
 * @returns {string|null} The base64-encoded image data in JPEG format, or null on error.
 */
export function captureFrame(videoEl) {
    if (!cameraStream) {
        console.error("Camera is not active. Cannot capture frame.");
        return null;
    }

    // Create a canvas element to draw the video frame onto
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    
    // Draw the current video frame to the canvas
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    // Convert the canvas image to a base64 string
    // The 'image/jpeg' format is efficient for sending over the network.
    // The split(',')[1] removes the "data:image/jpeg;base64," prefix.
    const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];

    if (!base64Data) {
        console.error("Failed to capture image data from canvas.");
        return null;
    }
    
    return base64Data;
}
