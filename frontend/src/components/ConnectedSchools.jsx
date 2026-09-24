import { useEffect, useRef } from "react";

/* ================= LOGOS ================= */
const colors = [
    "#1E40AF", "#059669", "#DC2626", "#7C3AED",
    "#EA580C", "#0891B2", "#BE123C", "#4F46E5"
];

const getColor = (i) => colors[i % colors.length];

// Circle Logo
const CircleLogo = ({ letter, index }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill={getColor(index)} opacity="0.15" />
        <text x="50" y="60" textAnchor="middle" fontSize="36" fontWeight="bold" fill={getColor(index)}>
            {letter}
        </text>
    </svg>
);

// Square Logo
const SquareLogo = ({ letter, index }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="10" y="10" width="80" height="80" rx="20" fill={getColor(index)} opacity="0.15" />
        <text x="50" y="60" textAnchor="middle" fontSize="34" fontWeight="bold" fill={getColor(index)}>
            {letter}
        </text>
    </svg>
);

// Triangle Logo
const TriangleLogo = ({ letter, index }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,10 90,85 10,85" fill={getColor(index)} opacity="0.15" />
        <text x="50" y="65" textAnchor="middle" fontSize="30" fontWeight="bold" fill={getColor(index)}>
            {letter}
        </text>
    </svg>
);

// Diamond Logo
const DiamondLogo = ({ letter, index }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,5 95,50 50,95 5,50" fill={getColor(index)} opacity="0.15" />
        <text x="50" y="60" textAnchor="middle" fontSize="32" fontWeight="bold" fill={getColor(index)}>
            {letter}
        </text>
    </svg>
);
const KMSLogo = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path fill="#0C4A34" d="M10,80 L50,60 L90,80 L50,100 Z" opacity="0.1" />
        <path fill="#FBBF24" d="M48,10 L52,10 L55,35 L45,35 Z" />
        <rect x="49" y="35" width="2" height="15" fill="#0C4A34" />
        <path fill="none" stroke="#0C4A34" strokeWidth="2" d="M30,35 Q50,45 70,35 M20,45 Q50,55 80,45 M10,55 Q50,65 90,55" />
        <text x="50" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0C4A34">KMS</text>
    </svg>
);

const AspenLogo = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1E40AF" strokeWidth="4" strokeDasharray="6 4" />
        <text x="50" y="62" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#1E40AF">A</text>
        <path fill="#166534" d="M50,20 L58,35 L42,35 Z M45,35 L55,35 L55,45 L45,45 Z" />
        <circle cx="35" cy="75" r="5" fill="#1E40AF" />
        <circle cx="65" cy="75" r="5" fill="#1E40AF" />
    </svg>
);

const LaurelLogo = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path fill="#881337" d="M50,10 L90,30 L90,70 L50,90 L10,70 L10,30 Z" />
        <text x="50" y="60" textAnchor="middle" fontSize="36" fontWeight="bold" fill="white">Lv</text>
        <path fill="none" stroke="#881337" strokeWidth="3" d="M20,15 Q30,50 20,85 M80,15 Q70,50 80,85" opacity="0.5" />
    </svg>
);

const LocationPin = () => (
    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
        />
    </svg>
);

/* ================= DATA ================= */

const schoolData = [
    {
        logo: <KMSLogo />,
        name: "KINGSBRIDGE MODERN SCHOOL",
        address: ["1240 Oakwood Avenue,", "Maplewood, NJ 07040"],
    },
    {
        logo: <AspenLogo />,
        name: "ASPEN ACADEMY",
        address: ["450 Alpine Drive,", "Boulder, CO 80302"],
    },
    {
        logo: <LaurelLogo />,
        name: "LAUREL VALLEY HIGH SCHOOL",
        address: ["88 Riverside Road,", "Portland, OR 97201"],
    },
    {
        logo: <CircleLogo />,
        name: "LAUREL VALLEY HIGH SCHOOL",
        address: ["88 Riverside Road,", "Portland, OR 97201"],
    },
    {
        logo: <SquareLogo />,
        name: "LAUREL VALLEY HIGH SCHOOL",
        address: ["88 Riverside Road,", "Portland, OR 97201"],
    },
    {
        logo: <TriangleLogo />,
        name: "LAUREL VALLEY HIGH SCHOOL",
        address: ["88 Riverside Road,", "Portland, OR 97201"],
    },
    {
        logo: <DiamondLogo />,
        name: "LAUREL VALLEY HIGH SCHOOL",
        address: ["88 Riverside Road,", "Portland, OR 97201"],
    },
    // add more...
];

/* ================= COMPONENT ================= */

export default function ConnectedSchools() {
    const trackRef = useRef(null);

    const loopData = [...schoolData, ...schoolData];

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const totalWidth = track.scrollWidth / 2;
        const speed = 60;

        const duration = totalWidth / speed;

        track.style.setProperty("--scroll-distance", `${totalWidth}px`);
        track.style.animationDuration = `${duration}s`;
    }, []);

    return (
        <section className="py-24  overflow-hidden w-full font-sans">

            <div className="max-w-7xl mx-auto px-6 text-center mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-600 to-sky-600 bg-clip-text text-transparent leading-tight">
                    Connected School Network
                </h2>
                <p className="mt-2 text-slate-600 text-lg">
                    Trusted by 100+ institutions worldwide
                </p>
            </div>

            <div className="relative w-full">

                <div className="absolute left-0 top-0 h-full w-40 bg-gradient-to-r from-slate-50 to-transparent z-10" />
                <div className="absolute right-0 top-0 h-full w-40 bg-gradient-to-l from-slate-50 to-transparent z-10" />

                <div
                    ref={trackRef}
                    className="flex animate-scroll hover:[animation-play-state:paused]"
                >
                    {loopData.map((school, index) => (
                        <div key={index} className="flex-shrink-0 mx-6 group cursor-pointer">

                            <div className="w-[280px] h-[380px]  rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-3 flex flex-col overflow-hidden">

                                {/* TOP: Logo Section */}
                                <div className="h-[45%] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
                                    <div className="w-36 h-36 transition-transform duration-300 group-hover:scale-110">
                                        {school.logo}
                                    </div>
                                </div>

                                {/* MIDDLE: School Name */}
                                <div className="px-6 py-5 text-center">
                                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                                        {school.name}
                                    </h3>
                                </div>

                                {/* Spacer (important for alignment) */}
                                <div className="flex-grow" />

                                {/* BOTTOM: Location */}
                                <div className="border-t border-slate-100 px-6 py-5 flex items-start gap-3">

                                    <div className="text-blue-500 mt-1">
                                        <LocationPin />
                                    </div>

                                    <div className="text-sm text-slate-500 leading-relaxed">
                                        <p>{school.address[0]}</p>
                                        <p>{school.address[1]}</p>
                                    </div>

                                </div>

                            </div>

                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-1 * var(--scroll-distance)));
          }
        }

        .animate-scroll {
          display: flex;
          width: fit-content;
          animation-name: scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
        </section>
    );
}