import React from 'react';

// Supported Species
export const SPECIES = [
    { id: 'owl', name: 'นกฮูกนักปราชญ์' },
    { id: 'cat', name: 'แมวเหมียว' },
    { id: 'dog', name: 'เจ้าตูบ' },
];

// Color themes for the mascot
export const MASCOT_THEMES = {
    classic: {
        id: 'classic',
        name: 'คลาสสิก (สีน้ำตาล)',
        primary: '#8D6E63',
        secondary: '#6D4C41',
        belly: '#D7CCC8',
        beak: '#FFA726',
        feet: '#FB8C00',
        eyes: '#212121',
    },
    snow: {
        id: 'snow',
        name: 'หิมะ (สีขาว)',
        primary: '#ECEFF1',
        secondary: '#CFD8DC',
        belly: '#FFFFFF',
        beak: '#FFA726',
        feet: '#FFB74D',
        eyes: '#37474F',
    },
    violet: {
        id: 'violet',
        name: 'ม่วงเวทมนตร์ (สีม่วง)',
        primary: '#7E57C2',
        secondary: '#5E35B1',
        belly: '#D1C4E9',
        beak: '#FFD54F',
        feet: '#FFA000',
        eyes: '#1A237E',
    },
    gold: {
        id: 'gold',
        name: 'ทองคำนำโชค (สีทอง)',
        primary: '#FBC02D',
        secondary: '#F57F17',
        belly: '#FFF9C4',
        beak: '#E65100',
        feet: '#EF6C00',
        eyes: '#3E2723',
    },
    mint: {
        id: 'mint',
        name: 'มินต์สดใส (สีเขียวมินต์)',
        primary: '#26A69A',
        secondary: '#00897B',
        belly: '#B2DFDB',
        beak: '#FFA726',
        feet: '#FF9800',
        eyes: '#004D40',
    },
};

export const HATS = [
    { id: 'none', name: 'ไม่ใส่หมวก' },
    { id: 'grad_cap', name: 'หมวกบัณฑิต' },
    { id: 'wizard_hat', name: 'หมวกพ่อมด' },
    { id: 'headband', name: 'ผ้าคาดหัวสู้ตาย' },
    { id: 'cat_ears', name: 'หูแมว' },
    { id: 'crown', name: 'มงกุฎทอง' },
    { id: 'flower', name: 'ดอกไม้ประดับ' },
];

export const ACCESSORIES = [
    { id: 'none', name: 'ไม่ใส่เครื่องประดับ' },
    { id: 'glasses', name: 'แว่นเด็กเรียน' },
    { id: 'shades', name: 'แว่นกันแดด' },
    { id: 'blush', name: 'แก้มแดงน่ารัก' },
];

