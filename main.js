class VideoPlayer {
    constructor() {
        this.videoFiles = [];
        this.currentVideoIndex = 0;
        this.video = document.getElementById('videoPlayer');
        this.fileNameEl = document.getElementById('fileName');
        this.statsEl = document.getElementById('stats');
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.displayAllAnnotations();
    }

    initializeElements() {
        this.selectFolderBtn = document.getElementById('selectFolder');
        this.prevVideoBtn = document.getElementById('prevVideo');
        this.nextVideoBtn = document.getElementById('nextVideo');
        this.playPauseBtn = document.getElementById('playPause');
        this.shortcutsEl = document.querySelector('.shortcuts');
        this.annotationsEl = document.getElementById('annotations');
    }

    setupEventListeners() {
        this.selectFolderBtn.addEventListener('click', () => this.selectFolder());
        this.prevVideoBtn.addEventListener('click', () => this.previousVideo());
        this.nextVideoBtn.addEventListener('click', () => this.nextVideo());
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        this.video.addEventListener('ended', () => this.nextVideo());
        this.video.addEventListener('timeupdate', () => this.updateStats());
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for our shortcuts
            const shortcuts = [' ', 'k', 'ArrowLeft', 'ArrowRight', 'j', 'l', 'p', 'n', 'z', 'x', 'a', 'o', '0', 'Enter'];
            
            if (shortcuts.includes(e.key)) {
                e.preventDefault();
            }

            switch(e.key) {
                case '0':
                    this.restartVideo();
                    break;
                case 'Enter':
                    this.addAnnotation();
                    break;
                case 'o':
                    this.selectFolder();
                    break;
                case ' ':
                case 'k':
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    this.rewind(3.7);
                    break;
                case 'ArrowRight':
                    this.forward(3.7);
                    break;
                case 'j':
                    this.rewind(8);
                    break;
                case 'l':
                    this.forward(8);
                    break;
                case 'p':
                    this.previousVideo();
                    break;
                case 'n':
                    this.nextVideo();
                    break;
                case 'z':
                    this.changePlaybackRate(-0.2);
                    break;
                case 'x':
                    this.changePlaybackRate(0.2);
                    break;
                case 'a':
                    this.video.playbackRate = 1.0;
                    break;
            }
        });
    }

    async selectFolder() {
        try {
            // Use the File System Access API
            const dirHandle = await window.showDirectoryPicker();
            this.videoFiles = [];
            
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.webm')) {
                    const file = await entry.getFile();
                    this.videoFiles.push({
                        name: entry.name,
                        file: file,
                        url: URL.createObjectURL(file)
                    });
                }
            }
            
            if (this.videoFiles.length > 0) {
                this.sortVideosByOpenedStatus();
                this.currentVideoIndex = 0;
                this.enableControls();
                this.hideShortcuts();
                this.hideAnnotations();
                this.loadCurrentVideo();
            } else {
                alert('No .webm files found in the selected folder.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting folder:', err);
                alert('Error selecting folder. Make sure you\'re using a modern browser that supports the File System Access API.');
            }
        }
    }

    enableControls() {
        this.prevVideoBtn.disabled = false;
        this.nextVideoBtn.disabled = false;
        this.playPauseBtn.disabled = false;
        this.video.style.display = 'block';
    }

    hideShortcuts() {
        this.shortcutsEl.classList.add('hidden');
    }

    hideAnnotations() {
        this.annotationsEl.style.display = 'none';
    }

    addAnnotation() {
        if (this.videoFiles.length === 0) return;
        
        // Pause the video and remember if it was playing
        const wasPlaying = !this.video.paused;
        if (wasPlaying) {
            this.video.pause();
        }
        
        const text = prompt('Enter annotation:');
        
        // Resume video if it was playing before
        if (wasPlaying) {
            this.video.play();
        }
        
        if (text && text.trim()) {
            const currentVideo = this.videoFiles[this.currentVideoIndex];
            const timeMs = Math.floor(this.video.currentTime * 1000);
            
            const stats = this.getVideoStats(currentVideo.name);
            if (!stats.annotations) {
                stats.annotations = [];
            }
            
            stats.annotations.push({
                timeMs: timeMs,
                text: text.trim()
            });
            
            this.saveVideoStats(currentVideo.name, stats);
        }
    }

    displayAllAnnotations() {
        const allAnnotations = [];
        
        // Get all items from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith('.webm')) {
                try {
                    const stats = JSON.parse(localStorage.getItem(key));
                    if (stats.annotations && stats.annotations.length > 0) {
                        stats.annotations.forEach(annotation => {
                            allAnnotations.push({
                                fileName: key,
                                timeMs: annotation.timeMs,
                                text: annotation.text,
                                timeFormatted: this.formatTime(annotation.timeMs / 1000)
                            });
                        });
                    }
                } catch (e) {
                    console.error('Error parsing stats for', key, e);
                }
            }
        }
        
        // Sort by file name, then by time
        allAnnotations.sort((a, b) => {
            if (a.fileName !== b.fileName) {
                return a.fileName.localeCompare(b.fileName);
            }
            return a.timeMs - b.timeMs;
        });
        
        // Display annotations
        if (allAnnotations.length > 0) {
            let html = '<h3>All Annotations</h3>';
            let currentFile = '';
            
            allAnnotations.forEach(annotation => {
                if (annotation.fileName !== currentFile) {
                    if (currentFile !== '') html += '</div>';
                    html += `<div class="file-annotations"><h4>${annotation.fileName}</h4>`;
                    currentFile = annotation.fileName;
                }
                html += `<div class="annotation-item">
                    <span class="time">${annotation.timeFormatted}</span>
                    <span class="text">${annotation.text}</span>
                </div>`;
            });
            
            if (currentFile !== '') html += '</div>';
            this.annotationsEl.innerHTML = html;
        } else {
            this.annotationsEl.innerHTML = '<h3>No annotations yet</h3><p>Press Enter while watching videos to add annotations.</p>';
        }
    }

    sortVideosByOpenedStatus() {
        // Sort videos: unopened first, then opened, both alphabetically within their groups
        this.videoFiles.sort((a, b) => {
            const aStats = this.getVideoStats(a.name);
            const bStats = this.getVideoStats(b.name);
            
            // If one is opened and the other isn't, prioritize the unopened one
            if (aStats.opened !== bStats.opened) {
                return aStats.opened ? 1 : -1;
            }
            
            // If both have the same opened status, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }

    restartVideo() {
        // Only restart if we have videos loaded
        if (this.videoFiles.length === 0) {
            return;
        }
        
        this.video.currentTime = 0;
        if (this.video.paused) {
            this.video.play();
        }
    }

    loadCurrentVideo() {
        if (this.videoFiles.length === 0) return;
        
        const currentVideo = this.videoFiles[this.currentVideoIndex];
        this.video.src = currentVideo.url;
        this.fileNameEl.textContent = currentVideo.name;
        
        // Mark as opened
        const stats = this.getVideoStats(currentVideo.name);
        this.saveVideoStats(currentVideo.name, { opened: true });
        
        this.video.load();
    }

    onVideoLoaded() {
        // Always start from the beginning
        this.video.currentTime = 0;
        this.updateStats();
        this.video.play();
    }

    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
            this.playPauseBtn.textContent = 'Pause';
        } else {
            this.video.pause();
            this.playPauseBtn.textContent = 'Play';
        }
    }

    rewind(seconds) {
        this.video.currentTime = Math.max(0, this.video.currentTime - seconds);
    }

    forward(seconds) {
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + seconds);
    }

    changePlaybackRate(delta) {
        const newRate = Math.max(0.2, this.video.playbackRate + delta);
        this.video.playbackRate = newRate;
    }

    previousVideo() {
        if (this.videoFiles.length === 0) return;
        
        this.currentVideoIndex = (this.currentVideoIndex - 1 + this.videoFiles.length) % this.videoFiles.length;
        this.loadCurrentVideo();
    }

    nextVideo() {
        if (this.videoFiles.length === 0) return;
        
        this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videoFiles.length;
        this.loadCurrentVideo();
    }

    getVideoStats(fileName) {
        const saved = localStorage.getItem(fileName);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing saved stats:', e);
            }
        }
        return { opened: false };
    }

    saveVideoStats(fileName, stats) {
        localStorage.setItem(fileName, JSON.stringify(stats));
    }

    updateStats() {
        if (this.videoFiles.length === 0) return;
        
        const currentVideo = this.videoFiles[this.currentVideoIndex];
        const stats = this.getVideoStats(currentVideo.name);
        const currentTime = this.formatTime(this.video.currentTime);
        const duration = this.formatTime(this.video.duration);
        const playbackRate = this.video.playbackRate.toFixed(1);
        
        this.statsEl.innerHTML = `
            Video ${this.currentVideoIndex + 1} of ${this.videoFiles.length} | 
            ${currentTime} / ${duration} | 
            Speed: ${playbackRate}x | 
            ${stats.opened ? 'Previously watched' : 'New'}
        `;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize the video player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoPlayer();
});