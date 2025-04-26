// Google API Configuration
const GOOGLE_CONFIG = {
    apiKey: 'AIzaSyDXpayNEui6Wy0_bV_uhB-KIHb46x6Af-g',
    clientId: '621314729660-8i4bh9h5nljm6korm7du1505soh9ffmn.apps.googleusercontent.com',
    folderId: '1dH5r7zB8Y-HchEdok5Hi1ZSTRP93ifdX', // Google Drive folder ID for uploads
};

// Application Configuration
const APP_CONFIG = {
    maxFileSize: 1024 * 1024 * 1024,  // 1GB in bytes
    allowedFileTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    spreadsheetId: '1vgGqMe-tWS1nF3_SIx46i4LkjDepCR908o4taHKwWRM', // Updated spreadsheet ID
    sheetRange: 'Videos!A2:D',  // The range in Google Sheets where video data will be stored
    columns: {
        title: 0,
        model: 1,
        url: 2,
        date: 3
    }
}; 