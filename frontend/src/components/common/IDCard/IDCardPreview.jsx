import React from 'react';
import IDCardFront from './IDCardFront';
import IDCardBack from './IDCardBack';

const IDCardPreview = React.forwardRef(({ 
  student, 
  template, 
  schoolInfo, 
  side = 'both', // 'front', 'back', 'both'
  layout = 'row', // 'row', 'column', 'single'
  frontRef,
  backRef
}, ref) => {
  if (!student) return null;

  const renderFront = () => (
    <div id="front-card-inner" className="inline-block">
      <IDCardFront 
        ref={frontRef || (side === 'front' ? ref : undefined)}
        student={student} 
        template={template} 
        schoolInfo={schoolInfo} 
      />
    </div>
  );

  const renderBack = () => (
    <div id="back-card-inner" className="inline-block">
      <IDCardBack 
        ref={backRef || (side === 'back' ? ref : undefined)}
        student={student} 
        template={template} 
        schoolInfo={schoolInfo} 
      />
    </div>
  );

  if (side === 'front') {
    return renderFront();
  }

  if (side === 'back') {
    return renderBack();
  }

  return (
    <div className={`flex ${layout === 'row' ? 'flex-row flex-wrap justify-center gap-6' : 'flex-col gap-6'} items-center`}>
      {renderFront()}
      {renderBack()}
    </div>
  );
});

IDCardPreview.displayName = 'IDCardPreview';

export default IDCardPreview;