// Reusable SVG Hat Layer (pixel grid 24x24)
export const HatLayer = ({ hatId }) => {
    if (hatId === 'grad_cap') {
        return (
            <g transform="translate(0, -2)">
                <rect x="6" y="3" width="12" height="1" fill="#111827" />
                <rect x="8" y="2" width="8" height="1" fill="#1F2937" />
                <rect x="10" y="1" width="4" height="1" fill="#374151" />
                <rect x="9" y="4" width="6" height="2" fill="#111827" />
                <rect x="11" y="2" width="1" height="1" fill="#F59E0B" />
                <rect x="16" y="3" width="1" height="1" fill="#F59E0B" />
                <rect x="17" y="4" width="1" height="2" fill="#F59E0B" />
            </g>
        );
    }
    if (hatId === 'wizard_hat') {
        return (
            <g transform="translate(0, -3)">
                <rect x="5" y="6" width="14" height="1" fill="#4C1D95" />
                <rect x="7" y="4" width="10" height="2" fill="#6D28D9" />
                <rect x="9" y="2" width="6" height="2" fill="#7C3AED" />
                <rect x="11" y="0" width="3" height="2" fill="#8B5CF6" />
                <rect x="12" y="3" width="1" height="1" fill="#FDE047" />
            </g>
        );
    }
    if (hatId === 'headband') {
        return (
            <g transform="translate(0, 0)">
                <rect x="5" y="5" width="14" height="2" fill="#EF4444" />
                <rect x="11" y="5" width="2" height="2" fill="#FFFFFF" />
                <rect x="3" y="6" width="2" height="2" fill="#DC2626" />
                <rect x="2" y="7" width="1" height="3" fill="#DC2626" />
            </g>
        );
    }
    if (hatId === 'cat_ears') {
        return (
            <g transform="translate(0, -1)">
                <rect x="5" y="2" width="3" height="3" fill="#1F2937" />
                <rect x="6" y="3" width="1" height="2" fill="#F472B6" />
                <rect x="16" y="2" width="3" height="3" fill="#1F2937" />
                <rect x="17" y="3" width="1" height="2" fill="#F472B6" />
            </g>
        );
    }
    if (hatId === 'crown') {
        return (
            <g transform="translate(0, -2)">
                <rect x="7" y="5" width="10" height="1" fill="#CA8A04" />
                <rect x="7" y="3" width="2" height="2" fill="#EAB308" />
                <rect x="11" y="2" width="2" height="3" fill="#EAB308" />
                <rect x="15" y="3" width="2" height="2" fill="#EAB308" />
                <rect x="7" y="3" width="1" height="1" fill="#DC2626" />
                <rect x="11" y="2" width="1" height="1" fill="#2563EB" />
                <rect x="16" y="3" width="1" height="1" fill="#DC2626" />
            </g>
        );
    }
    if (hatId === 'flower') {
        return (
            <g transform="translate(14, 2)">
                <rect x="0" y="1" width="1" height="1" fill="#F472B6" />
                <rect x="2" y="1" width="1" height="1" fill="#F472B6" />
                <rect x="1" y="0" width="1" height="1" fill="#F472B6" />
                <rect x="1" y="2" width="1" height="1" fill="#F472B6" />
                <rect x="1" y="1" width="1" height="1" fill="#FBBF24" />
            </g>
        );
    }
    return null;
};

// Reusable SVG Face Accessory Layer
export const AccessoryLayer = ({ accessoryId }) => {
    if (accessoryId === 'glasses') {
        return (
            <g>
                <rect x="6" y="6" width="5" height="1" fill="#212121" />
                <rect x="6" y="10" width="5" height="1" fill="#212121" />
                <rect x="6" y="7" width="1" height="3" fill="#212121" />
                <rect x="10" y="7" width="1" height="3" fill="#212121" />
                <rect x="11" y="8" width="2" height="1" fill="#212121" />
                <rect x="13" y="6" width="5" height="1" fill="#212121" />
                <rect x="13" y="10" width="5" height="1" fill="#212121" />
                <rect x="13" y="7" width="1" height="3" fill="#212121" />
                <rect x="17" y="7" width="1" height="3" fill="#212121" />
            </g>
        );
    }
    if (accessoryId === 'shades') {
        return (
            <g>
                <rect x="5" y="7" width="14" height="1" fill="#111827" />
                <rect x="6" y="8" width="5" height="3" fill="#1F2937" />
                <rect x="13" y="8" width="5" height="3" fill="#1F2937" />
                <rect x="7" y="9" width="3" height="1" fill="#60A5FA" opacity="0.6" />
                <rect x="14" y="9" width="3" height="1" fill="#60A5FA" opacity="0.6" />
            </g>
        );
    }
    if (accessoryId === 'blush') {
        return (
            <g>
                <rect x="5" y="10" width="2" height="1" fill="#F472B6" />
                <rect x="17" y="10" width="2" height="1" fill="#F472B6" />
            </g>
        );
    }
    return null;
};

