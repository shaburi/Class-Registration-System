import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Users, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function CourseRecommendations({ onViewCourse }) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecommendations();
    }, []);

    const loadRecommendations = async () => {
        try {
            const response = await api.get('/student/recommendations');
            setRecommendations(response.data.data || []);
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="relative bg-white/80 dark:bg-[#0d0f18]/80 backdrop-blur-2xl rounded-[32px] p-8 mb-8 border border-gray-200/50 dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-inner">
                        <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white font-heading tracking-tight drop-shadow-sm dark:drop-shadow-lg">Recommended for You</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null; // Don't show if no recommendations
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white/80 dark:bg-[#0d0f18]/80 backdrop-blur-2xl rounded-[32px] p-8 mb-8 border border-gray-200/50 dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden"
        >
            <div className="absolute inset-0 rounded-[32px] pointer-events-none border-t border-white/50 dark:border-white/10 opacity-50"></div>
            <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-inner relative group cursor-default">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 relative z-10" />
                </div>
                <div>
                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white font-heading tracking-tight drop-shadow-sm dark:drop-shadow-md">Recommended for You</h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest text-[10px]">Based on popularity & availability</p>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendations.map((course, index) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: 'spring', bounce: 0.4 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="bg-white/60 dark:bg-[#1a1d29]/60 backdrop-blur-md rounded-2xl p-5 border border-gray-200/50 dark:border-white/5 hover:border-blue-300/40 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 shadow-lg hover:shadow-[0_0_30px_rgba(37,99,235,0.1)] dark:hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => onViewCourse && onViewCourse(course.code)}
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-400/20 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-4">
                                <span className="text-[11px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-red-600 dark:from-blue-400 dark:to-red-400 uppercase tracking-widest drop-shadow-sm">
                                    {course.code}
                                </span>
                                <h4 className="font-bold text-gray-900 dark:text-white text-base line-clamp-2 mt-1.5 leading-snug">
                                    {course.name}
                                </h4>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors shrink-0">
                                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                            </div>
                        </div>

                        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                <Users className="w-4 h-4 text-blue-500/70 dark:text-blue-400/70" />
                                <span>{course.popularity} enrolled</span>
                            </div>
                            <div className="flex items-center gap-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                <Clock className="w-4 h-4 text-red-500/70 dark:text-red-400/70" />
                                <span>{course.credit_hours} credits</span>
                            </div>
                        </div>

                        <div className="mt-4 flex">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors shadow-inner ${course.reason === 'Popular choice'
                                ? 'border border-amber-500/30 text-amber-300 bg-amber-500/10 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)] group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : 'border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                }`}>
                                <TrendingUp className="w-3 h-3" />
                                {course.reason}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
