import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SessionContext = createContext();

export function useSession() {
    return useContext(SessionContext);
}

export function SessionProvider({ children }) {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [selectedSessionId, setSelectedSessionId] = useState(() => {
        return localStorage.getItem('selectedSessionId') || null;
    });
    const [loading, setLoading] = useState(true);

    // Fetch sessions when user is authenticated
    useEffect(() => {
        if (user) {
            loadSessions();
        } else {
            // Reset state when user logs out
            setSessions([]);
            setCurrentSession(null);
            setLoading(false);
        }
    }, [user]);

    // Get the effective session (selected or active)
    const effectiveSession = selectedSessionId
        ? sessions.find(s => s.id === selectedSessionId)
        : currentSession;

    const loadSessions = async () => {
        try {
            setLoading(true);
            // Fetch all sessions
            const sessionsRes = await api.get('/sessions');
            const allSessions = sessionsRes.data.data || [];
            setSessions(allSessions);

            // Fetch active session
            const activeRes = await api.get('/sessions/active');
            const activeSession = activeRes.data.data;
            setCurrentSession(activeSession);

            // If no selected session, default to active
            if (!selectedSessionId && activeSession) {
                setSelectedSessionId(activeSession.id);
                localStorage.setItem('selectedSessionId', activeSession.id);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectSession = (sessionId) => {
        setSelectedSessionId(sessionId);
        localStorage.setItem('selectedSessionId', sessionId);
    };

    const isActiveSession = effectiveSession?.status === 'active';

    const value = {
        sessions,
        currentSession,
        selectedSession: effectiveSession,
        selectedSessionId,
        selectSession,
        isActiveSession,
        loading,
        refreshSessions: loadSessions
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

export default SessionContext;

