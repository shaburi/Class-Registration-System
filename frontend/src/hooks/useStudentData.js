import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useStudentData = () => {
    // Data State
    const [registrations, setRegistrations] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);
    const [swapRequests, setSwapRequests] = useState([]);
    const [manualRequests, setManualRequests] = useState([]);
    const [dropRequests, setDropRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [subjectFilter, setSubjectFilter] = useState([]);
    const [importing, setImporting] = useState(false);
    const [semesterFilter, setSemesterFilter] = useState('current'); // 'current', 'all', or number

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [regsRes, sectionsRes, swapsRes, manualRes, dropRes] = await Promise.all([
                api.get(`/student/registrations`).catch(err => ({ data: { data: [] } })),
                api.get(`/student/subjects${semesterFilter !== 'current' ? `?filterSemester=${semesterFilter}` : ''}`).catch(err => ({ data: { data: [] } })),
                api.get(`/student/swap-requests`).catch(err => ({ data: { data: [] } })),
                api.get(`/student/manual-join-requests`).catch(err => ({ data: { data: [] } })),
                api.get(`/student/drop-requests`).catch(err => ({ data: { data: [] } }))
            ]);

            setRegistrations(regsRes.data.data || regsRes.data || []);
            setAvailableSections(sectionsRes.data.data || sectionsRes.data || []);
            setSwapRequests(swapsRes.data.data || swapsRes.data || []);
            setManualRequests(manualRes.data.data || manualRes.data || []);
            setDropRequests(dropRes.data.data || dropRes.data || []);
        } catch (error) {
            console.error('Backend API call failed:', error);
            // Fallback mock data handled by component if needed, or empty state
            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    }, [semesterFilter]);

    useEffect(() => {
        loadData();
    }, [loadData, semesterFilter]);

    // Actions
    const registerCourse = async (sectionId) => {
        const loadingToast = toast.loading('Registering...');
        try {
            await api.post(`/student/register/${sectionId}`);
            await loadData();
            toast.success('🎉 Successfully registered!', { id: loadingToast });
            return true;
        } catch (error) {
            console.error('Registration failed:', error);
            toast.error(error.response?.data?.message || 'Failed to register', { id: loadingToast });
            return false;
        }
    };

    const dropCourse = async (registrationId, reason) => {
        const loadingToast = toast.loading('Submitting drop request...');
        try {
            await api.post('/student/drop-request', {
                registration_id: registrationId,
                reason: reason.trim()
            });
            await loadData();
            toast.success('Drop request submitted! Awaiting HOP approval.', { id: loadingToast });
            return true;
        } catch (error) {
            console.error('Drop request failed:', error);
            toast.error(error.response?.data?.message || 'Failed to submit drop request', { id: loadingToast });
            return false;
        }
    };

    const requestSwap = async (requesterSectionId, targetStudentId, targetSectionId) => {
        try {
            await api.post('/student/swap-request', {
                requesterSectionId,
                targetId: targetStudentId,
                targetSectionId
            });
            await loadData();
            toast.success('Swap request created!');
            return true;
        } catch (error) {
            console.error('Swap request failed:', error);
            toast.error(error.response?.data?.message || 'Failed to create swap request');
            return false;
        }
    };

    const respondToSwap = async (swapRequestId, accept) => {
        try {
            await api.put(`/student/swap-request/${swapRequestId}/respond`, { accept });
            await loadData();
            toast.success(accept ? 'Swap request accepted!' : 'Swap request rejected');
            return true;
        } catch (error) {
            console.error('Swap response failed:', error);
            toast.error(error.response?.data?.message || 'Failed to respond to swap request');
            return false;
        }
    };

    const requestManualJoin = async (sectionId, reason) => {
        const loadingToast = toast.loading('Submitting request...');
        try {
            await api.post('/student/manual-join', {
                section_id: sectionId,
                reason: reason.trim()
            });
            await loadData();
            toast.success('Manual join request submitted!', { id: loadingToast });
            return true;
        } catch (error) {
            console.error('Request join failed:', error);
            toast.error(error.response?.data?.message || 'Failed to submit request', { id: loadingToast });
            return false;
        }
    };

    const importSubjects = async (data) => {
        setImporting(true);
        const loadingToast = toast.loading('Importing subjects...');
        try {
            const response = await api.post('/student/subjects/import', { subjects: data });
            const result = response.data.data || {};
            setSubjectFilter(result.imported || []);
            toast.success(`Imported ${result.imported?.length || 0} subjects!`, { id: loadingToast });

            if (result.invalid?.length > 0) {
                toast.error(`Invalid subjects: ${result.invalid.join(', ')}`);
            }
            return true;
        } catch (error) {
            toast.error('Import failed: ' + (error.response?.data?.message || error.message), { id: loadingToast });
            return false;
        } finally {
            setImporting(false);
        }
    };

    const clearFilter = async () => {
        const loadingToast = toast.loading('Clearing filter...');
        try {
            await api.delete('/student/subjects/filter');
            setSubjectFilter([]);
            toast.success('Subject filter cleared.', { id: loadingToast });
            return true;
        } catch (error) {
            toast.error('Failed to clear filter', { id: loadingToast });
            return false;
        }
    };

    return {
        // Data
        registrations,
        availableSections,
        swapRequests,
        manualRequests,
        dropRequests,
        loading,

        // Filter
        subjectFilter,
        importing,
        semesterFilter,
        setSemesterFilter,

        // Actions
        loadData,
        refreshData: loadData,
        registerCourse,
        dropCourse,
        requestSwap,
        respondToSwap,
        requestManualJoin,
        importSubjects,
        clearFilter
    };
};
