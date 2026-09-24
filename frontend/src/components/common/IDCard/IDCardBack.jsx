import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { parseStudentIdCardData } from './IDCardFront';

const IDCardBack = React.forwardRef(({ student, template, schoolInfo }, ref) => {
  if (!student) return null;

  const design = template?.designConfig || {
    backgroundColor: '#ffffff',
    primaryColor: '#223F74',
    secondaryColor: '#F59B87',
    textColor: '#1e293b'
  };

  const parsedData = parseStudentIdCardData(student);
  
  const schoolName = schoolInfo?.schoolName || schoolInfo?.name || 'Graphura Academy';
  const schoolLogoUrl = schoolInfo?.settings?.school?.logoUrl || schoolInfo?.logo || schoolInfo?.schoolLogo || '';
  const schoolContact = schoolInfo?.officialPhone || schoolInfo?.phone || schoolInfo?.schoolContact || 'N/A';
  const schoolEmail = schoolInfo?.officialEmail || schoolInfo?.email || schoolInfo?.schoolEmail || '';
  const schoolWebsite = schoolInfo?.website || schoolInfo?.schoolWebsite || '';
  const schoolAddress = schoolInfo?.address || schoolInfo?.schoolAddress || '';

  const dobVal = student.dateOfBirth || student.dob;
  const formattedDob = dobVal ? new Date(dobVal).toLocaleDateString() : 'N/A';
  
  const emergencyContact = student.parentMobile || student.parentPhone || parsedData.parentContact || schoolContact;

  return (
    <div ref={ref} className="p-4 bg-white select-none inline-block">
      <div 
        className="w-[340px] h-[220px] border border-slate-200 rounded-[20px] overflow-hidden flex flex-col font-sans relative shadow-xl print:shadow-none text-slate-800 text-left"
        style={{ backgroundColor: design.backgroundColor }}
      >
        {/* Top Strip */}
        <div 
          className="h-10 flex items-center justify-center px-4 border-b-2"
          style={{ backgroundColor: design.primaryColor, borderColor: design.secondaryColor }}
        >
          <h3 className="text-white font-extrabold text-[10px] uppercase tracking-wider truncate">
            {schoolName} — ID Card Details
          </h3>
        </div>

        {/* Back Content Details */}
        <div className="flex flex-1 p-3 gap-3 bg-gradient-to-b from-white to-slate-50 relative text-[8px] text-slate-700">
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Admission No</span>
              <span className="font-extrabold">{student.admissionNo || student.enrollmentNo || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Roll Number</span>
              <span className="font-extrabold">{student.rollNo || 'N/A'}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Date of Birth</span>
              <span className="font-extrabold">{formattedDob}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Blood Group</span>
              <span className="font-extrabold">{student.bloodGroup || 'N/A'}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Father Name</span>
              <span className="font-extrabold truncate max-w-[120px]">{parsedData.fatherName}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Parent Contact</span>
              <span className="font-extrabold">{parsedData.parentContact}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-0.5">
              <span className="text-slate-400 font-bold uppercase text-[6px]">Address</span>
              <span className="font-extrabold truncate max-w-[140px]">{student.address || 'N/A'}</span>
            </div>
          </div>

          {/* Right Column: QR Code & Valid info */}
          <div className="w-20 flex flex-col items-center justify-between flex-shrink-0 border-l border-slate-150 pl-2 py-1">
            <div className="bg-white p-1 rounded border border-slate-100 shadow-sm flex items-center justify-center">
              {(() => {
                const token = student.serialNumber || (student._id || student.id ? `STU-${(student._id || student.id).toString().substring(18).toUpperCase()}` : "N/A");
                const verifyUrl = `${window.location.origin}/verify/card/${token}`;
                return <QRCodeSVG value={verifyUrl} size={44} bgColor="transparent" />;
              })()}
            </div>
            <div className="text-center w-full">
              <p className="text-[5px] text-slate-400 font-bold uppercase">Valid Until</p>
              <p className="text-[7px] font-black text-slate-700 uppercase">Current Session</p>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div 
          className="p-1 px-3 text-center text-[7px] text-white flex flex-col items-center justify-center"
          style={{ backgroundColor: design.primaryColor }}
        >
          <p className="font-bold">If found, please return to: {schoolAddress || schoolName}</p>
          <p className="font-semibold text-[6px] text-white/90">Emergency: {emergencyContact} {schoolWebsite ? `| ${schoolWebsite}` : ''}</p>
        </div>
      </div>
    </div>
  );
});

IDCardBack.displayName = 'IDCardBack';

export default IDCardBack;
