import { motion } from 'framer-motion';

const GlassSkeleton = ({ className = '', height = 'h-4', width = 'w-full' }) => {
    return (
        <div className={`relative overflow-hidden glass-card rounded-lg ${height} ${width} ${className} border-none bg-white/5`}>
            {/* Shimmer Effect */}
            <motion.div
                className="absolute inset-0 -translate-x-full"
                animate={{
                    translateX: ['-100%', '100%']
                }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear"
                }}
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
                }}
            />
        </div>
    );
};

export default GlassSkeleton;