// Situational effects (Shocked sweat, Sleeping Zzz, Celebration Confetti)
export const SituationalEffects = ({ expression }) => {
    if (expression === 'shocked') {
        return (
            <g>
                <rect x="2" y="4" width="2" height="3" fill="#38BDF8" />
                <rect x="2" y="7" width="1" height="2" fill="#0284C7" />
                <rect x="20" y="4" width="2" height="2" fill="#38BDF8" />
            </g>
        );
    }
    if (expression === 'sleep') {
        return (
            <g opacity="0.85">
                <g transform="translate(18, 5)">
                    <rect x="0" y="0" width="3" height="1" fill="#818CF8" />
                    <rect x="1" y="1" width="1" height="1" fill="#818CF8" />
                    <rect x="0" y="2" width="3" height="1" fill="#818CF8" />
                </g>
                <g transform="translate(20, 1)">
                    <rect x="0" y="0" width="2" height="1" fill="#A5B4FC" />
                    <rect x="0" y="1" width="2" height="1" fill="#A5B4FC" />
                </g>
            </g>
        );
    }
    if (expression === 'celebrate') {
        return (
            <g>
                <rect x="2" y="2" width="1" height="1" fill="#F43F5E" />
                <rect x="4" y="1" width="1" height="2" fill="#EAB308" />
                <rect x="20" y="2" width="2" height="1" fill="#10B981" />
                <rect x="22" y="4" width="1" height="1" fill="#6366F1" />
                <rect x="1" y="13" width="1" height="1" fill="#06B6D4" />
                <rect x="22" y="14" width="1" height="2" fill="#EC4899" />
            </g>
        );
    }
    return null;
};

// 1. Pixel Owl Character
export const PixelOwl = ({
    themeId = 'classic',
    hatId = 'none',
    accessoryId = 'none',
    expression = 'idle',
    walkFrame = 0,
    size = 72,
    className = '',
}) => {
    const theme = MASCOT_THEMES[themeId] || MASCOT_THEMES.classic;
    const isSleeping = expression === 'sleep';
    const isShocked = expression === 'shocked';
    const isCelebrate = expression === 'celebrate';
    const isTalking = expression === 'talk';
    const isBlinking = expression === 'blink';
    const isThinking = expression === 'thinking';

    const bodyY = walkFrame === 1 ? -1 : 0;
    const wingY = walkFrame === 1 ? -2 : 0;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
        >
            {/* Feet */}
            {!isSleeping ? (
                <>
                    <rect x={walkFrame === 1 ? "7" : "6"} y="21" width="3" height="2" fill={theme.feet} />
                    <rect x={walkFrame === 1 ? "14" : "15"} y={walkFrame === 1 ? "20" : "21"} width="3" height="2" fill={theme.feet} />
                </>
            ) : (
                <>
                    <rect x="6" y="21" width="4" height="2" fill={theme.feet} />
                    <rect x="14" y="21" width="4" height="2" fill={theme.feet} />
                </>
            )}

            {/* Body */}
            <g transform={`translate(0, ${bodyY})`}>
                <rect x="5" y="7" width="14" height="14" fill={theme.secondary} />
                <rect x="6" y="6" width="12" height="15" fill={theme.primary} />
                <rect x="7" y="5" width="10" height="1" fill={theme.primary} />

                {/* Ear Tufts */}
                <rect x="5" y="4" width="2" height="3" fill={theme.secondary} />
                <rect x="17" y="4" width="2" height="3" fill={theme.secondary} />
                <rect x="6" y="3" width="1" height="2" fill={theme.primary} />
                <rect x="17" y="3" width="1" height="2" fill={theme.primary} />

                {/* Belly patch */}
                <rect x="8" y="12" width="8" height="8" fill={theme.belly} />
                <rect x="9" y="11" width="6" height="1" fill={theme.belly} />
                <rect x="10" y="13" width="1" height="1" fill={theme.secondary} />
                <rect x="13" y="13" width="1" height="1" fill={theme.secondary} />
                <rect x="11" y="15" width="2" height="1" fill={theme.secondary} />

                {/* Wings */}
                {isCelebrate ? (
                    <>
                        <rect x="3" y="6" width="3" height="5" fill={theme.secondary} />
                        <rect x="4" y="5" width="2" height="2" fill={theme.primary} />
                        <rect x="18" y="6" width="3" height="5" fill={theme.secondary} />
                        <rect x="18" y="5" width="2" height="2" fill={theme.primary} />
                    </>
                ) : (
                    <>
                        <rect x="4" y={10 + wingY} width="2" height="8" fill={theme.secondary} />
                        <rect x="18" y={10 + wingY} width="2" height="8" fill={theme.secondary} />
                    </>
                )}

                {/* Eyes */}
                {isSleeping || isBlinking ? (
                    <>
                        <rect x="7" y="9" width="3" height="1" fill={theme.eyes} />
                        <rect x="14" y="9" width="3" height="1" fill={theme.eyes} />
                    </>
                ) : isShocked ? (
                    <>
                        <rect x="6" y="7" width="4" height="4" fill="#FFFFFF" />
                        <rect x="14" y="7" width="4" height="4" fill="#FFFFFF" />
                        <rect x="8" y="8" width="1" height="2" fill="#D32F2F" />
                        <rect x="15" y="8" width="1" height="2" fill="#D32F2F" />
                    </>
                ) : isThinking ? (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="9" y="7" width="1" height="2" fill={theme.eyes} />
                        <rect x="16" y="7" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : isCelebrate ? (
                    <>
                        <rect x="7" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="6" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="10" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="14" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="13" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="17" y="8" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="8" y="8" width="2" height="2" fill={theme.eyes} />
                        <rect x="14" y="8" width="2" height="2" fill={theme.eyes} />
                        <rect x="8" y="8" width="1" height="1" fill="#FFFFFF" />
                        <rect x="14" y="8" width="1" height="1" fill="#FFFFFF" />
                    </>
                )}

                {/* Beak */}
                <rect x="11" y="9" width="2" height="2" fill={theme.beak} />
                <rect x="11" y="11" width="2" height="1" fill="#E65100" />
                {isTalking && <rect x="11" y="10" width="2" height="2" fill="#C62828" />}

                {/* Accessories */}
                <AccessoryLayer accessoryId={accessoryId} />
                <HatLayer hatId={hatId} />
            </g>

            {/* Effects */}
            <SituationalEffects expression={expression} />
        </svg>
    );
};

