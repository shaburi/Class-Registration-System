import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
        // Listen to Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Get ID token
                    const idToken = await firebaseUser.getIdToken();
                    setToken(idToken);
                    localStorage.setItem('token', idToken);

                    // Fetch full user profile from backend
                    try {
                        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/auth/me`, {
                            headers: {
                                'Authorization': `Bearer ${idToken}`
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const userWithAuth = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                photoURL: firebaseUser.photoURL, // Google profile picture
                                displayName: firebaseUser.displayName,
                                ...data.user
                            };
                            setUser(userWithAuth);
                            localStorage.setItem('user', JSON.stringify(userWithAuth));
                        } else {
                            console.error('Failed to fetch user profile:', response.status);
                            // If backend doesn't recognize user yet (e.g. detailed profile not created),
                            // we might want to handle that. But google-auth service creates user on login.
                            // So this should generally succeed if token is valid.
                            setUser(null);
                        }
                    } catch (error) {
                        console.error('Error fetching user data:', error);
                        setUser(null);
                    }
                } catch (error) {
                    console.error('Error getting token:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            // Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            setToken(idToken);
            localStorage.setItem('token', idToken); // ← Save token to localStorage!

            // Detect role from email first
            const emailRole = userCredential.user.email.includes('student') ? 'student'
                : userCredential.user.email.includes('lecturer') ? 'lecturer'
                    : userCredential.user.email.includes('hop') ? 'hop'
                        : 'student';

            // Only fetch student profile for actual students
            if (emailRole === 'student') {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/student/profile`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        const userWithAuth = {
                            uid: userCredential.user.uid,
                            email: userCredential.user.email,
                            ...userData.data
                        };
                        setUser(userWithAuth);
                        localStorage.setItem('user', JSON.stringify(userWithAuth));
                        return { user: userWithAuth, token: idToken };
                    }
                } catch (profileError) {
                    console.log('Could not fetch student profile');
                }
            }

            // For HOP, lecturer, or if student profile fetch failed
            const defaultUser = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                role: emailRole
            };
            setUser(defaultUser);
            localStorage.setItem('user', JSON.stringify(defaultUser));

            return { user: defaultUser, token: idToken };
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.message || 'Login failed');
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        setUser,  // Expose setUser for direct user setting (e.g., after Google OAuth)
        isAuthenticated: !!user,
        isStudent: user?.role === 'student',
        isLecturer: user?.role === 'lecturer',
        isHOP: user?.role === 'hop'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
