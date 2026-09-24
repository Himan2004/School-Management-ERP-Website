import User from "../models/users/user.model.js";

export const generateCredentials = (schoolName) => {
  const prefix = schoolName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const loginId = `${prefix}${suffix}`;

  // e.g. School@784231
  const plainPassword = `School@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateStudentCredentials = (fullName, schoolName) => {
  const schoolPrefix = schoolName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 4)
    .padEnd(3, 'X');

  const namePart = fullName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 3)
    .padEnd(2, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const loginId = `STU-${schoolPrefix}${namePart}${suffix}`;
  const plainPassword = `Student@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateParentCredentials = (fullName, schoolName) => {
  const schoolPrefix = schoolName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 4)
    .padEnd(3, 'X');

  const namePart = fullName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 3)
    .padEnd(2, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const loginId = `PAR-${schoolPrefix}${namePart}${suffix}`;
  const plainPassword = `Parent@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateAdminCredentials = (adminName) => {
  const prefix = adminName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const loginId = `ADM-${prefix}${suffix}`;

  const plainPassword = `Admin@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generatePrincipalCredentials = (principalName) => {
  const prefix = principalName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const loginId = `PRL-${prefix}${suffix}`;

  const plainPassword = `Principal@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateTeacherCredentials = async (schoolName) => {
  const prefix = schoolName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, "X");

  let loginId;
  let exists = true;

  while (exists) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    loginId = `${prefix}${suffix}`;

    const user = await User.findOne({ loginId });
    if (!user) exists = false;
  }

  const plainPassword = `Tch@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateAccountantCredentials = async (accountantName) => {
  const prefix = accountantName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, "X");

  let loginId;
  let exists = true;

  while (exists) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    loginId = `ACC-${prefix}${suffix}`;
    const user = await User.findOne({ loginId });
    if (!user) exists = false;
  }

  const plainPassword = `Acc@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};

export const generateStaffCredentials = async (staffName, role = "STF") => {
  const rolePrefix = role.substring(0, 3).toUpperCase();
  const prefix = staffName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 5)
    .padEnd(3, "X");

  let loginId;
  let exists = true;

  while (exists) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    loginId = `${rolePrefix}-${prefix}${suffix}`;
    const user = await User.findOne({ loginId });
    if (!user) exists = false;
  }

  const plainPassword = `Stf@${Math.floor(100000 + Math.random() * 900000)}`;

  return { loginId, plainPassword };
};