import PropTypes from 'prop-types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { BookOpen, Users, Clock, MapPin } from 'lucide-react';

const SubjectCard = ({ subject, hasClash, onRegister, onRequestJoin }) => {
    const isFull = subject.capacity.current >= subject.capacity.max;
    const capacityPercent = (subject.capacity.current / subject.capacity.max) * 100;

    let capacityColor = 'bg-green-500';
    if (capacityPercent >= 100) capacityColor = 'bg-red-500';
    else if (capacityPercent >= 80) capacityColor = 'bg-orange-500';

    return (
        <Card className={`${hasClash ? 'border-2 border-red-400' : ''}`}>
            <div className="space-y-4">
                {/* Header */}
                <div>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{subject.code}</h3>
                            <p className="text-sm text-gray-600 mt-1">{subject.name}</p>
                        </div>
                        <Badge status={isFull ? 'full' : 'approved'}>
                            Section {subject.section}
                        </Badge>
                    </div>
                    {hasClash && (
                        <p className="text-red-600 text-sm font-medium mt-2 flex items-center gap-1">
                            <Clock size={14} /> Schedule clash detected!
                        </p>
                    )}
                </div>

                {/* Capacity */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-medium text-gray-900">
                            {subject.capacity.current} / {subject.capacity.max}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all ${capacityColor}`}
                            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Schedule */}
                <div className="flex flex-wrap gap-2">
                    {subject.schedule.map((time, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                            <Clock size={12} />
                            {time}
                        </span>
                    ))}
                </div>

                {/* Lecturer & Room */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                        <Users size={14} />
                        {subject.lecturer}
                    </span>
                    <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        Room {subject.room}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {hasClash ? (
                        <Button variant="secondary" disabled className="flex-1">
                            <BookOpen size={16} />
                            Cannot Register (Clash)
                        </Button>
                    ) : isFull ? (
                        <Button variant="secondary" onClick={onRequestJoin} className="flex-1">
                            Request Join
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={onRegister} className="flex-1">
                            <BookOpen size={16} />
                            Register
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};

SubjectCard.propTypes = {
    subject: PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        section: PropTypes.string.isRequired,
        capacity: PropTypes.shape({
            current: PropTypes.number.isRequired,
            max: PropTypes.number.isRequired,
        }).isRequired,
        schedule: PropTypes.arrayOf(PropTypes.string).isRequired,
        lecturer: PropTypes.string.isRequired,
        room: PropTypes.string.isRequired,
    }).isRequired,
    hasClash: PropTypes.bool,
    onRegister: PropTypes.func,
    onRequestJoin: PropTypes.func,
};

SubjectCard.defaultProps = {
    hasClash: false,
};

export default SubjectCard;
