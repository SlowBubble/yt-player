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
    }

    initializeElements() {
        this.selectFolderBtn = document.getElementById('selectFolder');
        this.prevVideoBtn = document.getElementById('prevVideo');
        this.nextVideoBtn = document.getElementById('nextVideo');
        this.playPauseBtn = document.getElementById('playPause');
        this.shortcutsEl = document.querySelector('.shortcuts');
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
            const shortcuts = [' ', 'k', 'ArrowLeft', 'ArrowRight', 'j', 'l', 'p', 'n', 'z', 'x', 'a', 'o', '0'];
            
            if (shortcuts.includes(e.key)) {
                e.preventDefault();
            }

            switch(e.key) {
                case '0':
                    this.restartVideo();
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