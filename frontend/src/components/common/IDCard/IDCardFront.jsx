import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const parseStudentIdCardData = (student) => {
  if (!student) {
    return {
      classNumber: "",
      sectionName: "",
      classSecDisplay: "N/A",
      fatherName: "N/A",
      parentContact: "N/A"
    };
  }

  const rawClassName = student.className || 
                       (typeof student.class === 'object' ? student.class?.name : student.class) || 
                       "";
  const classNumber = String(rawClassName).replace(/class/i, "").trim();

  const sectionName =
    student.sectionName ||
    (typeof student.section === 'object' ? (student.section?.name || student.section?.sectionName) : student.section) ||
    student.sectionDetails?.name ||
    student.sectionDetails?.sectionName ||
    "";

  const fatherName =
    student.fatherName ||
    student.parentName ||
    student.guardianName ||
    student.parent?.fatherName ||
    student.parent?.fullName ||
    student.parent?.name ||
    student.parent?.user?.name ||
    student.parentDetails?.fatherName ||
    student.parentDetails?.fullName ||
    student.parentDetails?.name ||
    student.guardian?.name ||
    "N/A";

  const parentContact =
    student.parentPhone ||
    student.parentMobile ||
    student.fatherMobile ||
    student.fatherPhone ||
    student.guardianPhone ||
    student.guardianMobile ||
    student.parent?.phone ||
    student.parent?.mobile ||
    student.parent?.primaryContact ||
    student.parent?.alternateContact ||
    student.parent?.user?.phone ||
    student.parentDetails?.phone ||
    student.parentDetails?.primaryContact ||
    student.parentContact ||
    student.phone ||
    student.contact ||
    student.emergencyContact ||
    "N/A";

  const classSecDisplay = sectionName ? `${classNumber} - ${sectionName}` : classNumber || "N/A";

  return {
    classNumber,
    sectionName,
    classSecDisplay,
    fatherName,
    parentContact
  };
};

export const getDisplayCardStatus = (status) => {
  const s = status || 'Pending';
  if (s === 'Printed' || s === 'Distributed' || s === 'Active') {
    return 'Active';
  }
  return 'Pending';
};