// 2. Pixel Cat Character
export const PixelCat = ({
    themeId = 'classic',
    hatId = 'none',
    accessoryId = 'none',
    expression = 'idle',
    walkFrame = 0,
    size = 72,
    className = '',
}) => {
    const theme = MASCOT_THEMES[themeId] || MASCOT_THEMES.classic;
    const isSleeping = expression === 'sleep';
    const isShocked = expression === 'shocked';
    const isCelebrate = expression === 'celebrate';
    const isTalking = expression === 'talk';
    const isBlinking = expression === 'blink';
    const isThinking = expression === 'thinking';

    const bodyY = walkFrame === 1 ? -1 : 0;
    const tailY = walkFrame === 1 ? -1 : 0;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
        >
            {/* Paws */}
            {!isSleeping ? (
                <>
                    <rect x={walkFrame === 1 ? "7" : "6"} y="21" width="3" height="2" fill={theme.feet} />
                    <rect x={walkFrame === 1 ? "14" : "15"} y={walkFrame === 1 ? "20" : "21"} width="3" height="2" fill={theme.feet} />
                </>
            ) : (
                <>
                    <rect x="6" y="21" width="4" height="2" fill={theme.feet} />
                    <rect x="14" y="21" width="4" height="2" fill={theme.feet} />
                </>
            )}

            {/* Tail */}
            <g transform={`translate(0, ${tailY})`}>
                <rect x="2" y="14" width="2" height="4" fill={theme.secondary} />
                <rect x="3" y="12" width="2" height="3" fill={theme.secondary} />
                <rect x="4" y="11" width="2" height="2" fill={theme.primary} />
            </g>

            {/* Cat Body */}
            <g transform={`translate(0, ${bodyY})`}>
                <rect x="5" y="7" width="14" height="14" fill={theme.secondary} />
                <rect x="6" y="6" width="12" height="15" fill={theme.primary} />

                {/* Pointy Cat Ears */}
                <rect x="5" y="3" width="3" height="3" fill={theme.secondary} />
                <rect x="6" y="4" width="1" height="2" fill="#F472B6" />
                <rect x="16" y="3" width="3" height="3" fill={theme.secondary} />
                <rect x="17" y="4" width="1" height="2" fill="#F472B6" />

                {/* White / Belly chest patch */}
                <rect x="8" y="13" width="8" height="7" fill={theme.belly} />
                <rect x="9" y="12" width="6" height="1" fill={theme.belly} />

                {/* Whiskers */}
                <rect x="4" y="10" width="2" height="1" fill={theme.secondary} />
                <rect x="4" y="12" width="2" height="1" fill={theme.secondary} />
                <rect x="18" y="10" width="2" height="1" fill={theme.secondary} />
                <rect x="18" y="12" width="2" height="1" fill={theme.secondary} />

                {/* Cat Eyes */}
                {isSleeping || isBlinking ? (
                    <>
                        <rect x="7" y="9" width="3" height="1" fill={theme.eyes} />
                        <rect x="14" y="9" width="3" height="1" fill={theme.eyes} />
                    </>
                ) : isShocked ? (
                    <>
                        <rect x="6" y="7" width="4" height="4" fill="#FFFFFF" />
                        <rect x="14" y="7" width="4" height="4" fill="#FFFFFF" />
                        <rect x="8" y="8" width="1" height="2" fill="#0284C7" />
                        <rect x="15" y="8" width="1" height="2" fill="#0284C7" />
                    </>
                ) : isThinking ? (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="9" y="7" width="1" height="2" fill={theme.eyes} />
                        <rect x="16" y="7" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : isCelebrate ? (
                    <>
                        <rect x="7" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="6" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="10" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="14" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="13" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="17" y="8" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="8" y="7" width="1" height="3" fill={theme.eyes} />
                        <rect x="15" y="7" width="1" height="3" fill={theme.eyes} />
                        <rect x="8" y="7" width="1" height="1" fill="#FFFFFF" />
                        <rect x="15" y="7" width="1" height="1" fill="#FFFFFF" />
                    </>
                )}

                {/* Cat Nose & Mouth */}
                <rect x="11" y="10" width="2" height="1" fill="#F472B6" />
                <rect x="11" y="11" width="1" height="1" fill={theme.secondary} />
                <rect x="12" y="11" width="1" height="1" fill={theme.secondary} />
                {isTalking && <rect x="11" y="11" width="2" height="2" fill="#C62828" />}

                {/* Accessories */}
                <AccessoryLayer accessoryId={accessoryId} />
                <HatLayer hatId={hatId} />
            </g>

            {/* Effects */}
            <SituationalEffects expression={expression} />
        </svg>
    );
};

