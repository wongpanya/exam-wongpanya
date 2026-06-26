import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '../config/api';

const CategoryTutorialModal = ({ user, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const steps = [
        {
            title: "จัดหมวดหมู่ข้อสอบ",
            description: "กำหนดหมวดหมู่ตอนสร้างหรือแก้ไขข้อสอบ เพื่อจัดระเบียบชุดข้อสอบของคุณตามวิชา บทเรียน หรือหัวข้อหลักได้อย่างอิสระ",
            illustration: (
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    {/* Circle Background */}
                    <div className="absolute inset-0 rounded-full bg-cyan-100/60 animate-pulse" />
                    {/* SVG Graphic */}
                    <svg className="w-24 h-24 relative z-10" viewBox="0 0 100 100" fill="none">
                        {/* Card 1 */}
                        <rect x="20" y="25" width="45" height="50" rx="8" fill="url(#grad-card1)" className="drop-shadow-md" />
                        <line x1="28" y1="37" x2="57" y2="37" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        <line x1="28" y1="47" x2="50" y2="47" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        {/* Card 2 (Overlapping) */}
                        <rect x="42" y="38" width="45" height="50" rx="8" fill="url(#grad-card2)" className="drop-shadow-lg" />
                        <line x1="50" y1="50" x2="79" y2="50" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        <line x1="50" y1="60" x2="70" y2="60" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Tag/Badge inside Card 2 */}
                        <rect x="50" y="70" width="22" height="10" rx="4" fill="#10B981" />
                        <circle cx="55" cy="75" r="1.5" fill="white" />
                        
                        {/* Checkmark Badge */}
                        <circle cx="25" cy="72" r="9" fill="#14B8A6" className="drop-shadow" />
                        <path d="M21 72l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Gradients */}
                        <defs>
                            <linearGradient id="grad-card1" x1="20" y1="25" x2="65" y2="75" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#38BDF8" />
                                <stop offset="100%" stopColor="#0284C7" />
                            </linearGradient>
                            <linearGradient id="grad-card2" x1="42" y1="38" x2="87" y2="88" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#818CF8" />
                                <stop offset="100%" stopColor="#4F46E5" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            )
        },
        {
            title: "ค้นหาและคัดกรอง",
            description: "เลือกกรองข้อสอบเฉพาะหมวดหมู่ที่คุณสนใจ หรือพิมพ์ค้นหาตามชื่อ/รหัสข้อสอบได้ในพริบตาผ่านแถบค้นหาด้านบน",
            illustration: (
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    {/* Circle Background */}
                    <div className="absolute inset-0 rounded-full bg-amber-100/60" />
                    {/* SVG Graphic */}
                    <svg className="w-24 h-24 relative z-10" viewBox="0 0 100 100" fill="none">
                        {/* Main Round Base */}
                        <circle cx="50" cy="50" r="35" fill="url(#grad-circle-orange)" className="drop-shadow-lg" />
                        
                        {/* Piggy nose/face representation inspired by example */}
                        <circle cx="50" cy="50" r="20" fill="#FCA5A5" />
                        <rect x="42" y="46" width="16" height="10" rx="5" fill="#EF4444" />
                        <circle cx="47" cy="51" r="2.5" fill="white" />
                        <circle cx="53" cy="51" r="2.5" fill="white" />
                        
                        {/* Cute eyes */}
                        <circle cx="42" cy="38" r="3.5" fill="#1E293B" />
                        <circle cx="41.5" cy="36.5" r="1" fill="white" />
                        <circle cx="58" cy="38" r="3.5" fill="#1E293B" />
                        <circle cx="57.5" cy="36.5" r="1" fill="white" />
                        
                        {/* Ears */}
                        <path d="M35 30c-5-5-2 10-2 10s10-2 5-8z" fill="#FCA5A5" />
                        <path d="M65 30c5-5 2 10 2 10s-10-2-5-8z" fill="#FCA5A5" />

                        {/* Sack collar */}
                        <path d="M28 62c5-3 39-3 44 0s-5 18-22 18-27-15-22-18z" fill="#B45309" />

                        <defs>
                            <linearGradient id="grad-circle-orange" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            )
        },
        {
            title: "เริ่มใช้งานเลย!",
            description: "ระบบพร้อมสำหรับคุณแล้ว เริ่มต้นสร้างข้อสอบหรือแก้ไขข้อสอบเดิมเพื่อเพิ่มหมวดหมู่ และยกระดับการจัดการข้อสอบของคุณ",
            illustration: (
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    {/* Circle Background */}
                    <div className="absolute inset-0 rounded-full bg-rose-100/60" />
                    {/* SVG Graphic */}
                    <svg className="w-24 h-24 relative z-10" viewBox="0 0 100 100" fill="none">
                        {/* Round Red Base */}
                        <circle cx="50" cy="50" r="35" fill="url(#grad-circle-pink)" className="drop-shadow-lg" />
                        
                        {/* Cute Ghost Headset Character */}
                        <path d="M30 50c0-12 9-20 20-20s20 8 20 20v15c0 3-2 5-5 5s-4-2-5-4c-2 2-4 4-7 4s-5-2-7-4c-1 2-3 4-6 4s-5-2-5-5V50z" fill="white" />
                        
                        {/* Eyes & Smile */}
                        <path d="M42 45c1-1 3-1 4 0" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M54 45c1-1 3-1 4 0" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M46 52c0 2 2 4 4 4s4-2 4-4" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                        
                        {/* Headset (Cyan) */}
                        <path d="M26 50c0-14 11-24 24-24s24 10 24 24" stroke="#06B6D4" strokeWidth="5" strokeLinecap="round" fill="none" />
                        <rect x="22" y="44" width="7" height="12" rx="3.5" fill="#06B6D4" />
                        <rect x="71" y="44" width="7" height="12" rx="3.5" fill="#06B6D4" />
                        {/* Mic wire */}
                        <path d="M26 53c0 5 8 7 12 5" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        
                        <defs>
                            <linearGradient id="grad-circle-pink" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#EC4899" />
                                <stop offset="100%" stopColor="#BE185D" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            )
        }
    ];

    const handleDismiss = async () => {
        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            // Call backend API to mark tutorial as seen
            await api.put('/users/me/seen-tutorial', { tutorialId: 'exam_category' }, config);

            // Update user object in local storage
            const currentSeen = user.seenTutorials || [];
            const updatedUser = { 
                ...user, 
                seenTutorials: currentSeen.includes('exam_category') 
                    ? currentSeen 
                    : [...currentSeen, 'exam_category'] 
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            onClose(updatedUser);
        } catch (err) {
            console.error('Failed to update tutorial status:', err);
            // Fallback: close the modal anyway with updated local state
            const currentSeen = user.seenTutorials || [];
            const updatedUser = { 
                ...user, 
                seenTutorials: currentSeen.includes('exam_category') 
                    ? currentSeen 
                    : [...currentSeen, 'exam_category'] 
            };
            onClose(updatedUser);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur & overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" />

            {/* Modal Card */}
            <div className="relative bg-white rounded-[32px] shadow-2xl max-w-sm w-full min-h-[500px] overflow-hidden border border-gray-100 transform transition-all duration-300 scale-100 flex flex-col p-6 items-center text-center justify-between">
                
                {/* Close Button on the Top Left */}
                <button
                    onClick={handleDismiss}
                    disabled={loading}
                    className="absolute top-5 left-5 w-7 h-7 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors cursor-pointer border-none shadow-md z-20 outline-none"
                    title="ข้ามคำแนะนำ"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>

                <div className="w-full flex-1 flex flex-col items-center justify-center my-auto space-y-6 pt-4">
                    {/* Step Illustration */}
                    <div className="w-full transition-all duration-300 transform scale-105">
                        {steps[currentStep].illustration}
                    </div>

                    {/* Step Text Contents */}
                    <div className="space-y-2 px-2">
                        <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">
                            {steps[currentStep].title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            {steps[currentStep].description}
                        </p>
                    </div>
                </div>

                {/* Footer Navigation Area */}
                <div className="w-full space-y-4 pt-4 mt-auto">
                    {/* Action Buttons */}
                    <div className="flex gap-3 w-full">
                        {currentStep > 0 ? (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 px-4 text-sm font-semibold rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition flex items-center justify-center gap-1 cursor-pointer outline-none"
                            >
                                <ChevronLeft size={16} /> ย้อนกลับ
                            </button>
                        ) : null}
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-grow flex-1 py-3 px-4 text-sm font-semibold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-1 cursor-pointer outline-none disabled:opacity-50"
                        >
                            {currentStep === steps.length - 1 ? (
                                <>เริ่มต้นใช้งาน <Check size={16} /></>
                            ) : (
                                <>ถัดไป <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>

                    {/* Dots indicator */}
                    <div className="flex justify-center items-center gap-2">
                        {steps.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`h-2.5 rounded-full transition-all duration-300 border-none outline-none ${
                                    currentStep === idx 
                                        ? 'bg-amber-400 w-5' 
                                        : 'bg-gray-200 hover:bg-gray-300 w-2.5'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryTutorialModal;