const IDCardFront = React.forwardRef(({ student, template, schoolInfo }, ref) => {
  if (!student) return null;

  const design = template?.designConfig || {
    backgroundColor: '#ffffff',
    primaryColor: '#223F74',
    secondaryColor: '#F59B87',
    textColor: '#1e293b'
  };

  const visibleFields = (template?.visibleFields || [
    { field: 'name', label: 'Proper Name', isEnabled: true },
    { field: 'parentName', label: 'Father/Mother Name', isEnabled: true },
    { field: 'studentId', label: 'Student ID', isEnabled: true },
    { field: 'rollNo', label: 'Roll No', isEnabled: true },
    { field: 'class', label: 'Class / Sec', isEnabled: true },
    { field: 'bloodGroup', label: 'Blood Group', isEnabled: true },
    { field: 'contact', label: 'Emergency Contact', isEnabled: true }
  ]).map(f => {
    if (f.field === 'contact') return { ...f, label: 'Parent Contact' };
    if (f.field === 'name') return { ...f, label: 'Student Name' };
    return f;
  });

  const schoolLogoUrl = schoolInfo?.settings?.school?.logoUrl || schoolInfo?.logo || schoolInfo?.schoolLogo || '';
  const schoolName = schoolInfo?.schoolName || schoolInfo?.name || 'Graphura Academy';
  const tagline = schoolInfo?.settings?.school?.tagline || 'Official Identity Card';

  const photoUrl = student.photo || student.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || student.user?.name || 'S')}&background=${design.primaryColor.replace('#', '')}&color=fff`;

  const displayStatus = student.idCardStatus || student.status || 'Pending';

  return (
    <div ref={ref} className="p-4 bg-white select-none inline-block">
      <div 
        className="w-[340px] h-[220px] border border-slate-200 rounded-[20px] overflow-hidden flex flex-col font-sans relative shadow-xl print:shadow-none text-slate-800 text-left"
        style={{ backgroundColor: design.backgroundColor }}
      >
        {/* Header Section */}
        <div 
          className="h-12 flex items-center px-4 gap-3 border-b-2"
          style={{ backgroundColor: design.primaryColor, borderColor: design.secondaryColor }}
        >
          {schoolLogoUrl ? (
            <img 
              src={schoolLogoUrl} 
              className="w-8 h-8 object-contain bg-white rounded-lg p-0.5 shadow-sm flex-shrink-0" 
              alt="Logo" 
            />
          ) : (
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black shadow-sm text-[10px] uppercase flex-shrink-0" style={{ color: design.primaryColor }}>
              {schoolName ? schoolName.substring(0, 2) : 'SCH'}
            </div>
          )}
          <div className="text-left flex-1 min-w-0">
            <h1 className="text-white font-extrabold text-[11px] leading-tight tracking-wider uppercase truncate">
              {schoolName}
            </h1>
            <p className="text-[6px] text-white/80 font-bold uppercase tracking-widest leading-none mt-0.5 truncate">
              {tagline}
            </p>
          </div>
          {/* Status badge in header */}
          <div className="flex-shrink-0">
            <span className="text-[6px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/25">
              {displayStatus}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 p-3 gap-3 bg-gradient-to-b from-white to-slate-50 relative">
          {/* Left Column: Photo */}
          <div className="flex flex-col items-center w-24 justify-center flex-shrink-0">
            <div 
              style={{ width: "90px", height: "120px" }}
              className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white p-0 flex-shrink-0"
            >
              <img 
                src={photoUrl} 
                alt="Student"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center"
                }}
                className="rounded-xl"
              />
            </div>
            <div className="mt-1.5 w-full text-center py-0.5 rounded-lg shadow-sm" style={{ backgroundColor: design.primaryColor }}>
              <p className="text-[8px] font-black text-white uppercase tracking-wider leading-none">Student</p>
            </div>
          </div>
          
          {/* Right Column: Data */}
          <div className="flex-1 text-left flex flex-col justify-between py-0.5 min-w-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {(() => {
                const parsedData = parseStudentIdCardData(student);
                return Array.isArray(visibleFields) && visibleFields.filter(f => f && f.isEnabled).map((f, idx) => {
                  let value = "";
                  if (f.field === 'name') value = student.name || student.user?.name;
                  else if (f.field === 'parentName') value = parsedData.fatherName;
                  else if (f.field === 'studentId') value = student.admissionNo || student.enrollmentNo || student.rollNo;
                  else if (f.field === 'rollNo') value = student.rollNo;
                  else if (f.field === 'class') value = parsedData.classSecDisplay;
                  else if (f.field === 'bloodGroup') value = student.bloodGroup;
                  else if (f.field === 'contact') value = parsedData.parentContact;
                  
                  const isName = f.field === 'name';
                  return (
                    <div key={idx} className={isName ? "col-span-2" : "col-span-1"}>
                      <p className="text-[5px] text-slate-400 uppercase font-bold leading-none">{f.label}</p>
                      <p className="text-[8px] font-black text-slate-700 leading-tight uppercase truncate" style={isName ? { color: design.primaryColor, fontSize: '9px' } : {}}>
                        {value || '—'}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex items-end justify-between border-t border-slate-100 pt-1.5 mt-1">
              <div className="text-[5px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="w-16 h-[1px] border-t border-dashed border-slate-300 mb-1"></div>
                <p>Authorized Sign</p>
              </div>
              <div className="bg-white p-0.5 rounded border border-slate-100 shadow-sm flex items-center justify-center">
                {(() => {
                  const token = student.serialNumber || (student._id || student.id ? `STU-${(student._id || student.id).toString().substring(18).toUpperCase()}` : "N/A");
                  const verifyUrl = `${window.location.origin}/verify/card/${token}`;
                  return <QRCodeSVG value={verifyUrl} size={22} bgColor="transparent" />;
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Accent Footer line */}
        <div className="h-1 w-full" style={{ backgroundColor: design.primaryColor }} />
      </div>
    </div>
  );
});

IDCardFront.displayName = 'IDCardFront';

export default IDCardFront;
