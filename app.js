// GIS access token
let accessToken = null;
let tokenClient = null;

window.onload = function() {
    // Initialize the GIS token client
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            localStorage.setItem('accessToken', accessToken);
            const signInBtn = document.getElementById('googleSignInBtn');
            if (signInBtn) signInBtn.style.display = 'none';
            window.videoManager = new VideoManager();
        },
    });

    // Check if already signed in
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
        accessToken = storedToken;
        const signInBtn = document.getElementById('googleSignInBtn');
        if (signInBtn) signInBtn.style.display = 'none';
        window.videoManager = new VideoManager();
    }
};

function requestAccessToken() {
    tokenClient.requestAccessToken();
}

class VideoManager {
    constructor() {
        this.videos = [];
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Initialize Google API client (no auth2)
            await this.initializeGoogleClient();
            // Load existing videos
            await this.loadVideos();
            // Set up event listeners
            this.setupEventListeners();
            this.showMessage('Application initialized successfully', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showMessage('Failed to initialize application: ' + (error.message || error), 'danger');
        }
    }

    async initializeGoogleClient() {
        try {
            console.log('Initializing Google API client...');
        await new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                        console.log('Loading Google API client...');
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.apiKey,
                    });
                        console.log('Google API client initialized successfully');
                        
                    // Load the Sheets and Drive APIs
                        console.log('Loading Sheets API...');
                    await gapi.client.load('sheets', 'v4');
                        console.log('Loading Drive API...');
                    await gapi.client.load('drive', 'v3');
                        console.log('All APIs loaded successfully');
                    resolve();
                } catch (error) {
                        console.error('Error initializing Google API client:', error);
                    reject(error);
                }
            });
        });
        } catch (error) {
            console.error('Failed to initialize Google API client:', error);
            throw new Error('Failed to initialize Google API client: ' + (error.message || 'Unknown error'));
        }
    }

    async uploadToDrive(file, progressCallback) {
        try {
            const metadata = {
                name: file.name,
                mimeType: file.type,
                parents: [GOOGLE_CONFIG.folderId]
            };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                },
                body: form
            });
            if (!response.ok) {
                throw new Error('Upload failed: ' + response.statusText);
            }
            const result = await response.json();
            // Set file permissions to anyone with the link
            await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: 'reader', type: 'anyone' })
            });
            return `https://drive.google.com/file/d/${result.id}/preview`;
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('Failed to upload file: ' + error.message);
        }
    }

    async loadVideos() {
        try {
            console.log('Loading videos from spreadsheet:', APP_CONFIG.spreadsheetId);
            if (!APP_CONFIG.spreadsheetId) {
                throw new Error('Spreadsheet ID is not defined');
            }
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: APP_CONFIG.spreadsheetId,
                range: APP_CONFIG.sheetRange
            });
            console.log('API Response:', response);
            this.videos = response.result.values || [];
            this.displayVideos(this.videos);
        } catch (error) {
            console.error('Failed to load videos:', error);
            this.showMessage('Failed to load videos: ' + (error.message || 'Unknown error'), 'danger');
        }
    }

    setupEventListeners() {
        // Upload form submission
        const uploadForm = document.getElementById('uploadForm');
        if (!uploadForm) {
            console.error('Upload form not found!');
            return;
        }

        uploadForm.addEventListener('submit', async (e) => {
            console.log('Form submission triggered');
            e.preventDefault();
            try {
                await this.handleVideoUpload();
            } catch (error) {
                console.error('Error in form submission:', error);
                this.showMessage('Upload failed: ' + error.message, 'danger');
            }
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }

    async handleVideoUpload() {
        console.log('Starting video upload process');
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        const modelInput = document.getElementById('modelName');
        const progressBar = document.getElementById('uploadProgress');
        const progressDiv = document.getElementById('progressDiv');

        if (!fileInput || !titleInput || !modelInput || !progressBar || !progressDiv) {
            console.error('Required form elements not found:', {
                fileInput: !!fileInput,
                titleInput: !!titleInput,
                modelInput: !!modelInput,
                progressBar: !!progressBar,
                progressDiv: !!progressDiv
            });
            throw new Error('Form elements not found');
        }

        const file = fileInput.files[0];
        const title = titleInput.value.trim();
        const model = modelInput.value.trim();

        console.log('Form data:', { 
            hasFile: !!file, 
            title, 
            model,
            fileType: file?.type,
            fileSize: file?.size
        });

        if (!file || !title || !model) {
            this.showMessage('Please fill in all fields', 'warning');
            return;
        }

        if (!APP_CONFIG.allowedFileTypes.includes(file.type)) {
            this.showMessage('Invalid file type. Please upload MP4, WebM, or QuickTime video.', 'warning');
            return;
        }

        if (file.size > APP_CONFIG.maxFileSize) {
            this.showMessage('File size exceeds the maximum limit of 1GB', 'warning');
            return;
        }

        try {
            // Force token refresh before uploading to Drive
            await new Promise((resolve) => {
                tokenClient.callback = (tokenResponse) => {
                    accessToken = tokenResponse.access_token;
                    localStorage.setItem('accessToken', accessToken);
                    resolve();
                };
                tokenClient.requestAccessToken();
            });

            console.log('Starting Google Drive upload process');
            progressDiv.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            
            // Upload to Google Drive
            const shareLink = await this.uploadToDrive(file, (progress) => {
                console.log('Upload progress:', progress);
                progressBar.style.width = progress + '%';
                progressBar.textContent = progress + '%';
            });
            
            console.log('Upload successful, share link:', shareLink);

            // Add to Google Sheets
            await this.addVideoToSheet(title, model, shareLink);
            
            // Reset form
            fileInput.value = '';
            titleInput.value = '';
            modelInput.value = '';
            progressDiv.classList.add('d-none');
            
            // Reload videos
            await this.loadVideos();
            
            this.showMessage('Video uploaded successfully!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            progressDiv.classList.add('d-none');
            this.showMessage('Upload failed: ' + error.message, 'danger');
        }
    }

    async addVideoToSheet(title, model, url) {
        const date = new Date().toISOString();
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: APP_CONFIG.spreadsheetId,
            range: APP_CONFIG.sheetRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[title, model, url, date, 'To Do']]
            }
        });
    }

    async updateVideoStatus(rowIndex, newStatus) {
        // rowIndex is 0-based for the data, but +2 for the sheet (header + 1-based)
        const sheetRow = rowIndex + 2;
        const range = `Videos!E${sheetRow}`;
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: APP_CONFIG.spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newStatus]] }
        });
        await this.loadVideos();
    }

    handleSearch(query, statusFilter = 'all') {
        query = query.toLowerCase();
        let filteredVideos = this.videos.filter(video => 
            video[APP_CONFIG.columns.title].toLowerCase().includes(query) ||
            video[APP_CONFIG.columns.model].toLowerCase().includes(query)
        );
        if (statusFilter !== 'all') {
            filteredVideos = filteredVideos.filter(video => {
                const status = (video[APP_CONFIG.columns.status] || '').toLowerCase();
                if (statusFilter === 'to_do') return status !== 'completed';
                if (statusFilter === 'completed') return status === 'completed';
                return true;
            });
        }
        this.displayVideos(filteredVideos);
    }

    displayVideos(videos) {
        const container = document.getElementById('videoGrid');
        container.innerHTML = '';

        // Skip the header row if present
        const dataRows = videos.filter(video => {
            // If the first cell is 'Title', skip it
            return video[APP_CONFIG.columns.title]?.toLowerCase() !== 'title';
        });

        dataRows.forEach((video, idx) => {
            const [title, model, url, date, status] = video;
            const card = this.createVideoCard(title, model, url, date, status, idx);
            container.appendChild(card);
        });
    }

    createVideoCard(title, model, url, date, status, idx) {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    <p class="card-text">Model: ${model}</p>
                    <p class="card-text"><small class="text-muted">Uploaded: ${date ? new Date(date).toLocaleDateString() : ''}</small></p>
                    <p class="card-text">Status: <span class="badge ${status === 'Completed' ? 'bg-success' : 'bg-secondary'}">${status || 'To Do'}</span></p>
                    <div class="d-flex gap-2">
                        <a href="${url}" target="_blank" class="btn btn-primary">View Video</a>
                        ${status !== 'Completed' ? `<button class="btn btn-success" onclick="window.videoManager.markComplete(${idx})">Complete</button>` : ''}
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    async markComplete(idx) {
        // Refresh token before updating status
        await new Promise((resolve) => {
            tokenClient.callback = (tokenResponse) => {
                accessToken = tokenResponse.access_token;
                localStorage.setItem('accessToken', accessToken);
                resolve();
            };
            tokenClient.requestAccessToken();
        });
        this.updateVideoStatus(idx, 'Completed');
    }

    showMessage(message, type) {
        const alertsContainer = document.getElementById('alerts');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertsContainer.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }
} 