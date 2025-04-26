// Navigation and Section Switching
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    const featureCards = document.querySelectorAll('.feature-card');

    function switchSection(sectionId) {
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.style.display = 'block';
            selectedSection.classList.add('active');
            
            if (sectionId !== 'home') {
                const backButton = document.createElement('button');
                backButton.className = 'back-button';
                backButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to Home
                `;
                backButton.addEventListener('click', () => switchSection('home'));
                selectedSection.insertBefore(backButton, selectedSection.firstChild);
            }
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            switchSection(sectionId);
        });
    });

    // Handle feature card clicks
    featureCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = card.getAttribute('data-section');
            switchSection(sectionId);
        });
    });

    // Load videos from JSON file
    async function loadVideos() {
        try {
            const response = await fetch('videos.json');
            const data = await response.json();
            displayVideos(data.videos);
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    }

    // Display videos
    function displayVideos(videos) {
        const videoGrid = document.querySelector('.video-grid');
        if (!videoGrid) return;

        const filteredVideos = filterVideos(videos);
        const sortedVideos = sortVideos(filteredVideos);
        
        videoGrid.innerHTML = sortedVideos.map(video => createVideoCard(video)).join('');
    }

    // Filter videos
    function filterVideos(videos) {
        const searchTerm = document.getElementById('video-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-status')?.value || 'all';
        
        return videos.filter(video => {
            const matchesSearch = video.model.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }

    // Sort videos
    function sortVideos(videos) {
        const sortValue = document.getElementById('sort-by')?.value || 'date-desc';
        
        return [...videos].sort((a, b) => {
            switch (sortValue) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'model-asc':
                    return a.model.localeCompare(b.model);
                case 'model-desc':
                    return b.model.localeCompare(a.model);
                default:
                    return 0;
            }
        });
    }

    // Create video card HTML
    function createVideoCard(video) {
        return `
            <div class="video-card" data-id="${video.id}">
                <div class="video-thumbnail">
                    <img src="https://via.placeholder.com/300x200" alt="${video.model} Video Thumbnail">
                </div>
                <div class="video-info">
                    <h3>${video.model}</h3>
                    <p class="date">Date: ${video.date}</p>
                    <p class="status">Status: ${video.status}</p>
                    <a href="${video.megaLink}" class="download-link" target="_blank" rel="noopener noreferrer">Download Video</a>
                </div>
            </div>
        `;
    }

    // Add event listeners for search and sort
    const searchInput = document.getElementById('video-search');
    const sortSelect = document.getElementById('sort-by');
    const filterSelect = document.getElementById('filter-status');

    if (searchInput) {
        searchInput.addEventListener('input', () => loadVideos());
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', () => loadVideos());
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => loadVideos());
    }

    // Initial setup
    const initialSection = window.location.hash.substring(1) || 'home';
    switchSection(initialSection);
    loadVideos();
}); 