// 3. Pixel Dog Character
export const PixelDog = ({
    themeId = 'classic',
    hatId = 'none',
    accessoryId = 'none',
    expression = 'idle',
    walkFrame = 0,
    size = 72,
    className = '',
}) => {
    const theme = MASCOT_THEMES[themeId] || MASCOT_THEMES.classic;
    const isSleeping = expression === 'sleep';
    const isShocked = expression === 'shocked';
    const isCelebrate = expression === 'celebrate';
    const isTalking = expression === 'talk';
    const isBlinking = expression === 'blink';
    const isThinking = expression === 'thinking';

    const bodyY = walkFrame === 1 ? -1 : 0;
    const earWiggle = walkFrame === 1 ? 1 : 0;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
        >
            {/* Paws */}
            {!isSleeping ? (
                <>
                    <rect x={walkFrame === 1 ? "7" : "6"} y="21" width="3" height="2" fill={theme.feet} />
                    <rect x={walkFrame === 1 ? "14" : "15"} y={walkFrame === 1 ? "20" : "21"} width="3" height="2" fill={theme.feet} />
                </>
            ) : (
                <>
                    <rect x="6" y="21" width="4" height="2" fill={theme.feet} />
                    <rect x="14" y="21" width="4" height="2" fill={theme.feet} />
                </>
            )}

            {/* Wagging Tail */}
            <rect x="2" y={walkFrame === 1 ? "14" : "15"} width="3" height="2" fill={theme.secondary} />
            <rect x="1" y={walkFrame === 1 ? "12" : "14"} width="2" height="2" fill={theme.primary} />

            {/* Dog Body */}
            <g transform={`translate(0, ${bodyY})`}>
                <rect x="5" y="7" width="14" height="14" fill={theme.secondary} />
                <rect x="6" y="6" width="12" height="15" fill={theme.primary} />

                {/* Floppy Dog Ears on sides */}
                <rect x="4" y={5 + earWiggle} width="2" height="6" fill={theme.secondary} />
                <rect x="18" y={5 + earWiggle} width="2" height="6" fill={theme.secondary} />

                {/* Belly / Chest */}
                <rect x="8" y="13" width="8" height="7" fill={theme.belly} />
                <rect x="9" y="12" width="6" height="1" fill={theme.belly} />

                {/* Dog Snout patch */}
                <rect x="9" y="9" width="6" height="4" fill={theme.belly} />

                {/* Dog Eyes */}
                {isSleeping || isBlinking ? (
                    <>
                        <rect x="7" y="8" width="3" height="1" fill={theme.eyes} />
                        <rect x="14" y="8" width="3" height="1" fill={theme.eyes} />
                    </>
                ) : isShocked ? (
                    <>
                        <rect x="6" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="15" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="7" y="8" width="1" height="1" fill="#D32F2F" />
                        <rect x="16" y="8" width="1" height="1" fill="#D32F2F" />
                    </>
                ) : isThinking ? (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="9" y="7" width="1" height="2" fill={theme.eyes} />
                        <rect x="16" y="7" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : isCelebrate ? (
                    <>
                        <rect x="7" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="6" y="8" width="1" height="2" fill={theme.eyes} />
                        <rect x="14" y="7" width="3" height="1" fill={theme.eyes} />
                        <rect x="17" y="8" width="1" height="2" fill={theme.eyes} />
                    </>
                ) : (
                    <>
                        <rect x="7" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="14" y="7" width="3" height="3" fill="#FFFFFF" />
                        <rect x="8" y="7" width="2" height="2" fill={theme.eyes} />
                        <rect x="14" y="7" width="2" height="2" fill={theme.eyes} />
                        <rect x="8" y="7" width="1" height="1" fill="#FFFFFF" />
                        <rect x="14" y="7" width="1" height="1" fill="#FFFFFF" />
                    </>
                )}

                {/* Big Dog Nose */}
                <rect x="11" y="9" width="2" height="2" fill="#1F2937" />

                {/* Dog Mouth & Tongue */}
                {isCelebrate || isTalking ? (
                    // Tongue sticking out!
                    <>
                        <rect x="11" y="11" width="2" height="1" fill="#DC2626" />
                        <rect x="11" y="12" width="2" height="2" fill="#F472B6" />
                    </>
                ) : (
                    <rect x="11" y="11" width="2" height="1" fill={theme.secondary} />
                )}

                {/* Accessories */}
                <AccessoryLayer accessoryId={accessoryId} />
                <HatLayer hatId={hatId} />
            </g>

            {/* Effects */}
            <SituationalEffects expression={expression} />
        </svg>
    );
};

// Master Sprite Component that renders the selected species
export const PixelMascotSprite = ({
    species = 'owl',
    themeId = 'classic',
    hatId = 'none',
    accessoryId = 'none',
    expression = 'idle',
    walkFrame = 0,
    size = 72,
    className = '',
}) => {
    if (species === 'cat') {
        return (
            <PixelCat
                themeId={themeId}
                hatId={hatId}
                accessoryId={accessoryId}
                expression={expression}
                walkFrame={walkFrame}
                size={size}
                className={className}
            />
        );
    }
    if (species === 'dog') {
        return (
            <PixelDog
                themeId={themeId}
                hatId={hatId}
                accessoryId={accessoryId}
                expression={expression}
                walkFrame={walkFrame}
                size={size}
                className={className}
            />
        );
    }
    return (
        <PixelOwl
            themeId={themeId}
            hatId={hatId}
            accessoryId={accessoryId}
            expression={expression}
            walkFrame={walkFrame}
            size={size}
            className={className}
        />
    );
};

export default PixelMascotSprite;
