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
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Recommended for You</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null; // Don't show if no recommendations
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-6 border border-indigo-100 dark:border-indigo-800"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Recommended for You</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Based on popularity and availability</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((course, index) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => onViewCourse && onViewCourse(course.code)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    {course.code}
                                </span>
                                <h4 className="font-semibold text-gray-800 dark:text-white text-sm line-clamp-2 mt-1">
                                    {course.name}
                                </h4>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span>{course.popularity} enrolled</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{course.credit_hours} credits</span>
                            </div>
                        </div>

                        <div className="mt-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${course.reason === 'Popular choice'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
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
