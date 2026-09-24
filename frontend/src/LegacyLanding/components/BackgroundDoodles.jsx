import React, { memo } from 'react';
import { Atom, FlaskConical, Compass, Dna, Infinity as InfinityIcon, Telescope, Brain, Microscope, Calculator, Globe2, Shapes, Binary } from 'lucide-react';
import './BackgroundDoodles.css';

const BackgroundDoodles = memo(function BackgroundDoodles() {
  return (
    <div className="bg-doodles-container">
      {/* 1. Atom (Physics/Science) */}
      <div className="doodle-item doodle-atom">
        <Atom size={240} />
      </div>

      {/* 2. FlaskConical (Chemistry) */}
      <div className="doodle-item doodle-flask">
        <FlaskConical size={200} />
      </div>

      {/* 3. Compass (Math/Geometry) */}
      <div className="doodle-item doodle-compass">
        <Compass size={220} />
      </div>

      {/* 4. Dna (Biology/Science) */}
      <div className="doodle-item doodle-dna">
        <Dna size={250} />
      </div>

      {/* 5. Infinity (Mathematics) */}
      <div className="doodle-item doodle-infinity">
        <InfinityIcon size={180} />
      </div>

      {/* 6. Telescope (Astronomy) */}
      <div className="doodle-item doodle-telescope">
        <Telescope size={220} />
      </div>

      {/* 7. Brain (Cognitive Science) */}
      <div className="doodle-item doodle-brain">
        <Brain size={210} />
      </div>

      {/* 8. Microscope (Biology/Chemistry) */}
      <div className="doodle-item doodle-microscope">
        <Microscope size={230} />
      </div>

      {/* 9. Calculator (Math) */}
      <div className="doodle-item doodle-calc">
        <Calculator size={190} />
      </div>

      {/* 10. Globe (Geography/Science) */}
      <div className="doodle-item doodle-globe">
        <Globe2 size={240} />
      </div>

      {/* 11. Shapes (Geometry) */}
      <div className="doodle-item doodle-shapes">
        <Shapes size={200} />
      </div>

      {/* 12. Binary (Computer Science) */}
      <div className="doodle-item doodle-binary">
        <Binary size={220} />
      </div>
    </div>
  );
});

export default BackgroundDoodles;
