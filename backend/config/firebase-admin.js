const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
    try {
        //  Check if already initialized
        if (admin.apps.length > 0) {
            console.log('Firebase Admin already initialized');
            return admin.app();
        }

        // Initialize with service account credentials from environment
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        };

        // Validate required environment variables
        if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
            throw new Error(
                'Missing Firebase Admin SDK credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env'
            );
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin SDK initialized successfully');
        return admin.app();
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        throw error;
    }
};

module.exports = {
    initializeFirebaseAdmin,
    admin
};
