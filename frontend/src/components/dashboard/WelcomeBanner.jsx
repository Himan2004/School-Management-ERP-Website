import React from 'react';

const WelcomeBanner = () => {
  return (
    <div className="bg-[#1956f5] rounded-xl p-6 md:p-8 text-white relative overflow-hidden flex shadow-md-soft h-[200px]">
      {/* Decorative vector shapes matching the design */}
      <div className="absolute right-0 top-0 w-full h-full opacity-100 pointer-events-none">
         {/* Using CSS to emulate the background graphic - a large darker blue curved wave on the right */}
         <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#0e44cc] rounded-full blur-2xl opacity-50"></div>
         <div className="absolute right-40 top-10 w-40 h-40 bg-[#3b71ff] rounded-full blur-xl opacity-50"></div>
      </div>
      
      <div className="relative z-10 max-w-2xl flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Good Morning Ms.Teena</h1>
        <p className="text-white/90 text-[15px] mb-5 font-medium">Have a Good day at work</p>
        
        <p className="text-white text-[13px] font-medium tracking-wide">
          Notice : There is a staff meeting at 9AM today, Dont forget to Attend!!!
        </p>
      </div>

      <div className="hidden lg:block absolute right-8 bottom-0 w-[280px] h-[180px]">
        {/* Placeholder for the cartoon teacher vector art matching the screenshot */}
        <img 
          src="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/argon-dashboard-pro/assets/img/illustrations/rocket-white.png" 
          alt="Illustration" 
          className="w-full h-full object-contain filter drop-shadow-md brightness-110 object-right-bottom translate-y-2 opacity-90 scale-[0.85] origin-bottom-right"
        />
      </div>
    </div>
  );
};

export default WelcomeBanner;
