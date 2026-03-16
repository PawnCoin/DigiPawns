import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Activity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { PlusCircleIcon, CheckCircleIcon, UserCircleIcon, ArchiveIcon, ArrowUpCircleIcon } from './IconComponents';
import { motion } from 'framer-motion';

const ActivityIcon: React.FC<{ type: Activity['type'] }> = ({ type }) => {
    const commonClasses = "w-6 h-6";
    switch(type) {
        case 'loan-created':
            return <PlusCircleIcon className={`${commonClasses} text-blue-400`} />;
        case 'loan-repaid':
            return <ArrowUpCircleIcon className={`${commonClasses} text-green-400`} />;
        case 'loan-liquidated':
            return <ArchiveIcon className={`${commonClasses} text-red-400`} />;
        case 'profile-updated':
            return <UserCircleIcon className={`${commonClasses} text-indigo-400`} />;
        default:
            return <CheckCircleIcon className={`${commonClasses} text-gray-400`} />;
    }
};


const ActivityItem: React.FC<{ activity: Activity; index: number }> = ({ activity, index }) => {
    return (
        <motion.li 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex space-x-4"
        >
            <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-gray flex items-center justify-center border border-gray-700">
                    <ActivityIcon type={activity.type} />
                </div>
            </div>
            <div>
                <p className="text-gray-200">{activity.description}</p>
                <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
            </div>
        </motion.li>
    );
};

const ActivityView: React.FC = () => {
    const { activityLog } = useAppContext();

    return (
        <div className="max-w-4xl mx-auto">
             <div className="md:col-span-1 mb-8">
                <h2 className="text-2xl font-semibold mb-2">My Activity</h2>
                <p className="text-gray-400">A complete log of your recent actions on the platform.</p>
            </div>
            
            {activityLog.length > 0 ? (
                <div className="bg-brand-gray p-8 rounded-lg border border-gray-700">
                    <ul className="space-y-6">
                        {activityLog.map((activity, index) => (
                            <ActivityItem key={activity.id} activity={activity} index={index} />
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-center py-20 bg-brand-gray rounded-lg border border-dashed border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-300">No Activity Yet</h3>
                    <p className="text-gray-500 mt-2">Take an action like creating a loan or updating your profile to see it here.</p>
                </div>
            )}
        </div>
    );
};

export default ActivityView;
