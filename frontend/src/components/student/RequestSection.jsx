import React, { useState } from 'react';
import { RefreshCw, XCircle, CheckCircle, ArrowRightLeft, Clock } from 'lucide-react';
import api from '../../services/api';

const RequestSection = ({
    swapRequests,
    manualRequests,
    dropRequests,
    currentUserId,
    onSwapResponse,
    onRefresh
}) => {
    const [clearing, setClearing] = useState(false);

    const handleClearCompleted = async () => {
        if (!window.confirm('Are you sure you want to permanently delete all completed requests? This action cannot be undone.')) {
            return;
        }

        setClearing(true);
        try {
            const completedSwaps = swapRequests.filter(r => r.status !== 'pending').map(r => r.id);
            const completedManual = manualRequests.filter(r => r.status !== 'pending').map(r => r.id);
            const completedDrops = dropRequests.filter(r => r.status !== 'pending').map(r => r.id);

            const total = completedSwaps.length + completedManual.length + completedDrops.length;
            if (total === 0) {
                alert('No completed requests to clear.');
                setClearing(false);
                return;
            }

            const deletePromises = [
                ...completedSwaps.map(id => api.delete(`/student/swap-request/${id}`).catch(err => console.error(err))),
                ...completedManual.map(id => api.delete(`/student/manual-join-request/${id}`).catch(err => console.error(err))),
                ...completedDrops.map(id => api.delete(`/student/drop-request/${id}`).catch(err => console.error(err)))
            ];

            await Promise.all(deletePromises);
            await onRefresh();
            alert(`Cleared ${total} completed requests.`);
        } catch (error) {
            console.error('Failed to clear requests', error);
            alert('Failed to clear some requests.');
        } finally {
            setClearing(false);
        }
    };

    const hasCompletedRequests =
        swapRequests.some(r => r.status !== 'pending') ||
        manualRequests.some(r => r.status !== 'pending') ||
        dropRequests.some(r => r.status !== 'pending');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Actions */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Requests</h2>
                {hasCompletedRequests && (
                    <button
                        onClick={handleClearCompleted}
                        disabled={clearing}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-lg transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Clear Completed
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Swap Requests Column */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-gray-700">
                        <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                        Swap Requests
                    </h3>
                    {swapRequests.length === 0 ? (
                        <EmptyState message="No active swap requests" />
                    ) : (
                        <div className="space-y-3">
                            {swapRequests.map(req => (
                                <SwapRequestCard
                                    key={req.id}
                                    req={req}
                                    currentUserId={currentUserId}
                                    onResponse={onSwapResponse}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Other Requests Column */}
                <div className="space-y-8">
                    {/* Manual Join Requests */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-gray-700">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Manual Join Requests
                        </h3>
                        {manualRequests.length === 0 ? (
                            <EmptyState message="No manual join requests" />
                        ) : (
                            <div className="space-y-3">
                                {manualRequests.map(req => (
                                    <ManualRequestCard key={req.id} req={req} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Drop Requests */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-gray-700">
                            <XCircle className="w-5 h-5 text-red-500" />
                            Drop Requests
                        </h3>
                        {dropRequests.length === 0 ? (
                            <EmptyState message="No drop requests" />
                        ) : (
                            <div className="space-y-3">
                                {dropRequests.map(req => (
                                    <DropRequestCard key={req.id} req={req} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const EmptyState = ({ message }) => (
    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-500 dark:text-gray-400 italic">{message}</p>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
};

const SwapRequestCard = ({ req, currentUserId, onResponse }) => {
    const isTarget = req.target_id === currentUserId;
    const isPending = req.status === 'pending';
    const canRespond = isTarget && isPending;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <StatusBadge status={req.status} />
                <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{req.requester_name}</span>
                    <span className="text-xs">wants to swap</span>
                </div>
                <div className="mt-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{req.requester_subject_code}</span>
                        <span className="text-gray-500">Sec {req.requester_section_number}</span>
                    </div>
                    <div className="flex justify-center my-1 text-gray-400"><ArrowRightLeft size={14} /></div>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{req.target_subject_code}</span>
                        <span className="text-gray-500">Sec {req.target_section_number}</span>
                    </div>
                </div>
            </div>

            {canRespond && (
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => onResponse(req.id, true)}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition"
                    >
                        Accept
                    </button>
                    <button
                        onClick={() => onResponse(req.id, false)}
                        className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-sm font-bold rounded-lg transition"
                    >
                        Reject
                    </button>
                </div>
            )}

            {req.status === 'rejected' && (
                <p className="text-xs text-red-500 mt-2 italic">Request was rejected</p>
            )}
            {req.status === 'approved' && (
                <p className="text-xs text-green-500 mt-2 italic flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Swapped successfully</p>
            )}
        </div>
    );
};

const ManualRequestCard = ({ req }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
        <div className="flex justify-between items-start mb-2 pl-2">
            <div>
                <p className="font-bold text-gray-800 dark:text-white">{req.subject_code}</p>
                <p className="text-sm text-gray-500">Section {req.section_number}</p>
            </div>
            <StatusBadge status={req.status} />
        </div>
        <div className="pl-2 mt-3 text-sm">
            <span className="text-gray-400 block text-xs uppercase font-bold mb-1">Reason</span>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">{req.reason}</p>
        </div>
        {req.rejection_reason && (
            <div className="pl-2 mt-2 text-sm">
                <span className="text-red-400 block text-xs uppercase font-bold mb-1">Admin Response</span>
                <p className="text-red-600 dark:text-red-400">{req.rejection_reason}</p>
            </div>
        )}
    </div>
);

const DropRequestCard = ({ req }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-red-400'}`}></div>
        <div className="flex justify-between items-start mb-2 pl-2">
            <div>
                <p className="font-bold text-gray-800 dark:text-white">{req.subject_code}</p>
                <p className="text-xs text-gray-500">{req.subject_name}</p>
            </div>
            <StatusBadge status={req.status} />
        </div>
        <div className="pl-2 mt-3 text-sm">
            <span className="text-gray-400 block text-xs uppercase font-bold mb-1">Reason for Dropping</span>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">{req.reason}</p>
        </div>
    </div>
);

export default RequestSection;
