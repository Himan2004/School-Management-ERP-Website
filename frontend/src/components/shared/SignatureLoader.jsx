import React from "react";
import { motion } from "framer-motion";
import logo from "../../assets/graphura icon background remove 7.svg";

const SignatureLoader = () => {
  // Animation variants for staggered text loading
  const textContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        repeat: Infinity,
        repeatType: "reverse",
        duration: 1.5,
      },
    },
  };

  const textLetter = {
    hidden: { opacity: 0.2, y: 2 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const loadingText = "INITIALIZING WORKSPACE".split("");

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full bg-[#223F74]/10 blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col items-center z-10">
        {/* Abstract Animated Core & Logo */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
          {/* Outer Orbiting Ring */}
          <motion.div
            className="absolute w-full h-full rounded-full border-t-2 border-r-2 border-[#223F74]/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Middle Counter-Orbiting Ring */}
          <motion.div
            className="absolute w-28 h-28 rounded-full border-b-2 border-l-2 border-[#ff7b5f]/40"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="absolute z-20 flex items-center justify-center drop-shadow-md w-24 h-24"
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={logo}
              alt="Graphura Logo"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </motion.div>
        </div>

        {/* Brand Text Wrapper */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-2xl font-black tracking-tight text-[#223F74]">
            Graphura<span className="text-[#ff7b5f]">.</span>
          </h2>

          {/* Staggered Typewriter Effect */}
          <motion.div
            variants={textContainer}
            initial="hidden"
            animate="show"
            className="flex mt-1"
          >
            {loadingText.map((letter, index) => (
              <motion.span
                key={index}
                variants={textLetter}
                className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase"
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignatureLoader;
