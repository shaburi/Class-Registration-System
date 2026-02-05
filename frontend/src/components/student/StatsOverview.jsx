import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, RefreshCw, Clock } from 'lucide-react';
import StatsCard from '../StatsCard';

const StatsOverview = ({ registrations, swapRequests, manualRequests }) => {
    const totalCreditHours = registrations.reduce((sum, r) => sum + (r.credit_hours || 0), 0);
    const pendingManualRequests = manualRequests.filter(r => r.status === 'pending').length;

    // Animation container
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
            <StatsCard
                icon={<BookOpen className="w-6 h-6" />}
                title="Registered Courses"
                value={registrations.length}
                color="indigo"
            />
            <StatsCard
                icon={<Calendar className="w-6 h-6" />}
                title="Total Credit Hours"
                value={totalCreditHours}
                color="purple"
            />
            <StatsCard
                icon={<RefreshCw className="w-6 h-6" />}
                title="Swap Requests"
                value={swapRequests.length}
                color="cyan"
            />
            <StatsCard
                icon={<Clock className="w-6 h-6" />}
                title="Manual Requests"
                value={pendingManualRequests}
                color="pink"
            />
        </motion.div>
    );
};

export default StatsOverview;
